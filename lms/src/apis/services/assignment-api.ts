import {
  ApiResponse,
  AssignmentForEditResponse,
  AssignmentForReviewResponse,
  AssignmentForSubmissionResponse,
  AssignmentResponse,
  AssignmentSubmissionRequest,
  AssignmentSummary,
  CreateAssignmentBody,
  idempotent,
  CreateSubmissionReviewRequest,
  EditAssignmentRequest,
  UpdateSubmissionReviewRequest,
  V2ApiClient
} from "@/apis";

export class AssignmentApiService {
  private apiClient = V2ApiClient;
  
  constructor(apiClient?: typeof V2ApiClient) {
    if (apiClient) {
      this.apiClient = apiClient;
    }
  }
  
  /**
   * Assignment list cards for a course, ordered by due date.
   *
   * The slim endpoint rather than `/assignments`, which returns every field
   * including descriptions and attachments — far more than a list needs.
   */
  async getCourseAssignmentSummaries(courseId: number): Promise<ApiResponse<AssignmentSummary[]>> {
    try {
      return await this.apiClient.get<AssignmentSummary[]>(
        `/v2/courses/${courseId}/assignments/summaries`
      );
    } catch (error) {
      console.error(`Failed to get assignment summaries for courseId: ${courseId}`, error);
      throw error;
    }
  }

  /**
   * Creates an assignment. Instructor only, and always as a Draft — students
   * see nothing until it is published.
   */
  async createAssignment(
    courseId: number,
    body: CreateAssignmentBody
  ): Promise<ApiResponse<AssignmentResponse>> {
    try {
      return await this.apiClient.post<AssignmentResponse>(
        `/v2/courses/${courseId}/assignments`,
        body,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to create an assignment in course ${courseId}`, error);
      throw error;
    }
  }

  /** Makes it visible and submittable. Idempotent; notifies active students. */
  async publishAssignment(
    courseId: number,
    assignmentId: number
  ): Promise<ApiResponse<AssignmentResponse>> {
    try {
      return await this.apiClient.post<AssignmentResponse>(
        `/v2/courses/${courseId}/assignments/${assignmentId}/publish`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to publish assignment ${assignmentId}`, error);
      throw error;
    }
  }

  /** Refused with ASSIGNMENT_HAS_SUBMISSIONS once anyone has submitted. */
  async unpublishAssignment(
    courseId: number,
    assignmentId: number
  ): Promise<ApiResponse<AssignmentResponse>> {
    try {
      return await this.apiClient.post<AssignmentResponse>(
        `/v2/courses/${courseId}/assignments/${assignmentId}/unpublish`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to unpublish assignment ${assignmentId}`, error);
      throw error;
    }
  }

  async deleteAssignment(
    courseId: number,
    assignmentId: number
  ): Promise<ApiResponse<void>> {
    try {
      return await this.apiClient.delete<void>(
        `/v2/courses/${courseId}/assignments/${assignmentId}`
      );
    } catch (error) {
      console.error(`Failed to delete assignment ${assignmentId}`, error);
      throw error;
    }
  }

  async getAssignmentForEdit(assignmentId: number): Promise<ApiResponse<AssignmentForEditResponse>> {
    return this.apiClient.get<AssignmentForEditResponse>(`/v2/assignments/${assignmentId}/edit`);
  }
  
  async editAssignment(
    assignmentId: number,
    request: EditAssignmentRequest
  ): Promise<ApiResponse<boolean>> {
    return this.apiClient.post<boolean>(`/v2/assignments/${assignmentId}/edit`, request);
  }
  
  async uploadAssignmentAttachment(
    assignmentId: number,
    file: File,
    fieldName = 'attachment'
  ): Promise<ApiResponse<number>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    return this.apiClient.post<number>(
      `/v2/assignments/${assignmentId}/edit/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  }
  
  async deleteAssignmentAttachment(
    assignmentId: number,
    attachmentId: number
  ): Promise<ApiResponse<boolean>> {
    return this.apiClient.post<boolean>(
      `/v2/assignments/${assignmentId}/edit/attachments/${attachmentId}/delete`
    );
  }
  
  async getAssignmentForSubmission(
    assignmentId: number
  ): Promise<ApiResponse<AssignmentForSubmissionResponse>> {
    return this.apiClient.get<AssignmentForSubmissionResponse>(
      `/v2/assignments/${assignmentId}/submission`
    );
  }
  
  async submitAssignment(
    assignmentId: number,
    request: AssignmentSubmissionRequest
  ): Promise<ApiResponse<boolean>> {
    return this.apiClient.post<boolean>(
      `/v2/assignments/${assignmentId}/submission`,
      request
    );
  }
  
  async resubmitAssignment(
    assignmentId: number,
    submissionId: number,
    request: AssignmentSubmissionRequest
  ): Promise<ApiResponse<boolean>> {
    return this.apiClient.post<boolean>(
      `/v2/assignments/${assignmentId}/submissions/${submissionId}`,
      request
    );
  }
  
  async uploadAssignmentSubmissionFile(
    assignmentId: number,
    submissionId: number,
    file: File,
    fieldName = 'file'
  ): Promise<ApiResponse<number>> {
    const formData = new FormData();
    formData.append(fieldName, file);
    
    return this.apiClient.post<number>(
      `/v2/assignments/${assignmentId}/submissions/${submissionId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
  }
  
  async deleteAssignmentSubmissionFile(
    assignmentId: number,
    submissionId: number,
    fileId: number
  ): Promise<ApiResponse<boolean>> {
    return this.apiClient.post<boolean>(
      `/v2/assignments/${assignmentId}/submissions/${submissionId}/files/${fileId}/delete`
    );
  }
  
  async getAssignmentForReview(
    assignmentId: number
  ): Promise<ApiResponse<AssignmentForReviewResponse>> {
    return this.apiClient.get<AssignmentForReviewResponse>(
      `/v2/assignments/${assignmentId}/review`
    );
  }
  
  async createSubmissionReview(
    assignmentId: number,
    submissionId: number,
    request: CreateSubmissionReviewRequest
  ): Promise<ApiResponse<number>> {
    return this.apiClient.post<number>(
      `/v2/assignments/${assignmentId}/submissions/${submissionId}/review`,
      request
    );
  }
  
  async updateSubmissionReview(
    assignmentId: number,
    submissionId: number,
    request: Record<number, UpdateSubmissionReviewRequest>
  ): Promise<ApiResponse<boolean>> {
    return this.apiClient.post<boolean>(
      `/v2/assignments/${assignmentId}/submission/${submissionId}/reviews/updates`,
      request
    );
  }
}

export const assignmentApiService = new AssignmentApiService();