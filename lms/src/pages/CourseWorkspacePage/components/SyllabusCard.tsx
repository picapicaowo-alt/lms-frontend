import React, {useRef, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import styles from "./CourseDetailView/index.module.scss";
import {ApiError, SyllabusState, unwrapData} from "@/apis";
import {courseApiService} from "@/apis/services/course-api";
import {saveBlob} from "@/utils/downloadBlob";

interface SyllabusCardProps {
  courseId: number;
  /** Course Managers get upload, restore and clear. */
  canManage: boolean;
}

const formatSize = (bytes: number): string =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/**
 * The course syllabus: one versioned PDF.
 *
 * Uploading over an existing one creates a new version rather than
 * overwriting, which is what makes Restore possible, and clearing is logical —
 * the versions survive. So "Replace" and "Remove" are safe to offer without a
 * confirmation step; nothing is destroyed by either.
 *
 * Both the file endpoints need the bearer token, so the PDF is fetched as a
 * Blob rather than linked to.
 */
export const SyllabusCard: React.FC<SyllabusCardProps> = ({courseId, canManage}) => {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const syllabus = useQuery({
    queryKey: ['syllabus', courseId],
    queryFn: async (): Promise<SyllabusState> =>
      unwrapData(await courseApiService.getSyllabus(courseId), 'getSyllabus'),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const refresh = () => queryClient.invalidateQueries({queryKey: ['syllabus', courseId]});

  const upload = useMutation({
    mutationFn: (file: File) => courseApiService.uploadSyllabus(courseId, file),
    onSuccess: () => void refresh(),
  });
  const restore = useMutation({
    mutationFn: () => courseApiService.restoreSyllabus(courseId),
    onSuccess: () => void refresh(),
  });
  const clear = useMutation({
    mutationFn: () => courseApiService.clearSyllabus(courseId),
    onSuccess: () => void refresh(),
  });

  const writeError = [upload, restore, clear].find((m) => m.isError);
  const failure = fileError ?? (writeError
    ? ((writeError.error as unknown as ApiError)?.details as {message?: string} | undefined)?.message
      ?? "That didn't work. Please try again."
    : null);

  const send = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    // Checked here as well as server-side so the user is told immediately
    // rather than after an upload that was always going to be refused.
    if (file.type !== 'application/pdf') {
      setFileError('The syllabus must be a PDF.');
      return;
    }
    setFileError(null);
    upload.mutate(file);
  };

  const fetchPdf = async (inline: boolean) => {
    setBusy(true);
    setFileError(null);
    try {
      const blob = await courseApiService.downloadSyllabus(courseId, inline);
      if (inline) {
        // Opened rather than saved; revoked once the tab has had it.
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        saveBlob(blob, posted ? posted.originalFilename : 'syllabus.pdf');
      }
    } catch {
      setFileError("Couldn't open the syllabus.");
    } finally {
      setBusy(false);
    }
  };

  const posted = syllabus.data?.posted ? syllabus.data : null;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Syllabus</h2>
      </div>

      {syllabus.isPending && <p className={styles.cardEmpty}>Loading…</p>}

      {syllabus.isError && (
        <p className={styles.cardEmpty} role="alert">Couldn&apos;t load the syllabus.</p>
      )}

      {!syllabus.isPending && !syllabus.isError && (
        posted ? (
          <div className={styles.material}>
            <span className={styles.materialIcon} aria-hidden="true">PDF</span>
            <span className={styles.materialName}>{posted.originalFilename}</span>
            <span className={styles.materialMeta}>{formatSize(posted.sizeBytes)}</span>

            <button
              type="button"
              className={styles.materialAction}
              disabled={busy}
              onClick={() => void fetchPdf(true)}
            >
              Preview
            </button>
            <button
              type="button"
              className={styles.materialAction}
              disabled={busy}
              onClick={() => void fetchPdf(false)}
            >
              Download
            </button>

            {canManage && (
              <>
                <button
                  type="button"
                  className={styles.materialAction}
                  disabled={upload.isPending}
                  onClick={() => inputRef.current?.click()}
                >
                  Replace
                </button>
                {posted.canRestorePrevious && (
                  <button
                    type="button"
                    className={styles.materialAction}
                    disabled={restore.isPending}
                    onClick={() => restore.mutate()}
                  >
                    Restore previous
                  </button>
                )}
                <button
                  type="button"
                  className={`${styles.materialAction} ${styles.materialDanger}`}
                  disabled={clear.isPending}
                  onClick={() => clear.mutate()}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        ) : canManage ? (
          <div className={styles.uploadArea} onClick={() => inputRef.current?.click()}>
            <span>
              {upload.isPending
                ? 'Uploading…'
                : <>No syllabus yet. <span className={styles.uploadChoose}>Choose</span> a PDF to upload.</>}
            </span>
          </div>
        ) : (
          <p className={styles.cardEmpty}>No syllabus has been posted for this course.</p>
        )
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(event) => {
          send(event.target.files);
          event.target.value = '';
        }}
      />

      {failure && <p className={styles.materialError} role="alert">{failure}</p>}
    </section>
  );
};
