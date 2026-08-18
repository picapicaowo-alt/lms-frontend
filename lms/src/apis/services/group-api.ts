// Group module service — see docs/api/group_module-api_en.md
//
// Everything hangs off /v2/courses/{courseId}/group-sets. Reads are open to
// any course member; writes are Course Manager only, except the three
// self-service calls a student makes for themselves.

import {
  ApiResponse,
  CreateGroupSetRequest,
  Group,
  GroupMemberChange,
  GroupSet,
  UngroupedStudent,
  UpdateGroupSetRequest,
  V2ApiClient,
  idempotent,
} from '@/apis';

export class GroupApiService {
  private apiClient = V2ApiClient;

  constructor(apiClient?: typeof V2ApiClient) {
    if (apiClient) {
      this.apiClient = apiClient;
    }
  }

  private base(courseId: number) {
    return `/v2/courses/${courseId}/group-sets`;
  }

  // ------------------------------------------------------------- group sets

  async listGroupSets(courseId: number): Promise<ApiResponse<GroupSet[]>> {
    try {
      return await this.apiClient.get<GroupSet[]>(this.base(courseId));
    } catch (error) {
      console.error(`Failed to list group sets for course ${courseId}`, error);
      throw error;
    }
  }

  async createGroupSet(
    courseId: number,
    request: CreateGroupSetRequest
  ): Promise<ApiResponse<GroupSet>> {
    try {
      return await this.apiClient.post<GroupSet>(this.base(courseId), request, idempotent());
    } catch (error) {
      console.error(`Failed to create a group set in course ${courseId}`, error);
      throw error;
    }
  }

  /**
   * Edits a set.
   *
   * Some edits affect people already grouped — shrinking capacity below what
   * a group holds, or closing a join window early. Those come back as a
   * warning rather than applying, and the caller re-sends with the matching
   * confirm flag. That is deliberate: it stops a single mis-typed number
   * silently pushing students out of their groups.
   */
  async updateGroupSet(
    courseId: number,
    groupSetId: number,
    request: UpdateGroupSetRequest
  ): Promise<ApiResponse<GroupSet>> {
    try {
      return await this.apiClient.patch<GroupSet>(
        `${this.base(courseId)}/${groupSetId}`,
        request,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to update group set ${groupSetId}`, error);
      throw error;
    }
  }

  /** Refused with GROUP_SET_IN_USE or GROUP_SET_NOT_EMPTY when it still matters. */
  async deleteGroupSet(courseId: number, groupSetId: number): Promise<ApiResponse<void>> {
    try {
      return await this.apiClient.delete<void>(`${this.base(courseId)}/${groupSetId}`);
    } catch (error) {
      console.error(`Failed to delete group set ${groupSetId}`, error);
      throw error;
    }
  }

  // ----------------------------------------------------------------- groups

  async createGroup(
    courseId: number,
    groupSetId: number,
    name: string,
    capacityOverride?: number
  ): Promise<ApiResponse<Group>> {
    try {
      return await this.apiClient.post<Group>(
        `${this.base(courseId)}/${groupSetId}/groups`,
        {name, capacityOverride},
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to create a group in set ${groupSetId}`, error);
      throw error;
    }
  }

  /** Refused with GROUP_HAS_SUBMISSIONS or GROUP_NOT_EMPTY. */
  async deleteGroup(
    courseId: number,
    groupSetId: number,
    groupId: number
  ): Promise<ApiResponse<void>> {
    try {
      return await this.apiClient.delete<void>(
        `${this.base(courseId)}/${groupSetId}/groups/${groupId}`
      );
    } catch (error) {
      console.error(`Failed to delete group ${groupId}`, error);
      throw error;
    }
  }

  // ---------------------------------------------------------- staff placing

  /** Course members with no group in this set. */
  async listUngroupedStudents(
    courseId: number,
    groupSetId: number
  ): Promise<ApiResponse<UngroupedStudent[]>> {
    try {
      return await this.apiClient.get<UngroupedStudent[]>(
        `${this.base(courseId)}/${groupSetId}/ungrouped-students`
      );
    } catch (error) {
      console.error(`Failed to list ungrouped students in set ${groupSetId}`, error);
      throw error;
    }
  }

  async addMember(
    courseId: number,
    groupSetId: number,
    groupId: number,
    userId: number
  ): Promise<ApiResponse<GroupMemberChange>> {
    try {
      return await this.apiClient.post<GroupMemberChange>(
        `${this.base(courseId)}/${groupSetId}/groups/${groupId}/members`,
        {userId},
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to add user ${userId} to group ${groupId}`, error);
      throw error;
    }
  }

  async removeMember(
    courseId: number,
    groupSetId: number,
    groupId: number,
    userId: number
  ): Promise<ApiResponse<Group>> {
    try {
      return await this.apiClient.delete<Group>(
        `${this.base(courseId)}/${groupSetId}/groups/${groupId}/members/${userId}`
      );
    } catch (error) {
      console.error(`Failed to remove user ${userId} from group ${groupId}`, error);
      throw error;
    }
  }

  /** Moves someone between groups in one call, rather than remove then add. */
  async moveMember(
    courseId: number,
    groupSetId: number,
    userId: number,
    targetGroupId: number
  ): Promise<ApiResponse<GroupMemberChange>> {
    try {
      return await this.apiClient.post<GroupMemberChange>(
        `${this.base(courseId)}/${groupSetId}/members/${userId}/move`,
        {targetGroupId},
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to move user ${userId}`, error);
      throw error;
    }
  }

  /** Spreads everyone still ungrouped across the existing groups. */
  async distributeRandomly(
    courseId: number,
    groupSetId: number
  ): Promise<ApiResponse<GroupSet>> {
    try {
      return await this.apiClient.post<GroupSet>(
        `${this.base(courseId)}/${groupSetId}/distribute-random`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to distribute students in set ${groupSetId}`, error);
      throw error;
    }
  }

  // ------------------------------------------------------- student actions

  async joinGroup(
    courseId: number,
    groupSetId: number,
    groupId: number
  ): Promise<ApiResponse<GroupMemberChange>> {
    try {
      return await this.apiClient.post<GroupMemberChange>(
        `${this.base(courseId)}/${groupSetId}/groups/${groupId}/join`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to join group ${groupId}`, error);
      throw error;
    }
  }

  async leaveGroup(
    courseId: number,
    groupSetId: number,
    groupId: number
  ): Promise<ApiResponse<void>> {
    try {
      return await this.apiClient.post<void>(
        `${this.base(courseId)}/${groupSetId}/groups/${groupId}/leave`,
        undefined,
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to leave group ${groupId}`, error);
      throw error;
    }
  }

  /** One call, so the student is never briefly in no group at all. */
  async switchGroup(
    courseId: number,
    groupSetId: number,
    targetGroupId: number
  ): Promise<ApiResponse<GroupMemberChange>> {
    try {
      return await this.apiClient.post<GroupMemberChange>(
        `${this.base(courseId)}/${groupSetId}/switch`,
        {targetGroupId},
        idempotent()
      );
    } catch (error) {
      console.error(`Failed to switch to group ${targetGroupId}`, error);
      throw error;
    }
  }
}

export const groupApiService = new GroupApiService();
