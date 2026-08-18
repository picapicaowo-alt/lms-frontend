import React, {useRef, useState} from "react";
import {useMutation} from "@tanstack/react-query";
import styles from "../CourseDetailView/index.module.scss";
import editStyles from "./index.module.scss";
import {ApiError, CourseWeek} from "@/apis";
import {courseApiService} from "@/apis/services/course-api";
import {MaterialList} from "../MaterialList";

interface WeekContentCardProps {
  courseId: number;
  week: CourseWeek | null;
  onChanged: () => void;
}

/** What the API accepts; anything else returns UNSUPPORTED_FILE_TYPE. */
const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.gif,.webp';

/**
 * Course Content in edit mode: the week's materials, and a way to add more.
 *
 * The design puts a block editor here — a titled document with slash commands
 * and Ask AI. A week has no rich-text field to store one; it holds materials,
 * which are files and links. Rather than show an editor whose contents could
 * never be saved, this manages the thing the week actually contains.
 */
export const WeekContentCard: React.FC<WeekContentCardProps> = ({courseId, week, onChanged}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const upload = useMutation({
    mutationFn: (files: File[]) => courseApiService.uploadMaterials(courseId, week!.id, files),
    onSuccess: onChanged,
  });

  // The server names the reason — unsupported type, too large, archived
  // course — and each is something the user can act on.
  const failure = upload.isError
    ? ((upload.error as unknown as ApiError)?.details as {message?: string} | undefined)?.message
      ?? "Couldn't upload those files."
    : null;

  const send = (files: FileList | null) => {
    if (!files || files.length === 0 || !week) return;
    upload.mutate(Array.from(files));
  };

  return (
    <section className={styles.card}>
      <p className={styles.cardLabel}>Course Content</p>

      {!week ? (
        <p className={styles.cardEmpty}>Add a week to start putting content in it.</p>
      ) : (
        <>
          <h2 className={styles.contentTitle}>{week.title}</h2>

          <MaterialList
            courseId={courseId}
            weekId={week.id}
            materials={week.materials}
            canDelete
            onDeleted={onChanged}
          />

          <div
            className={`${styles.uploadArea} ${dragging ? styles.uploadAreaActive : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              send(event.dataTransfer.files);
            }}
          >
            <span>
              {upload.isPending
                ? 'Uploading…'
                : <>Drag and drop files here or <span className={styles.uploadChoose}>Choose</span> file to upload</>}
            </span>
            <span>PDF, Office documents, zip and images. Up to 200 MB.</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            hidden
            onChange={(event) => {
              send(event.target.files);
              // Reset so re-picking the same file fires change again.
              event.target.value = '';
            }}
          />

          {failure && <p className={editStyles.error} role="alert">{failure}</p>}
        </>
      )}
    </section>
  );
};
