import {
  ApiResponse,
  CourseBrowseParams,
  CoursePageResponse,
  CourseResponse,
  CourseSession,
  CourseSummary,
  CourseMaterial,
  CourseWeek,
  CreateCourseRequest,
  BatchStudentEnrollResponse,
  CourseMember,
  MemberPageResponse,
  MemberQueryParams,
  TaPermissions,
  idempotent,
  UpdateCourseRequest,
  V2ApiClient
} from '@/apis';

export class CourseApiService {
  private apiClient = V2ApiClient;
  
  constructor(apiClient?: typeof V2ApiClient) {
    if (apiClient) {
      this.apiClient = apiClient;
    }
  }
  
  /**
   * Browses courses across the tenant.
   *
   * Admin and instructor only — a plain Student or TA gets 403 ACCESS_DENIED.
   * For a user's own courses use `GET /v2/me/courses`
   * (`dashboardApiService.getMyCourses`), which every USER account can call.
   */
  async browseCourses(params?: CourseBrowseParams): Promise<ApiResponse<CoursePageResponse>> {
    try {
      return await this.apiClient.get<CoursePageResponse>("/v2/courses", {params});
    } catch (error) {
      console.error(`Failed to browse courses`, error);
      throw error;
    }
  }
  
  /** The course's recurring weekly schedule. Visible to any enrolled member. */
  async getCourseSessions(courseId: number): Promise<ApiResponse<CourseSession[]>> {
    try {
      return await this.apiClient.get<CourseSession[]>(`/v2/courses/${courseId}/sessions`);
    } catch (error) {
      console.error(`Failed to get sessions for courseId: ${courseId}`, error);
      throw error;
    }
  }

  /**
   * Archives a course. Course Manager only, and idempotent when it is already
   * archived.
   *
   * This is what retires a course — deletion is not. A course with any
   * dependency refuses to delete, and PRD INV-05 requires submissions,
   * attempts and grades to survive every V1 action, so archiving is the whole
   * lifecycle rather than a softer alternative to removal.
   */
  async archiveCourse(courseId: number): Promise<ApiResponse<CourseSummary>> {
    try {
      return await this.apiClient.post<CourseSummary>(
        `/v2/courses/${courseId}/archive`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to archive course: ${courseId}`, error);
      throw error;
    }
  }

  async unarchiveCourse(courseId: number): Promise<ApiResponse<CourseSummary>> {
    try {
      return await this.apiClient.post<CourseSummary>(
        `/v2/courses/${courseId}/unarchive`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to unarchive course: ${courseId}`, error);
      throw error;
    }
  }

  /**
   * A single course.
   *
   * Not `/detail`: that path does not exist and the server answers it with a
   * 500. There is no aggregate endpoint either — a course's weeks, materials,
   * assignments and members are each fetched separately.
   *
   * A course the caller cannot see returns 404 COURSE_NOT_FOUND rather than a
   * permission error, so membership cannot be probed by watching status codes.
   */
  async getCourse(courseId: number): Promise<ApiResponse<CourseResponse>> {
    try {
      return await this.apiClient.get<CourseResponse>(`/v2/courses/${courseId}`);
    } catch (error) {
      console.error(`Failed to get course: ${courseId}`, error);
      throw error;
    }
  }

  /**
   * The course outline. Materials come embedded in each week.
   * Students receive only Published weeks; staff see drafts too.
   */
  async getCourseWeeks(courseId: number): Promise<ApiResponse<CourseWeek[]>> {
    try {
      return await this.apiClient.get<CourseWeek[]>(`/v2/courses/${courseId}/weeks`);
    } catch (error) {
      console.error(`Failed to get weeks for courseId: ${courseId}`, error);
      throw error;
    }
  }
  
  /**
   * Creates a course, which starts Active with the caller as primary
   * instructor unless one is named.
   *
   * Not `/v2/courses/new` — that path never existed on this backend.
   */
  async createCourse(request: CreateCourseRequest): Promise<ApiResponse<CourseResponse>> {
    try {
      return await this.apiClient.post<CourseResponse>('/v2/courses', request, idempotent());
    } catch (error) {
      console.error('Failed to create course', error);
      throw error;
    }
  }

