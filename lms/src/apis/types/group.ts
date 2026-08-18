// Group module types — see docs/api/group_module-api_en.md
//
// A group set is a way of dividing one course; the groups live inside it.
// Students join themselves when the set allows it, and staff can place people
// directly. Everything is scoped to a course.

/**
 * Who created a membership. `Self` is a student joining on their own —
 * confirmed against dev, where a self-service join returns exactly that, not
 * "Student".
 */
export type MembershipActor = 'Staff' | 'Self' | 'System';

export interface GroupMembership {
  groupId: number;
  userId: number;
  displayName: string;
  joinedAt: string;
  /** Who put them there — a student joining, or staff assigning. */
  addedByType: MembershipActor;
  addedByUserId: number | null;
}

export interface Group {
  id: number;
  groupSetId: number;
  name: string;
  /** Effective capacity: the override if set, otherwise the set's default. */
  capacity: number | null;
  /** Per-group override of the set default. Null means it follows the set. */
  capacityOverride: number | null;
  memberCount: number;
  members: GroupMembership[];
}

/**
 * A group set — `GET /v2/courses/{courseId}/group-sets`.
 *
 * `myGroup` is the caller's own membership, which is how a student knows
 * whether they have joined. The `*Warning` fields are returned when an edit
 * would affect people already in groups; the write is then re-sent with the
 * matching confirm flag.
 */
export interface GroupSet {
  id: number;
  courseId: number;
  name: string;
  defaultCapacity: number | null;
  /** Self-service window. Null means no bound on that end. */
  joinOpensAtUtc: string | null;
  joinOpensAtLocal: string | null;
  joinClosesAtUtc: string | null;
  joinClosesAtLocal: string | null;
  timezone: string;
  /** Locked sets refuse student self-service entirely. */
  locked: boolean;
  /** False once locked or outside the join window. */
  openForSelfService: boolean;
  capacityShortenWarning: string | null;
  windowShortenWarning: string | null;
  myGroup: Group | null;
  groups: Group[];
}

export interface UngroupedStudent {
  userId: number;
  displayName: string;
}

export interface CreateGroupSetRequest {
  name: string;
  defaultCapacity?: number;
  joinOpensAtUtc?: string;
  joinClosesAtUtc?: string;
  locked?: boolean;
}

export interface UpdateGroupSetRequest extends Partial<CreateGroupSetRequest> {
  /** Re-send with this after a capacity warning to apply it anyway. */
  confirmCapacityOverfill?: boolean;
  /** Re-send with this after a warning that the change affects grading. */
  confirmAcademicImpact?: boolean;
  /** Re-send with this to shorten a join window that is already open. */
  confirmWindowShorten?: boolean;
}

/** Result of adding a member: the membership and the group it landed in. */
export interface GroupMemberChange {
  membership: GroupMembership;
  group: Group;
}

/**
 * Why a delete was refused.
 *
 * These are the point of the module: a group holding submitted work cannot be
 * dissolved, because INV-05 requires submissions and grades to survive every
 * V1 action. The UI has to explain which one applies rather than reporting a
 * generic failure.
 */
export type GroupDeletionBlock =
  | 'GROUP_HAS_SUBMISSIONS'
  | 'GROUP_NOT_EMPTY'
  | 'GROUP_SET_IN_USE'
  | 'GROUP_SET_NOT_EMPTY';
