export interface SidebarConfig {
  name: string;
  path: string;
  sidebarItem?: {
    filledIcon: string;
    unfilledIcon: string;
    translationLabel: string;
  };
}

export const SIDEBAR_CONFIGS: SidebarConfig[] = [
  {
    name: "Dashboard",
    path: "/",
    sidebarItem: {
      filledIcon: "/icons/home_fill.png",
      unfilledIcon: "/icons/home_unfill.png",
      translationLabel: "sidebar.dashboard",
    },
  },
  {
    name: "My Course",
    path: "/course",
    sidebarItem: {
      filledIcon: "/icons/course_fill.png",
      unfilledIcon: "/icons/course_unfill.png",
      translationLabel: "sidebar.myCourse",
    },
  },
  // No Chat entry. Discussions are outside V1 and the requirement is to hide
  // the legacy RocketChat entry; the screen behind it also carried a hardcoded
  // login to an undocumented host. The route is removed too, so that code no
  // longer reaches the bundle.
  {
    name: "AI Chatbot",
    path: "/aibot",
    sidebarItem: {
      filledIcon: "/icons/ai_course.png",
      unfilledIcon: "/icons/ai_course.png",
      translationLabel: "sidebar.aiChatbot",
    },
  }
];