import React from "react";
import styles from "./index.module.scss";
import {CourseMember} from "@/apis";

interface MemberRowProps {
  member: CourseMember;
  onWithdraw: () => void;
  onPromote: () => void;
  onDemote: () => void;
  isBusy: boolean;
}

/**
 * One enrolment.
 *
 * Which actions appear follows what the API will actually accept:
 *
 *  - Only an active Student can be promoted, and only if their platform level
 *    is STUDENT. An instructor enrolled elsewhere is rejected outright, so the
 *    control is not offered.
 *  - Only a TA can be demoted, which returns them to Student rather than
 *    removing them.
 *  - The primary instructor has neither. Reassigning them is an admin-only
 *    call on a different endpoint.
 */
export const MemberRow: React.FC<MemberRowProps> = ({
                                                      member,
                                                      onWithdraw,
                                                      onPromote,
                                                      onDemote,
                                                      isBusy,
                                                    }) => {
  const isStudent = member.courseRole === 'Student';
  const isTa = member.courseRole === 'TA';
  const canPromote = isStudent && member.active && member.level === 'STUDENT';

  return (
    <tr className={member.active ? undefined : styles.withdrawnRow}>
      <td>{member.userName}</td>
      <td className={styles.email}>{member.userEmail}</td>
      <td>
        <span className={`${styles.roleBadge} ${styles[`role${member.courseRole}`]}`}>
          {member.courseRole}
        </span>
      </td>
      <td>
        {member.active ? (
          <span className={styles.active}>Active</span>
        ) : (
          <span className={styles.withdrawn}>Withdrawn</span>
        )}
        {/* Set when someone is promoted to TA and never cleared afterwards, so
            it explains why a plain student may be unable to submit. */}
        {member.assignmentSubmitFrozen && (
          <span className={styles.frozen} title="This member cannot submit assignments">
            Submissions frozen
          </span>
        )}
      </td>
      <td className={styles.actions}>
        {canPromote && (
          <button type="button" disabled={isBusy} onClick={onPromote}>Make TA</button>
        )}
        {isTa && (
          <button type="button" disabled={isBusy} onClick={onDemote}>Remove TA</button>
        )}
        {isStudent && member.active && (
          <button
            type="button"
            className={styles.danger}
            disabled={isBusy}
            onClick={onWithdraw}
          >
            Withdraw
          </button>
        )}
      </td>
    </tr>
  );
};
