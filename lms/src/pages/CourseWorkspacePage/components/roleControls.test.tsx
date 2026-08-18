import {beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

vi.mock('@/components/LanguageSwitcher', () => ({default: () => null}));
// The modal pulls in the group service; the header/card gating is the subject.
vi.mock('./CreateAssignmentModal', () => ({CreateAssignmentModal: () => null}));

import {PageHeader} from './PageHeader';
import {AssignmentsCard} from './CourseDetailView/AssignmentsCard';
import {useCourseWorkspaceStore} from '../stores/useCourseWorkspaceStore';

const wrap = (ui: React.ReactNode) => {
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

/**
 * The V1 status review reported "Student can see Instructor controls" on the
 * course workspace. The cause was a workspace role hard-coded to "teacher"
 * that nothing ever set.
 *
 * These assert the gating itself, at render time. Hiding a control is not
 * authorisation — the server checks every write and must keep doing so
 * (BND-03) — but a student must not be offered actions that will be refused.
 */
describe('course workspace role gating', () => {
  beforeEach(() => {
    useCourseWorkspaceStore.setState({workspaceMode: 'view', role: 'student'});
  });

  /**
   * The store's own initial value, not one this test set — that is the thing
   * that was wrong. It read "teacher", and because setRole was never called
   * anywhere, every user kept it.
   */
  it('starts as student, so a missed role lookup under-grants', () => {
    expect(useCourseWorkspaceStore.getInitialState().role).toBe('student');
  });

  it('hides Edit course from a student', () => {
    wrap(<PageHeader/>);
    expect(screen.queryByText('detail.editCourse')).not.toBeInTheDocument();
  });

  it('shows Edit course to the course instructor', () => {
    useCourseWorkspaceStore.setState({role: 'teacher'});
    wrap(<PageHeader/>);
    expect(screen.getByText('detail.editCourse')).toBeInTheDocument();
  });

  it('never offers a course-level Publish, which has no endpoint', () => {
    useCourseWorkspaceStore.setState({role: 'teacher'});
    wrap(<PageHeader/>);
    expect(screen.queryByText('addContent.publishButton')).not.toBeInTheDocument();
  });

  it('hides Add new assignment from a student', () => {
    wrap(<AssignmentsCard courseId={23} assignments={[]} failed={false} canManage={false}/>);
    expect(screen.queryByText('Add new')).not.toBeInTheDocument();
  });

  it('shows Add new assignment to the course instructor', () => {
    wrap(<AssignmentsCard courseId={23} assignments={[]} failed={false} canManage/>);
    expect(screen.getByText('Add new')).toBeInTheDocument();
  });
});
