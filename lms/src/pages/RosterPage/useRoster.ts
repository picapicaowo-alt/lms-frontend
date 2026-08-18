import {useState} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';
import {CourseMember, CourseRole, MemberPageResponse, unwrapData} from '@/apis';
import {courseApiService} from '@/apis/services/course-api';

export const ROSTER_PAGE_SIZE = 20;

export type RoleFilter = CourseRole | 'All';

export interface RosterFilters {
  q: string;
  role: RoleFilter;
  /** Withdrawn members are hidden by default; they are soft-deleted, not gone. */
  includeWithdrawn: boolean;
}

/**
 * The course roster.
 *
 * `/members` is Course Manager only, so a Student or TA gets 403 here. That is
 * reported as `isForbidden` rather than a generic failure: "you cannot see
 * this" and "this did not load" call for different screens, and retrying a 403
 * will never help.
 */
export const useRoster = () => {
  const {courseId} = useParams();
  const queryClient = useQueryClient();

  const parsed = courseId ? parseInt(courseId, 10) : NaN;
  const id = Number.isNaN(parsed) ? null : parsed;

  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<RosterFilters>({
    q: '',
    role: 'All',
    includeWithdrawn: false,
  });

  const query = useQuery({
    queryKey: ['course-members', id, page, filters],
    queryFn: async (): Promise<MemberPageResponse> => unwrapData(
      await courseApiService.getCourseMembers(id!, {
        page,
        size: ROSTER_PAGE_SIZE,
        q: filters.q.trim() || undefined,
        courseRole: filters.role === 'All' ? undefined : filters.role,
        // Omitted rather than sent as true — the server's default already
        // includes both, and asking for active=true would hide withdrawals.
        active: filters.includeWithdrawn ? undefined : true,
      }),
      'getCourseMembers'
    ),
    enabled: id !== null,
    staleTime: 30 * 1000,
    // A 403 is a permanent answer. Retrying it just delays the message.
    retry: (failureCount, error) =>
      (error as {code?: number})?.code === 403 ? false : failureCount < 1,
  });

  const refresh = () => queryClient.invalidateQueries({queryKey: ['course-members', id]});

  const run = <TArgs>(fn: (args: TArgs) => Promise<unknown>) => ({
    mutationFn: fn,
    onSuccess: () => void refresh(),
  });

  const withdraw = useMutation(run<CourseMember>(
    (member) => courseApiService.withdrawStudent(id!, member.userId)
  ));
  const promote = useMutation(run<CourseMember>(
    (member) => courseApiService.promoteToTa(id!, member.userId)
  ));
  const demote = useMutation(run<CourseMember>(
    (member) => courseApiService.demoteTa(id!, member.userId)
  ));

  const enrol = useMutation({
    mutationFn: (emails: string[]) => courseApiService.enrolStudents(id!, {emails}),
    onSuccess: () => void refresh(),
  });

  const total = query.data?.total ?? 0;

  return {
    courseId: id,
    members: query.data?.items ?? [],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ROSTER_PAGE_SIZE)),
    setPage,
    filters,
    setFilters: (next: RosterFilters) => {
      setFilters(next);
      // Any filter change invalidates the current offset.
      setPage(0);
    },
    isLoading: id !== null && query.isPending,
    isError: query.isError,
    isForbidden: (query.error as {code?: number} | null)?.code === 403,
    refetch: () => void query.refetch(),
    withdraw,
    promote,
    demote,
    enrol,
  };
};
