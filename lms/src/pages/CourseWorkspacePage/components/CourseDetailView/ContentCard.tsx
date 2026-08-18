import React from "react";
import styles from "./index.module.scss";
import {CourseWeek} from "@/apis";
import {MaterialList} from "../MaterialList";

interface ContentCardProps {
  courseId: number;
  week: CourseWeek | null;
}

/**
 * The Course Content card — the selected week and what is in it.
 *
 * The design shows a paragraph of description under the title. A week has no
 * description field; it holds materials. So the card lists those, each with a
 * download, rather than leaving the space blank or padding it with text the
 * course never wrote.
 */
export const ContentCard: React.FC<ContentCardProps> = ({courseId, week}) => (
  <section className={styles.card}>
    <p className={styles.cardLabel}>Course Content</p>

    {!week ? (
      <p className={styles.cardEmpty}>Select a week to see its content.</p>
    ) : (
      <>
        <h2 className={styles.contentTitle}>{week.title}</h2>
        <MaterialList courseId={courseId} weekId={week.id} materials={week.materials}/>
      </>
    )}
  </section>
);
