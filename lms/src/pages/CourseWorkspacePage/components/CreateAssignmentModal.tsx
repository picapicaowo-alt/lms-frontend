import React, {useEffect, useState} from "react";
import {useMutation, useQuery} from "@tanstack/react-query";
import styles from "./CreateAssignmentModal.module.scss";
import {ApiError, AssignmentResponse, GroupSet, unwrapData} from "@/apis";
import {assignmentApiService} from "@/apis/services/assignment-api";
import {groupApiService} from "@/apis/services/group-api";

interface CreateAssignmentModalProps {
  courseId: number;
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

/** Defaults that satisfy the server's constraints without the user thinking. */
const DEFAULTS = {
  pointsPossible: 100,
  maxFileCount: 1,
  maxFileSizeMb: 10,
  fileTypes: 'pdf',
};

const MAX_FILE_BYTES = 104857600;

/**
 * Creating an assignment.
 *
 * It is always created as a Draft, so this dialog offers "Save as draft" and
 * "Save and publish" rather than a single ambiguous Create — publishing is a
 * second call and it notifies every active student, which is not something to
 * do by accident.
 *
 * `dueAt` is sent as the institution's wall-clock time, which is what the
 * endpoint expects and what INV-06 requires; the server converts and returns
 * both the UTC instant and the local rendering.
 */
export const CreateAssignmentModal: React.FC<CreateAssignmentModalProps> = ({
                                                                             courseId,
                                                                             open,
                                                                             onClose,
                                                                             onCreated,
                                                                           }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(String(DEFAULTS.pointsPossible));
  const [dueAt, setDueAt] = useState('');
  const [lateUntil, setLateUntil] = useState('');
  const [fileTypes, setFileTypes] = useState(DEFAULTS.fileTypes);
  const [maxFileCount, setMaxFileCount] = useState(String(DEFAULTS.maxFileCount));
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(String(DEFAULTS.maxFileSizeMb));
  const [isGroup, setIsGroup] = useState(false);
  const [groupSetId, setGroupSetId] = useState<string>('');

  // Group assignments need an existing set, so the choice is only offered when
  // the course actually has one — otherwise the server rejects the create.
  const groupSets = useQuery({
    queryKey: ['group-sets', courseId],
    queryFn: async (): Promise<GroupSet[]> =>
      unwrapData(await groupApiService.listGroupSets(courseId), 'listGroupSets'),
    enabled: open,
    staleTime: 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const create = useMutation({
    mutationFn: async (publish: boolean): Promise<AssignmentResponse> => {
      const created = unwrapData(
        await assignmentApiService.createAssignment(courseId, {
          title: title.trim(),
          description: description.trim() || undefined,
          pointsPossible: Number(points),
          dueAt,
          lateUntil: lateUntil || null,
          // Dots and case are normalised server-side; empty entries are not.
          allowedFileTypes: fileTypes
            .split(',')
            .map((type) => type.trim())
            .filter(Boolean),
          maxFileSizeBytes: Math.round(Number(maxFileSizeMb) * 1024 * 1024),
          maxFileCount: Number(maxFileCount),
          submissionType: isGroup ? 'Group' : 'Individual',
          groupSetId: isGroup ? Number(groupSetId) : null,
        }),
        'createAssignment'
      );

      // Publishing is deliberately a separate call, so a failure here leaves a
      // saved draft rather than losing the whole thing.
      if (publish) {
        return unwrapData(
          await assignmentApiService.publishAssignment(courseId, created.id),
          'publishAssignment'
        );
      }
      return created;
    },
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  if (!open) return null;

  const sizeMb = Number(maxFileSizeMb);
  const count = Number(maxFileCount);
  const types = fileTypes.split(',').map((t) => t.trim()).filter(Boolean);

  const problems: string[] = [];
  if (lateUntil && dueAt && lateUntil < dueAt) problems.push('The late window must end after the due date.');
  if (count < 1 || count > 10) problems.push('Allow between 1 and 10 files.');
  if (!(sizeMb > 0) || sizeMb * 1024 * 1024 > MAX_FILE_BYTES) problems.push('File size must be between 1 MB and 100 MB.');
  if (types.length === 0) problems.push('List at least one file type.');
  if (isGroup && !groupSetId) problems.push('Choose a group set for a group assignment.');

  const canSubmit = Boolean(title.trim() && dueAt && Number(points) > 0)
    && problems.length === 0
    && !create.isPending;

  const failure = create.isError
    ? ((create.error as unknown as ApiError)?.details as {message?: string} | undefined)?.message
      ?? "Couldn't create the assignment."
    : null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-assignment-title"
      >
        <div className={styles.header}>
          <h2 id="create-assignment-title" className={styles.title}>New assignment</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className={styles.body}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input className={styles.input} value={title}
                   onChange={(e) => setTitle(e.target.value)} required/>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description <span className={styles.optional}>optional</span></span>
            <textarea className={styles.textarea} rows={3} value={description}
                      onChange={(e) => setDescription(e.target.value)}/>
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Points</span>
              <input className={styles.input} type="number" min={1} value={points}
                     onChange={(e) => setPoints(e.target.value)}/>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Due</span>
              <input className={styles.input} type="datetime-local" value={dueAt}
                     onChange={(e) => setDueAt(e.target.value)} required/>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>
              Accept late work until <span className={styles.optional}>optional</span>
            </span>
            <input className={styles.input} type="datetime-local" value={lateUntil}
                   onChange={(e) => setLateUntil(e.target.value)}/>
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>File types</span>
              <input className={styles.input} value={fileTypes}
                     onChange={(e) => setFileTypes(e.target.value)} placeholder="pdf, docx"/>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Max files</span>
              <input className={styles.input} type="number" min={1} max={10} value={maxFileCount}
                     onChange={(e) => setMaxFileCount(e.target.value)}/>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Max size (MB)</span>
              <input className={styles.input} type="number" min={1} max={100} value={maxFileSizeMb}
                     onChange={(e) => setMaxFileSizeMb(e.target.value)}/>
            </label>
          </div>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={isGroup}
              disabled={(groupSets.data ?? []).length === 0}
              onChange={(e) => setIsGroup(e.target.checked)}
            />
            Group assignment
            {(groupSets.data ?? []).length === 0 && (
              <span className={styles.optional}>needs a group set in this course</span>
            )}
          </label>

          {isGroup && (
            <label className={styles.field}>
              <span className={styles.label}>Group set</span>
              <select className={styles.input} value={groupSetId}
                      onChange={(e) => setGroupSetId(e.target.value)}>
                <option value="">Choose…</option>
                {(groupSets.data ?? []).map((set) => (
                  <option key={set.id} value={String(set.id)}>{set.name}</option>
                ))}
              </select>
            </label>
          )}

          {problems.map((problem) => (
            <p key={problem} className={styles.error}>{problem}</p>
          ))}
          {failure && <p className={styles.error} role="alert">{failure}</p>}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={styles.cancel}
            disabled={!canSubmit}
            onClick={() => create.mutate(false)}
          >
            Save as draft
          </button>
          <button
            type="button"
            className={styles.submit}
            disabled={!canSubmit}
            onClick={() => create.mutate(true)}
          >
            {create.isPending ? 'Saving…' : 'Save and publish'}
          </button>
        </div>
      </div>
    </div>
  );
};
