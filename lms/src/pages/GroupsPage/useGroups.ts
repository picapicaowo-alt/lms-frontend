import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';
import {ApiError, GroupSet, UngroupedStudent, unwrapData} from '@/apis';
import {groupApiService} from '@/apis/services/group-api';

/** Pulls the server's own explanation out of a rejected write. */
export const refusalMessage = (error: unknown, fallback: string): string => {
  const details = (error as ApiError)?.details as {code?: string; message?: string} | undefined;
  return details?.message ?? fallback;
};

/** Refusal codes the group module returns when a delete would lose work. */
export const isDeletionBlocked = (error: unknown): boolean => {
  const code = ((error as ApiError)?.details as {code?: string} | undefined)?.code;
  return code === 'GROUP_HAS_SUBMISSIONS'
    || code === 'GROUP_NOT_EMPTY'
    || code === 'GROUP_SET_IN_USE'
    || code === 'GROUP_SET_NOT_EMPTY';
};

/**
 * Group sets for a course, and the writes that act on them.
 *
 * Reads are open to any course member; the staff writes are Course Manager
 * only. Ungrouped students are fetched only for the selected set, and only
 * when the caller can actually place people — a student gets 403 for that
 * endpoint.
 */
export const useGroups = (options: {canManage: boolean; selectedSetId: number | null}) => {
  const {courseId} = useParams();
  const queryClient = useQueryClient();

  const parsed = courseId ? parseInt(courseId, 10) : NaN;
  const id = Number.isNaN(parsed) ? null : parsed;
  const {canManage, selectedSetId} = options;

  const sets = useQuery({
    queryKey: ['group-sets', id],
    queryFn: async (): Promise<GroupSet[]> =>
      unwrapData(await groupApiService.listGroupSets(id!), 'listGroupSets'),
    enabled: id !== null,
    staleTime: 30 * 1000,
    retry: (count, error) => (error as unknown as ApiError)?.code === 403 ? false : count < 1,
  });

  const ungrouped = useQuery({
    queryKey: ['ungrouped-students', id, selectedSetId],
    queryFn: async (): Promise<UngroupedStudent[]> =>
      unwrapData(
        await groupApiService.listUngroupedStudents(id!, selectedSetId!),
        'listUngroupedStudents'
      ),
    enabled: id !== null && selectedSetId !== null && canManage,
    staleTime: 30 * 1000,
    retry: false,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({queryKey: ['group-sets', id]});
    void queryClient.invalidateQueries({queryKey: ['ungrouped-students', id]});
  };

  const mutation = <TArgs>(fn: (args: TArgs) => Promise<unknown>) =>
    ({mutationFn: fn, onSuccess: refresh});

  return {
    courseId: id,
    sets: sets.data ?? [],
    ungrouped: ungrouped.data ?? [],
    isLoading: id !== null && sets.isPending,
    isError: sets.isError,
    isForbidden: (sets.error as unknown as ApiError | null)?.code === 403,
    refetch: () => void sets.refetch(),
    refresh,

    createSet: useMutation(mutation<string>(
      (name) => groupApiService.createGroupSet(id!, {name})
    )),
    deleteSet: useMutation(mutation<number>(
      (setId) => groupApiService.deleteGroupSet(id!, setId)
    )),
    createGroup: useMutation(mutation<{setId: number; name: string}>(
      ({setId, name}) => groupApiService.createGroup(id!, setId, name)
    )),
    deleteGroup: useMutation(mutation<{setId: number; groupId: number}>(
      ({setId, groupId}) => groupApiService.deleteGroup(id!, setId, groupId)
    )),
    addMember: useMutation(mutation<{setId: number; groupId: number; userId: number}>(
      ({setId, groupId, userId}) => groupApiService.addMember(id!, setId, groupId, userId)
    )),
    removeMember: useMutation(mutation<{setId: number; groupId: number; userId: number}>(
      ({setId, groupId, userId}) => groupApiService.removeMember(id!, setId, groupId, userId)
    )),
    distribute: useMutation(mutation<number>(
      (setId) => groupApiService.distributeRandomly(id!, setId)
    )),
    joinGroup: useMutation(mutation<{setId: number; groupId: number}>(
      ({setId, groupId}) => groupApiService.joinGroup(id!, setId, groupId)
    )),
    leaveGroup: useMutation(mutation<{setId: number; groupId: number}>(
      ({setId, groupId}) => groupApiService.leaveGroup(id!, setId, groupId)
    )),
    switchGroup: useMutation(mutation<{setId: number; groupId: number}>(
      ({setId, groupId}) => groupApiService.switchGroup(id!, setId, groupId)
    )),
  };
};