  /**
   * Edits a course. Course Manager only.
   *
   * PATCH, not PUT, and partial — send only what changed. Tenant and primary
   * instructor are rejected here; reassigning the instructor is an admin-only
   * call of its own. Editing an archived course fails with COURSE_ARCHIVED.
   */
  async updateCourse(
    courseId: number,
    request: UpdateCourseRequest
  ): Promise<ApiResponse<CourseResponse>> {
    try {
      return await this.apiClient.patch<CourseResponse>(
        `/v2/courses/${courseId}`,
        request,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to update course: ${courseId}`, error);
      throw error;
    }
  }

  /**
   * Deletes a course outright.
   *
   * Only succeeds on a course with no dependencies and a single instructor
   * enrolment; anything else returns 409 and must be archived instead. Prefer
   * archiveCourse — INV-05 requires submissions, attempts and grades to
   * survive every V1 action.
   */
  async deleteCourse(courseId: number): Promise<ApiResponse<void>> {
    try {
      return await this.apiClient.delete<void>(`/v2/courses/${courseId}`);
    } catch (error) {
      console.error(`Failed to delete course: ${courseId}`, error);
      throw error;
    }
  }

  // -------------------------------------------------------------- members
  //
  // Course Manager only — Primary Instructor, tenant admin or system admin.
  // A TA is never a Course Manager, whatever permission flags it holds, so
  // none of these are available to one.

  /** The enrolment list. GET-only: membership is changed through the
   *  student and TA routes below. */
  async getCourseMembers(
    courseId: number,
    params?: MemberQueryParams
  ): Promise<ApiResponse<MemberPageResponse>> {
    try {
      return await this.apiClient.get<MemberPageResponse>(
        `/v2/courses/${courseId}/members`,
        {params}
      );
    } catch (error) {
      console.error(`Failed to get members for courseId: ${courseId}`, error);
      throw error;
    }
  }

  /**
   * Enrols students by email or user id, up to 100 per call.
   *
   * Partial success is normal: the response reports each identifier
   * separately, so callers must read `items` rather than treating a 200 as
   * "all enrolled".
   */
  async enrolStudents(
    courseId: number,
    identifiers: {userIds?: number[]; emails?: string[]}
  ): Promise<ApiResponse<BatchStudentEnrollResponse>> {
    try {
      return await this.apiClient.post<BatchStudentEnrollResponse>(
        `/v2/courses/${courseId}/students/batch`,
        identifiers,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to enrol students in courseId: ${courseId}`, error);
      throw error;
    }
  }

  /**
   * Withdraws a student — a soft withdrawal that sets `active` false.
   *
   * Their submissions and grades are untouched; INV-05 requires that. Naturally
   * idempotent, so no Idempotency-Key.
   */
  async withdrawStudent(courseId: number, userId: number): Promise<ApiResponse<CourseMember>> {
    try {
      return await this.apiClient.delete<CourseMember>(
        `/v2/courses/${courseId}/students/${userId}`
      );
    } catch (error) {
      console.error(`Failed to withdraw student ${userId} from course ${courseId}`, error);
      throw error;
    }
  }

  /**
   * Promotes an active student to TA in place.
   *
   * The target must be an active Student on this course whose platform level
   * is STUDENT; an INSTRUCTOR is rejected with LEVEL_ENROLLMENT_MISMATCH. The
   * promotion freezes their own assignment submissions and ends their group
   * membership, and it grants no permissions — those are set separately.
   */
  async promoteToTa(courseId: number, userId: number): Promise<ApiResponse<CourseMember>> {
    try {
      return await this.apiClient.post<CourseMember>(
        `/v2/courses/${courseId}/tas`,
        {userId},
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to promote user ${userId} to TA in course ${courseId}`, error);
      throw error;
    }
  }

  /**
   * Demotes a TA back to an active Student.
   *
   * Not a removal from the course. Their submit freeze deliberately stays on,
   * so a former TA does not silently regain the ability to submit work they
   * may have seen the answers to.
   */
  async demoteTa(courseId: number, userId: number): Promise<ApiResponse<CourseMember>> {
    try {
      return await this.apiClient.delete<CourseMember>(`/v2/courses/${courseId}/tas/${userId}`);
    } catch (error) {
      console.error(`Failed to demote TA ${userId} in course ${courseId}`, error);
      throw error;
    }
  }

  /** Grants or revokes TA permissions. Partial — send only what changed. */
  async updateTaPermissions(
    courseId: number,
    userId: number,
    permissions: TaPermissions
  ): Promise<ApiResponse<CourseMember>> {
    try {
      return await this.apiClient.patch<CourseMember>(
        `/v2/courses/${courseId}/tas/${userId}/permissions`,
        permissions,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to update TA permissions for ${userId}`, error);
      throw error;
    }
  }

