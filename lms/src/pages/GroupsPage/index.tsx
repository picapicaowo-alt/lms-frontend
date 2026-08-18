import React, {useEffect, useState} from "react";
import styles from "./index.module.scss";
import {useGroups, refusalMessage, isDeletionBlocked} from "./useGroups";
import {GroupSetPanel} from "./GroupSetPanel";
import {useRequiredAuth} from "@/contexts/RequiredAuthContext";

/**
 * Course groups.
 *
 * Replaces the screen that called /grouping/* on the retired backend. Group
 * sets, groups and membership all come from /v2/courses/{id}/group-sets now.
 *
 * One page serves both roles. Staff get the set and group management and can
 * place people; a student sees the same sets and joins or leaves for
 * themselves. The API draws that line anyway — the staff endpoints answer 403
 * — so the UI follows it rather than inventing a second screen.
 */
const GroupsPage: React.FC = () => {
  const {user} = useRequiredAuth();
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [newSetName, setNewSetName] = useState('');

  // Course role decides this, not the platform level: someone can teach one
  // course and attend another (ROLE-03). The set payload does not name the
  // instructor, so this uses the platform level as a first gate and lets the
  // API refuse anything it should not allow.
  const canManage = user.level === 'INSTRUCTOR';

  const groups = useGroups({canManage, selectedSetId});

  useEffect(() => {
    if (selectedSetId === null && groups.sets.length > 0) {
      setSelectedSetId(groups.sets[0].id);
    }
  }, [groups.sets, selectedSetId]);

  if (groups.courseId === null) {
    return <p className={styles.status}>Open a course to see its groups.</p>;
  }

  if (groups.isForbidden) {
    return (
      <p className={styles.status} role="alert">
        You don&apos;t have access to this course&apos;s groups.
      </p>
    );
  }

  const selected = groups.sets.find((set) => set.id === selectedSetId) ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Groups</h1>
      </header>

      {groups.isLoading && <p className={styles.status}>Loading groups…</p>}

      {groups.isError && !groups.isForbidden && (
        <div className={styles.status} role="alert">
          <p>Couldn&apos;t load groups.</p>
          <button type="button" className={styles.primary} onClick={groups.refetch}>
            Try again
          </button>
        </div>
      )}

      {!groups.isLoading && !groups.isError && (
        <>
          <div className={styles.setBar}>
            {groups.sets.map((set) => (
              <button
                type="button"
                key={set.id}
                className={`${styles.setChip} ${set.id === selectedSetId ? styles.setChipActive : ''}`}
                onClick={() => setSelectedSetId(set.id)}
              >
                {set.name}
              </button>
            ))}

            {canManage && (
              <form
                className={styles.newSet}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (newSetName.trim()) {
                    groups.createSet.mutate(newSetName.trim());
                    setNewSetName('');
                  }
                }}
              >
                <input
                  className={styles.newSetInput}
                  placeholder="New group set"
                  value={newSetName}
                  onChange={(event) => setNewSetName(event.target.value)}
                />
                <button
                  type="submit"
                  className={styles.primary}
                  disabled={!newSetName.trim() || groups.createSet.isPending}
                >
                  Add
                </button>
              </form>
            )}
          </div>

          {groups.createSet.isError && (
            <p className={styles.error} role="alert">
              {refusalMessage(groups.createSet.error, "Couldn't create the group set.")}
            </p>
          )}

          {groups.sets.length === 0 ? (
            <p className={styles.status}>
              {canManage
                ? 'No group sets yet. Create one to start grouping students.'
                : 'This course has no groups yet.'}
            </p>
          ) : selected && (
            <GroupSetPanel
              set={selected}
              canManage={canManage}
              ungrouped={groups.ungrouped}
              groups={groups}
            />
          )}

          {/* Deletion refusals are the point of this module: a group holding
              submitted work cannot be dissolved. The server says which rule
              applied, so it is repeated verbatim. */}
          {groups.deleteGroup.isError && (
            <p className={styles.error} role="alert">
              {isDeletionBlocked(groups.deleteGroup.error)
                ? refusalMessage(groups.deleteGroup.error, 'This group cannot be deleted.')
                : "Couldn't delete the group."}
            </p>
          )}
          {groups.deleteSet.isError && (
            <p className={styles.error} role="alert">
              {isDeletionBlocked(groups.deleteSet.error)
                ? refusalMessage(groups.deleteSet.error, 'This group set cannot be deleted.')
                : "Couldn't delete the group set."}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default GroupsPage;
