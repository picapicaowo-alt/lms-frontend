import React, {useState} from "react";
import styles from "./index.module.scss";
import {Group, GroupSet, UngroupedStudent} from "@/apis";
import {useGroups} from "./useGroups";

interface GroupSetPanelProps {
  set: GroupSet;
  canManage: boolean;
  ungrouped: UngroupedStudent[];
  groups: ReturnType<typeof useGroups>;
}

const isFull = (group: Group) =>
  group.capacity !== null && group.memberCount >= group.capacity;

/**
 * One group set: its groups, who is in them, and the actions each role has.
 *
 * A student sees a Join button on groups that still have room, and Leave on
 * their own. Switching is one call rather than leave-then-join, so they are
 * never briefly in no group — which matters because group membership decides
 * who a submission belongs to.
 */
export const GroupSetPanel: React.FC<GroupSetPanelProps> = ({
                                                              set,
                                                              canManage,
                                                              ungrouped,
                                                              groups,
                                                            }) => {
  const [newGroupName, setNewGroupName] = useState('');
  const [placing, setPlacing] = useState<number | null>(null);

  const myGroupId = set.myGroup?.id ?? null;
  const busy = groups.joinGroup.isPending
    || groups.leaveGroup.isPending
    || groups.switchGroup.isPending;

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.setName}>{set.name}</h2>
          <p className={styles.setMeta}>
            {set.defaultCapacity !== null && `Up to ${set.defaultCapacity} per group`}
            {set.locked && <span className={styles.lockTag}>Locked</span>}
            {!set.locked && !set.openForSelfService && (
              <span className={styles.lockTag}>Self-service closed</span>
            )}
          </p>
        </div>

        {canManage && (
          <div className={styles.panelActions}>
            <button
              type="button"
              disabled={ungrouped.length === 0 || groups.distribute.isPending}
              onClick={() => groups.distribute.mutate(set.id)}
            >
              Distribute remaining
            </button>
            <button
              type="button"
              className={styles.danger}
              disabled={groups.deleteSet.isPending}
              onClick={() => groups.deleteSet.mutate(set.id)}
            >
              Delete set
            </button>
          </div>
        )}
      </div>

      <div className={styles.groupGrid}>
        {set.groups.map((group) => (
          <article key={group.id} className={styles.groupCard}>
            <header className={styles.groupHeader}>
              <h3 className={styles.groupName}>{group.name}</h3>
              <span className={styles.groupCount}>
                {group.memberCount}{group.capacity !== null && ` / ${group.capacity}`}
              </span>
            </header>

            {group.members.length === 0 ? (
              <p className={styles.groupEmpty}>Nobody yet.</p>
            ) : (
              <ul className={styles.memberList}>
                {group.members.map((member) => (
                  <li key={member.userId} className={styles.member}>
                    <span>{member.displayName}</span>
                    {canManage && (
                      <button
                        type="button"
                        className={styles.linkAction}
                        disabled={groups.removeMember.isPending}
                        onClick={() => groups.removeMember.mutate({
                          setId: set.id,
                          groupId: group.id,
                          userId: member.userId,
                        })}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <footer className={styles.groupFooter}>
              {/* Students only. Join needs room and an open window; switching
                  is offered instead once they are already in another group. */}
              {!canManage && set.openForSelfService && (
                myGroupId === group.id ? (
                  <button
                    type="button"
                    className={styles.linkAction}
                    disabled={busy}
                    onClick={() => groups.leaveGroup.mutate({setId: set.id, groupId: group.id})}
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.linkAction}
                    disabled={busy || isFull(group)}
                    title={isFull(group) ? 'This group is full' : undefined}
                    onClick={() => (myGroupId === null
                      ? groups.joinGroup.mutate({setId: set.id, groupId: group.id})
                      : groups.switchGroup.mutate({setId: set.id, groupId: group.id}))}
                  >
                    {myGroupId === null ? 'Join' : 'Switch here'}
                  </button>
                )
              )}

              {canManage && placing !== null && (
                <button
                  type="button"
                  className={styles.linkAction}
                  disabled={isFull(group) || groups.addMember.isPending}
                  onClick={() => {
                    groups.addMember.mutate({
                      setId: set.id,
                      groupId: group.id,
                      userId: placing,
                    });
                    setPlacing(null);
                  }}
                >
                  Place here
                </button>
              )}

              {canManage && (
                <button
                  type="button"
                  className={`${styles.linkAction} ${styles.danger}`}
                  disabled={groups.deleteGroup.isPending}
                  onClick={() => groups.deleteGroup.mutate({setId: set.id, groupId: group.id})}
                >
                  Delete
                </button>
              )}
            </footer>
          </article>
        ))}

        {canManage && (
          <form
            className={styles.newGroupCard}
            onSubmit={(event) => {
              event.preventDefault();
              if (newGroupName.trim()) {
                groups.createGroup.mutate({setId: set.id, name: newGroupName.trim()});
                setNewGroupName('');
              }
            }}
          >
            <input
              className={styles.newGroupInput}
              placeholder="New group name"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
            />
            <button
              type="submit"
              className={styles.primary}
              disabled={!newGroupName.trim() || groups.createGroup.isPending}
            >
              Add group
            </button>
          </form>
        )}
      </div>

      {canManage && (
        <section className={styles.ungrouped}>
          <h3 className={styles.ungroupedTitle}>
            Not in a group ({ungrouped.length})
          </h3>

          {ungrouped.length === 0 ? (
            <p className={styles.groupEmpty}>Everyone has a group.</p>
          ) : (
            <ul className={styles.ungroupedList}>
              {ungrouped.map((student) => (
                <li key={student.userId}>
                  <button
                    type="button"
                    className={`${styles.studentChip} ${placing === student.userId ? styles.studentChipActive : ''}`}
                    onClick={() => setPlacing(
                      placing === student.userId ? null : student.userId
                    )}
                  >
                    {student.displayName}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {placing !== null && (
            <p className={styles.hint}>Now choose a group to place them in.</p>
          )}
        </section>
      )}
    </section>
  );
};