  // ---------------------------------------------------------------- weeks
  //
  // Weeks are the course outline. All writes are Course Manager only and fail
  // with COURSE_ARCHIVED once the course is archived. A new week starts as a
  // Draft and stays invisible to students until it is published.

  async createWeek(courseId: number, title: string): Promise<ApiResponse<CourseWeek>> {
    try {
      return await this.apiClient.post<CourseWeek>(
        `/v2/courses/${courseId}/weeks`,
        {title},
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to create week for courseId: ${courseId}`, error);
      throw error;
    }
  }

  async renameWeek(
    courseId: number,
    weekId: number,
    title: string
  ): Promise<ApiResponse<CourseWeek>> {
    try {
      return await this.apiClient.patch<CourseWeek>(
        `/v2/courses/${courseId}/weeks/${weekId}`,
        {title},
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to rename week: ${weekId}`, error);
      throw error;
    }
  }

  /** Only an empty week can be deleted; one holding materials is refused. */
  async deleteWeek(courseId: number, weekId: number): Promise<ApiResponse<void>> {
    try {
      return await this.apiClient.delete<void>(`/v2/courses/${courseId}/weeks/${weekId}`);
    } catch (error) {
      console.error(`Failed to delete week: ${weekId}`, error);
      throw error;
    }
  }

  /** Makes the week and its materials visible to students. */
  async publishWeek(courseId: number, weekId: number): Promise<ApiResponse<CourseWeek>> {
    try {
      return await this.apiClient.post<CourseWeek>(
        `/v2/courses/${courseId}/weeks/${weekId}/publish`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to publish week: ${weekId}`, error);
      throw error;
    }
  }

  async unpublishWeek(courseId: number, weekId: number): Promise<ApiResponse<CourseWeek>> {
    try {
      return await this.apiClient.post<CourseWeek>(
        `/v2/courses/${courseId}/weeks/${weekId}/unpublish`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to unpublish week: ${weekId}`, error);
      throw error;
    }
  }

  // ------------------------------------------------------------ materials

  /**
   * Uploads files into a week. Course Manager, or an active TA.
   *
   * Multipart, and the Idempotency-Key is enforced before anything reaches
   * storage — without it the request is refused outright with
   * IDEMPOTENCY_KEY_REQUIRED.
   *
   * Accepts PDF, Office documents, zip and common images; anything else comes
   * back as UNSUPPORTED_FILE_TYPE. Default size cap is 200 MB.
   */
  async uploadMaterials(
    courseId: number,
    weekId: number,
    files: File[]
  ): Promise<ApiResponse<CourseMaterial[]>> {
    try {
      const form = new FormData();
      files.forEach((file) => form.append('files', file));

      // Content-Type is left unset on purpose: the browser has to add the
      // multipart boundary, and naming the type here would drop it.
      return await this.apiClient.post<CourseMaterial[]>(
        `/v2/courses/${courseId}/weeks/${weekId}/materials`,
        form,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to upload materials to week ${weekId}`, error);
      throw error;
    }
  }

  async deleteMaterial(
    courseId: number,
    weekId: number,
    materialId: number
  ): Promise<ApiResponse<void>> {
    try {
      return await this.apiClient.delete<void>(
        `/v2/courses/${courseId}/weeks/${weekId}/materials/${materialId}`
      );
    } catch (error) {
      console.error(`Failed to delete material ${materialId}`, error);
      throw error;
    }
  }

  /**
   * Fetches a material as a Blob.
   *
   * Not a plain link. The endpoint needs the bearer token, which an anchor
   * cannot send — an unauthenticated request returns 401. The `downloadUrl` on
   * the material is no help either: it points at the bare host with no port,
   * so it does not even reach this deployment.
   *
   * The response is a binary stream rather than the usual JSON envelope.
   */
  async downloadMaterial(
    courseId: number,
    weekId: number,
    materialId: number
  ): Promise<Blob> {
    try {
      const response = await this.apiClient.getClient().get<Blob>(
        `/v2/courses/${courseId}/weeks/${weekId}/materials/${materialId}/download`,
        {responseType: 'blob'}
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to download material ${materialId}`, error);
      throw error;
    }
  }

  /** `weekIds` must be a full permutation of the course's weeks. */
  async reorderWeeks(courseId: number, weekIds: number[]): Promise<ApiResponse<CourseWeek[]>> {
    try {
      return await this.apiClient.put<CourseWeek[]>(
        `/v2/courses/${courseId}/weeks/reorder`,
        {weekIds},
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to reorder weeks for courseId: ${courseId}`, error);
      throw error;
    }
  }
}

export const courseApiService = new CourseApiService();