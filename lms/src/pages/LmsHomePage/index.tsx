import React from "react";
import styles from "./index.module.scss"
import {useWidgetLayout} from "@/pages/LmsHomePage/hooks/useWidgetLayout";
import {Dashboard} from "@/pages/LmsHomePage/components/Dashboard";

// AnnouncementManager is gone from here. It could never open — the section it
// keys off started at 'ai' and nothing on this page ever set it to
// 'announcement' — while shipping a hardcoded login to an undocumented host in
// the production bundle. Announcements are read by the dashboard's own widget,
// which uses /v2/me/announcements/recent.
const LMSHome: React.FC = () => {

  const {
    containerRef,
    width,
    mounted,
    widgetConfigs,
    layout,
    columns,
  } = useWidgetLayout();
  
  return (
    <div className={styles['lms-home-container']}>
      <Dashboard
        layout={layout}
        width={width}
        columns={columns}
        mounted={mounted}
        widgetConfigs={widgetConfigs}
        containerRef={containerRef}
      />
    </div>
  );
};

export default LMSHome;