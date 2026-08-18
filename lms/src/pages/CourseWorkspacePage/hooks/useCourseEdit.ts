import React from "react";
import {useCourseWorkspaceStore} from "../stores/useCourseWorkspaceStore";
import {CourseDetailDTO, CourseResponse, CourseWeek} from "@/apis";
import {useCourseWorkspaceData} from "./useCourseWorkspaceData";
import {useRequiredAuth} from "@/contexts/RequiredAuthContext";

/**
 * Mirrors the loaded course into the workspace store, which edit mode and the
 * header read from.
 *
 * Fetching lives in useCourseWorkspaceData, so both modes share one set of
 * queries. This used to run its own useSuspenseQuery, which had two problems:
 * it fetched the same course twice, and a suspense query reports failure by
 * throwing — so a single failed request took down the whole page instead of
 * letting the view render its own error.
 *
 * Assignments are not loaded. In this API they belong to the course and are
 * ordered by due date, with no reference to a week, while the store models
 * them as children of one. Inventing that link would misfile every assignment
 * (open-decisions.md S-7).
 */
const toCourseDetail = (course: CourseResponse, weeks: CourseWeek[]): CourseDetailDTO => ({
  courseInfo: {
    id: course.id ?? course.courseId,
    courseCode: course.courseCode,
    name: course.title ?? course.name,
    description: course.description ?? "",
    termStartDate: course.termStartDate,
    termEndDate: course.termEndDate,
    location: course.location,
    teacherName: course.primaryInstructor?.name,
    teacherEmail: course.primaryInstructor?.email,
    createdAt: new Date(course.createdAt),
    updatedAt: new Date(course.updatedAt),
  },
  // Weeks are this product's course units. `orderPosition` is zero-based and
  // ascending, which is what sortOrder means here.
  courseUnits: weeks.map((week) => ({
    id: week.id,
    title: week.title,
    sortOrder: week.orderPosition,
    // Weeks carry materials, not a description.
    description: "",
    createdAt: new Date(week.createdAt),
    updatedAt: new Date(week.updatedAt),
  })),
  assignments: [],
});

export const useCourseEdit = () => {
  const {loadCourseInfo, setRole} = useCourseWorkspaceStore();
  const {user} = useRequiredAuth();
  const {course, weeks} = useCourseWorkspaceData();

  React.useEffect(() => {
    if (course) {
      loadCourseInfo(toCourseDetail(course, weeks));
    }
  }, [course, weeks]);

  /**
   * Decides whether this user gets the teaching controls for this course.
   *
   * Course role, not platform level: someone can teach one course and be
   * enrolled as a student in another (ROLE-03), so a global INSTRUCTOR flag
   * would hand out edit controls in courses they only attend.
   *
   * The check is the primary instructor of this specific course. A TA is
   * therefore treated as a student here, which under-grants rather than
   * over-grants — a TA may upload materials, and that will need the course
   * membership endpoint, which only a Course Manager can read.
   */
  React.useEffect(() => {
    if (!course) return;
    const instructorId = course.primaryInstructor?.userId ?? course.instructorId;
    const isPrimaryInstructor = instructorId != null && instructorId === user.userId;
    setRole(isPrimaryInstructor ? "teacher" : "student");
  }, [course, user.userId]);
};
