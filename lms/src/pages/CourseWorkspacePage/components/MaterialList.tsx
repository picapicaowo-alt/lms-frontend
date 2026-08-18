import React, {useState} from "react";
// Shared with the detail and edit cards so a material row looks the same in
// both; this file sits one level above that folder.
import styles from "./CourseDetailView/index.module.scss";
import {CourseMaterial} from "@/apis";
import {courseApiService} from "@/apis/services/course-api";
import {saveBlob} from "@/utils/downloadBlob";

interface MaterialListProps {
  courseId: number;
  weekId: number;
  materials: CourseMaterial[];
  /** Staff only. Deleting is not offered to students. */
  canDelete?: boolean;
  onDeleted?: () => void;
}

const formatSize = (bytes: number | null): string => {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * The files and links in a week.
 *
 * Downloads go through an authenticated request rather than a link: the
 * endpoint requires the bearer token and answers 401 without it. The
 * material's own `downloadUrl` is unusable for a second reason — it names the
 * bare host with no port, so it does not reach this deployment at all.
 *
 * Links are the exception; those are ordinary URLs and open directly.
 */
export const MaterialList: React.FC<MaterialListProps> = ({
                                                            courseId,
                                                            weekId,
                                                            materials,
                                                            canDelete = false,
                                                            onDeleted,
                                                          }) => {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const download = async (material: CourseMaterial) => {
    setBusyId(material.id);
    setFailure(null);
    try {
      const blob = await courseApiService.downloadMaterial(courseId, weekId, material.id);
      saveBlob(blob, material.originalFilename ?? material.displayName);
    } catch {
      setFailure(`Couldn't download ${material.displayName}.`);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (material: CourseMaterial) => {
    setBusyId(material.id);
    setFailure(null);
    try {
      await courseApiService.deleteMaterial(courseId, weekId, material.id);
      onDeleted?.();
    } catch {
      setFailure(`Couldn't remove ${material.displayName}.`);
    } finally {
      setBusyId(null);
    }
  };

  if (materials.length === 0) {
    return <p className={styles.cardEmpty}>No materials in this week yet.</p>;
  }

  return (
    <>
      <ul className={styles.materialList}>
        {materials.map((material) => (
          <li key={material.id} className={styles.material}>
            <span className={styles.materialIcon} aria-hidden="true">
              {material.materialType === 'LINK' ? '🔗' : (material.extension ?? 'file').toUpperCase()}
            </span>
            <span className={styles.materialName}>{material.displayName}</span>

            {material.materialType === 'FILE' && (
              <span className={styles.materialMeta}>{formatSize(material.sizeBytes)}</span>
            )}

            {material.materialType === 'LINK' && material.linkUrl ? (
              <a
                className={styles.materialAction}
                href={material.linkUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                Open
              </a>
            ) : (
              <button
                type="button"
                className={styles.materialAction}
                disabled={busyId === material.id}
                onClick={() => void download(material)}
              >
                {busyId === material.id ? 'Downloading…' : 'Download'}
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                className={`${styles.materialAction} ${styles.materialDanger}`}
                disabled={busyId === material.id}
                onClick={() => void remove(material)}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {failure && <p className={styles.materialError} role="alert">{failure}</p>}
    </>
  );
};
