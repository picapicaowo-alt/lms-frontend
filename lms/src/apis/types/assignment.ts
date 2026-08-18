export interface FileResponse {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  entityId: number;
  entityType: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
}

export interface AssignmentSettings {
  allowLateSubmission: boolean;
  allowedResubmissionCount: number;
}

export interface AssignmentForEditResponse {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string;
  type: string;
  dueTime: Date;
  settings: AssignmentSettings;
  attachments: FileResponse[];
}

export interface EditAssignmentRequest {
  title?: string;
  description?: string;
  type?: string;
  dueTime?: Date;
  settings?: AssignmentSettings;
}

export interface SubmissionResponse {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  assignmentId: number;
  submissionCount: number;
  submissionContent: string;
  files: FileResponse[];
}

export interface AssignmentForSubmissionResponse {
  assignment: AssignmentForEditResponse;
  submission?: SubmissionResponse;
  review?: Review
}

export interface AssignmentSubmissionRequest {
  submissionContent?: string;
}

export interface Assignment {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  title: string;
  description: string;
  type: string;
  dueTime: Date;
  settings: AssignmentSettings;
}

export interface Submission {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  assignmentId: number;
  studentName: string;
  submissionCount: number;
  submissionContent: string;
}

export interface Review {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  submissionId: number;
  grade: number;
  teacherComment: string;
}

export interface AssignmentForReviewResponse {
  assignment: Assignment;
  submissions: Submission[];
  reviews: Review[];
  files: FileResponse[];
}

export interface CreateSubmissionReviewRequest {
  grade?: number;
  teacherComment?: string;
}

export interface UpdateSubmissionReviewRequest {
  grade?: number;
  teacherComment?: string;
}
/**
 * A list card for an assignment —
 * `GET /v2/courses/{courseId}/assignments/summaries`.
 *
 * Any course member can call it. Students receive Published assignments only
 * and see their own `submissionStatus`; staff see drafts too and get no
 * status, since there is no single caller status to report.
 *
 * Assignments belong to the course, not to a week: nothing here references
 * one, and the list is ordered by due date.
 */
export interface AssignmentSummary {
  id: number;
  title: string;
  /** UTC instant. */
  dueAtUtc: string;
  /** The same instant as tenant wall-clock time. Display only. */
  dueAtLocal: string;
  timezone: string;
  submissionType: 'Individual' | 'Group';
  /** Student callers only; omitted for staff. */
  submissionStatus?: 'NotSubmitted' | 'Submitted' | 'SubmittedLate' | 'NotSubmittedClosed';
}

/**
 * Body of `POST /v2/courses/{courseId}/assignments`.
 *
 * `dueAt` is wall-clock time in the course tenant's zone, not UTC — sending
 * "2026-09-30T23:59:00" produced dueAtUtc "2026-10-01T06:59:00Z" on a
 * Los Angeles tenant. That is what INV-06 asks for: deadlines are entered in
 * the institution's timezone and displayed in the reader's.
 *
 * Rules the server enforces, each confirmed against dev:
 *  - title, pointsPossible and dueAt are required
 *  - maxFileCount 1..10, maxFileSizeBytes 1..104857600
 *  - allowedFileTypes needs at least one entry; dots are stripped, values
 *    lower-cased and de-duplicated
 *  - lateUntil, when given, must not precede dueAt
 *  - submissionType "Group" requires an existing groupSetId
 */
export interface CreateAssignmentBody {
  title: string;
  description?: string;
  pointsPossible: number;
  /** `YYYY-MM-DDTHH:mm:ss`, tenant local. */
  dueAt: string;
  lateUntil?: string | null;
  allowedFileTypes: string[];
  maxFileSizeBytes: number;
  maxFileCount: number;
  submissionType?: 'Individual' | 'Group';
  groupSetId?: number | null;
}

export type AssignmentState = 'Draft' | 'Published';

/** An assignment as the create and detail endpoints return it. */
export interface AssignmentResponse {
  id: number;
  courseId: number;
  title: string;
  description: string;
  pointsPossible: number;
  dueAtUtc: string;
  dueAtLocal: string;
  timezone: string;
  submissionType: 'Individual' | 'Group';
  allowedFileTypes: string[];
  maxFileSizeBytes: number;
  maxFileCount: number;
  /** Always Draft on creation; students see it only once Published. */
  state: AssignmentState;
  hasRubric: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}
