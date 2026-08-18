import React, {useEffect, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import styles from "../CourseDetailView/index.module.scss";
import editStyles from "./index.module.scss";
import {useCourseWorkspaceData} from "../../hooks/useCourseWorkspaceData";
import {courseApiService} from "@/apis/services/course-api";
import {formatCourseName} from "@/utils/course";
import {ScheduleCard} from "../CourseDetailView/ScheduleCard";
import {SyllabusCard} from "../SyllabusCard";
import {WeekEditorList} from "./WeekEditorList";
import {WeekContentCard} from "./WeekContentCard";

/**
 * Course detail, edit mode — see docs/design/14-course-edit-empty.png and 16.
 *
 * Same two-column shape as view mode, with the cards turned into editors. Two
 * of the design's four cards are absent, both because there is nothing behind
 * them:
 *
 *  - "Assignments are weighted by group". Weighted grade groups do not exist
 *    in the PRD, which gives a student per-item scores and no course total,
 *    and no endpoint stores a weight (B-3).
 *  - "Homework / Problem Set". Creating an assignment is possible, but this
 *    card files assignments under the week being edited and the API has no
 *    such relationship — an assignment belongs to the course (S-7).
 *
 * The block editor behind "Course Content" is also not built. A week holds
 * materials, not rich text; there is no document to edit and no field to save
 * one into. Its AI affordances are out of scope for V1 regardless (B-4).
 */
export const CourseEditView: React.FC = () => {
  const {courseId, course, weeks, sessions, isLoading, isError, sessionsFailed, refetch} =
    useCourseWorkspaceData();
  const queryClient = useQueryClient();

  const [activeWeekId, setActiveWeekId] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  useEffect(() => {
    if (activeWeekId === null && weeks.length > 0) setActiveWeekId(weeks[0].id);
  }, [weeks, activeWeekId]);

  const invalidate = () => {
    void queryClient.invalidateQueries({queryKey: ['course', courseId]});
    void queryClient.invalidateQueries({queryKey: ['course-weeks', courseId]});
  };

  const renameCourse = useMutation({
    // Declared above the guard that narrows courseId, so it checks again.
    // Throwing here lands in onError rather than unmounting the page.
    mutationFn: (title: string) => {
      if (courseId === null) throw new Error('No course to rename');
      return courseApiService.updateCourse(courseId, {title});
    },
    onSuccess: invalidate,
  });

  if (isLoading) return <div className={styles.status}>Loading course…</div>;

  // courseId is null only on a route with no course in it, which this screen
  // is never reached from — isError already covers it, and naming it here
  // lets the mutations below take a plain number.
  if (isError || !course || courseId === null) {
    return (
      <div className={styles.status} role="alert">
        <p>This course couldn&apos;t be loaded.</p>
        <button type="button" className={styles.retry} onClick={refetch}>Try again</button>
      </div>
    );
  }

  const currentTitle = course.title ?? course.name;
  const activeWeek = weeks.find((week) => week.id === activeWeekId) ?? null;

  const commitTitle = () => {
    const next = titleDraft?.trim();
    setTitleDraft(null);
    if (next && next !== currentTitle) renameCourse.mutate(next);
  };

  return (
    <div className={styles.layout}>
      <aside className={styles.outline}>
        {titleDraft === null ? (
          <h1 className={styles.courseTitle}>
            {formatCourseName(course.courseCode, currentTitle)}
            <button
              type="button"
              className={editStyles.inlineEdit}
              onClick={() => setTitleDraft(currentTitle)}
              aria-label="Rename course"
            >
              ✎
            </button>
          </h1>
        ) : (
          <input
            className={editStyles.titleInput}
            value={titleDraft}
            autoFocus
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitTitle();
              if (event.key === 'Escape') setTitleDraft(null);
            }}
          />
        )}

        {renameCourse.isError && (
          <p className={editStyles.error} role="alert">Couldn&apos;t rename the course.</p>
        )}

        <div className={styles.divider}/>

        <WeekEditorList
          courseId={courseId}
          weeks={weeks}
          activeWeekId={activeWeekId}
          onSelect={setActiveWeekId}
          onChanged={invalidate}
        />
      </aside>

      <div className={styles.cards}>
        <WeekContentCard courseId={courseId} week={activeWeek} onChanged={invalidate}/>
        <SyllabusCard courseId={courseId} canManage/>
        <ScheduleCard sessions={sessions} failed={sessionsFailed}/>
      </div>
    </div>
  );
};
