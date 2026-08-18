import React, {useState} from "react";
import styles from "./index.module.scss";
import {BatchStudentEnrollResponse} from "@/apis";

interface EnrolStudentsPanelProps {
  onEnrol: (emails: string[]) => void;
  isPending: boolean;
  result: BatchStudentEnrollResponse | null;
  failed: boolean;
}

/** Up to 100 identifiers per call, per the batch endpoint. */
const MAX_PER_BATCH = 100;

const parseEmails = (raw: string): string[] =>
  raw
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter(Boolean);

/**
 * Enrols students by email.
 *
 * By email rather than user id: an instructor has a class list, not a set of
 * internal ids. The batch endpoint accepts either.
 *
 * The result is reported per identifier, because partial success is the normal
 * outcome — one unknown address does not stop the rest — and a bare "done"
 * would hide the addresses that failed.
 */
export const EnrolStudentsPanel: React.FC<EnrolStudentsPanelProps> = ({
                                                                       onEnrol,
                                                                       isPending,
                                                                       result,
                                                                       failed,
                                                                     }) => {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');

  const emails = parseEmails(raw);
  const tooMany = emails.length > MAX_PER_BATCH;

  if (!open) {
    return (
      <button type="button" className={styles.addStudents} onClick={() => setOpen(true)}>
        + Add students
      </button>
    );
  }

  return (
    <section className={styles.enrolPanel}>
      <label className={styles.enrolLabel} htmlFor="enrol-emails">
        Email addresses, separated by spaces, commas or new lines
      </label>
      <textarea
        id="enrol-emails"
        className={styles.enrolInput}
        rows={3}
        value={raw}
        onChange={(event) => setRaw(event.target.value)}
        placeholder="student1@example.com, student2@example.com"
      />

      <div className={styles.enrolFooter}>
        <span className={tooMany ? styles.enrolError : styles.enrolHint}>
          {emails.length} address{emails.length === 1 ? '' : 'es'}
          {tooMany && ` — ${MAX_PER_BATCH} at a time maximum`}
        </span>
        <div className={styles.enrolActions}>
          <button type="button" onClick={() => {setOpen(false); setRaw('');}}>Cancel</button>
          <button
            type="button"
            className={styles.primary}
            disabled={emails.length === 0 || tooMany || isPending}
            onClick={() => onEnrol(emails)}
          >
            {isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {failed && (
        <p className={styles.enrolError} role="alert">
          Couldn&apos;t add these students. Please try again.
        </p>
      )}

      {result && (
        <div className={styles.enrolResult} role="status">
          <p>{result.successCount} added, {result.failureCount} failed.</p>
          {result.items.filter((item) => item.status === 'ERROR').length > 0 && (
            <ul className={styles.enrolFailures}>
              {result.items
                .filter((item) => item.status === 'ERROR')
                .map((item, index) => (
                  <li key={index}>
                    {item.errorType ?? 'Failed'}
                    {item.message ? ` — ${item.message}` : ''}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
