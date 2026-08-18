import React, {useEffect, useState} from "react";
import styles from "./index.module.scss";
import {useCourseWorkspaceData} from "../../hooks/useCourseWorkspaceData";
import {formatCourseName} from "@/utils/course";
import {WeekOutline} from "./WeekOutline";
import {ContentCard} from "./ContentCard";
import {AssignmentsCard} from "./AssignmentsCard";
import {ScheduleCard} from "./ScheduleCard";
import {SyllabusCard} from "../SyllabusCard";

/**
 * Course detail, view mode — see docs/design/13-course-detail-view.png.
 *
 * Two columns: the week outline on the left, a stack of content cards on the
 * right. The design's third card, "Assignments are weighted by group", is not
 * built. Weighted grade groups do not exist in the PRD — a student sees
 * per-item scores and no course total — and no endpoint stores a weight, so
 * the card would be decoration over nothing (open-decisions.md B-3).
 */
export const CourseDetailView: React.FC = () => {
  const {
    courseId, course, weeks, sessions, assignments,
    isLoading, isError, sessionsFailed, assignmentsFailed, refetch,
  } = useCourseWorkspaceData();

  const [activeWeekId, setActiveWeekId] = useState<number | null>(null);

  // Follow the design and open on the first week, but only once the weeks are
  // actually here — and never override a week the user has chosen.
  useEffect(() => {
    if (activeWeekId === null && weeks.length > 0) {
      setActiveWeekId(weeks[0].id);
    }
  }, [weeks, activeWeekId]);

  if (isLoading) {
    return <div className={styles.status}>Loading course…</div>;
  }

  // courseId is null only on a route without a course, which this screen is
  // never reached from — isError already covers it, and narrowing here lets
  // the cards take a plain number.
  if (isError || !course || courseId === null) {
    return (
      <div className={styles.status} role="alert">
        <p>This course couldn&apos;t be loaded.</p>
        <button type="button" className={styles.retry} onClick={refetch}>Try again</button>
      </div>
    );
  }

  const activeWeek = weeks.find((week) => week.id === activeWeekId) ?? null;

  return (
    <div className={styles.layout}>
      <aside className={styles.outline}>
        <h1 className={styles.courseTitle}>
          {formatCourseName(course.courseCode, course.title ?? course.name)}
        </h1>
        <div className={styles.divider}/>
        <WeekOutline
          weeks={weeks}
          activeWeekId={activeWeekId}
          onSelect={setActiveWeekId}
        />
      </aside>

      <div className={styles.cards}>
        <ContentCard courseId={courseId} week={activeWeek}/>
        <SyllabusCard courseId={courseId} canManage={false}/>
        <AssignmentsCard assignments={assignments} failed={assignmentsFailed}/>
        <ScheduleCard sessions={sessions} failed={sessionsFailed}/>
      </div>
    </div>
  );
};
