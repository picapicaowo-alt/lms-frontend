import React, {useState} from "react";
import styles from "./index.module.scss";
import {AssignmentSummary} from "@/apis";
import {formatDeadline} from "@/utils/datetime";
import {CreateAssignmentModal} from "../CreateAssignmentModal";

interface AssignmentsCardProps {
  courseId: number;
  assignments: AssignmentSummary[];
  failed: boolean;
  /** Instructors get the Add new action from the design. */
  canManage?: boolean;
  onChanged?: () => void;
}

/**
 * The Homework / Problem Set card.
 *
 * The design gives every row a coloured content-type badge — Assignments, In
 * Class ICE — and puts a type filter in the header. Those types are a Figma
 * concept with no counterpart in the API: an assignment carries a submission
 * type of Individual or Group and nothing else, so there is no type to filter
 * by and no colour to assign. Rows show what the payload has, and the header
 * dropdown is left out rather than offering a filter that cannot filter
 * (open-decisions.md S-5).
 */
export const AssignmentsCard: React.FC<AssignmentsCardProps> = ({
                                                                  courseId,
                                                                  assignments,
                                                                  failed,
                                                                  canManage = false,
                                                                  onChanged,
                                                                }) => {
  const [creating, setCreating] = useState(false);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Homework / Problem Set</h2>
        {canManage && (
          <button type="button" className={styles.materialAction} onClick={() => setCreating(true)}>
            Add new
          </button>
        )}
      </div>

      {failed ? (
        <p className={styles.cardEmpty} role="alert">Couldn&apos;t load assignments.</p>
      ) : assignments.length === 0 ? (
        <p className={styles.cardEmpty}>No assignments in this course yet.</p>
      ) : (
        <ul className={styles.rowList}>
          {assignments.map((assignment) => (
            <li key={assignment.id} className={styles.row}>
              {assignment.submissionType === 'Group' && (
                <span className={styles.groupBadge}>Group</span>
              )}
              <span className={styles.rowTitle}>{assignment.title}</span>
              <span className={styles.rowMeta}>
                {formatDeadline(assignment.dueAtLocal, assignment.timezone)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <CreateAssignmentModal
        courseId={courseId}
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => onChanged?.()}
      />
    </section>
  );
};
