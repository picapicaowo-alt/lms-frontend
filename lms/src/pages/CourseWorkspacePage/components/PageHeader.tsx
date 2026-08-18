import React, {useMemo} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import styles from "./PageHeader.module.scss";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {useCourseWorkspaceStore} from "../stores/useCourseWorkspaceStore";

export const PageHeader: React.FC = () => {
  const navigate = useNavigate();
  const {t} = useTranslation("course");
  const {workspaceMode, setWorkspaceMode, role, course} = useCourseWorkspaceStore();
  
  const renderActionButtons = useMemo(() => {
    if (workspaceMode === "view") {
      return role === "teacher" ? (
        <React.Fragment>
          <button
            className={styles.secondaryButton}
            onClick={() => setWorkspaceMode("edit")}
          >
            {t("detail.editCourse")}
          </button>
          {/* No Publish button. Publishing exists per week —
              POST .../weeks/{id}/publish, which the week list offers — and
              there is no course-level call to make. A control that cannot do
              anything is worse than an absent one, so it is left out rather
              than shown disabled (S-6). */}
        </React.Fragment>
      ) : null;
    }
    
    return (
      <React.Fragment>
        <button
          className={styles.cancelButton}
          onClick={() => {
            if (workspaceMode === "edit") setWorkspaceMode("view");
            if (workspaceMode === "create") navigate("/course");
          }}
        >
          {t("addContent.cancelButton")}
        </button>
        <button className={styles.publishButton}>
          {workspaceMode === "edit"
            ? t("addContent.saveButton")
            : t("addContent.publishButton")
          }
        </button>
      </React.Fragment>
    );
  }, [workspaceMode, t, navigate, setWorkspaceMode]);
  
  return (
    <div className={styles.workspaceHeader}>
      <button
        className={styles.backButton}
        onClick={() => navigate(-1)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      
      <div className={styles.titleContainer}>
        <span className={`${styles.courseTitle} ${!course.name ? styles.placeholderTitle : ''}`}>
          {course.name || t('addContent.untitledCourse')}
        </span>
        <svg className={styles.titleArrow} width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>
      
      <div className={styles.headerActions}>
        <LanguageSwitcher/>
        {renderActionButtons}
      </div>
    </div>
  );
};
