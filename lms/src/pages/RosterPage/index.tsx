import React, {useState} from "react";
import styles from "./index.module.scss";
import {useRoster} from "./useRoster";
import {MemberRow} from "./MemberRow";
import {EnrolStudentsPanel} from "./EnrolStudentsPanel";
import {CourseRole} from "@/apis";

const ROLE_FILTERS: (CourseRole | 'All')[] = ['All', 'Instructor', 'TA', 'Student'];

/**
 * Course roster.
 *
 * Replaces the previous screen, which called `/learn/selectByCourseId` and
 * `/grouping/*` on the retired backend and mixed the member list together with
 * group management. Groups are a separate module with their own endpoints and
 * are not handled here.
 *
 * Staff-facing throughout: the members endpoint is Course Manager only.
 */
const RosterPage: React.FC = () => {
  const {
    courseId, members, total, page, pageCount, setPage,
    filters, setFilters, isLoading, isError, isForbidden, refetch,
    withdraw, promote, demote, enrol,
  } = useRoster();

  const [search, setSearch] = useState('');

  if (courseId === null) {
    return <p className={styles.status}>Open a course to see its roster.</p>;
  }

  // A 403 means the caller is not a Course Manager. Saying so beats a retry
  // button that cannot succeed.
  if (isForbidden) {
    return (
      <p className={styles.status} role="alert">
        Only the course instructor can view the roster.
      </p>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Roster</h1>
        <span className={styles.count}>{total} {total === 1 ? 'member' : 'members'}</span>
      </header>

      <EnrolStudentsPanel
        onEnrol={(emails) => enrol.mutate(emails)}
        isPending={enrol.isPending}
        result={enrol.data?.data ?? null}
        failed={enrol.isError}
      />

      <div className={styles.toolbar}>
        <form
          className={styles.searchForm}
          onSubmit={(event) => {
            event.preventDefault();
            setFilters({...filters, q: search});
          }}
        >
          <input
            className={styles.search}
            placeholder="Search by name or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className={styles.searchButton}>Search</button>
        </form>

        <div className={styles.roleFilters}>
          {ROLE_FILTERS.map((role) => (
            <button
              type="button"
              key={role}
              className={`${styles.filterChip} ${filters.role === role ? styles.filterChipActive : ''}`}
              onClick={() => setFilters({...filters, role})}
            >
              {role}
            </button>
          ))}
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={filters.includeWithdrawn}
            onChange={(event) => setFilters({...filters, includeWithdrawn: event.target.checked})}
          />
          Show withdrawn
        </label>
      </div>

      {isLoading && <p className={styles.status}>Loading roster…</p>}

      {isError && !isForbidden && (
        <div className={styles.status} role="alert">
          <p>Couldn&apos;t load the roster.</p>
          <button type="button" className={styles.retry} onClick={refetch}>Try again</button>
        </div>
      )}

      {!isLoading && !isError && members.length === 0 && (
        <p className={styles.status}>No members match these filters.</p>
      )}

      {!isError && members.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Course role</th>
              <th>Status</th>
              <th aria-label="Actions"/>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onWithdraw={() => withdraw.mutate(member)}
                onPromote={() => promote.mutate(member)}
                onDemote={() => demote.mutate(member)}
                isBusy={withdraw.isPending || promote.isPending || demote.isPending}
              />
            ))}
          </tbody>
        </table>
      )}

      {pageCount > 1 && (
        <div className={styles.pagination}>
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>{page + 1} / {pageCount}</span>
          <button
            type="button"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default RosterPage;
