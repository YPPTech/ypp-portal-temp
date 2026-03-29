import type { NavGroup, NavLink } from "@/lib/navigation/types";

/** Section emoji in sidebar (group header), matching instructor IA. */
export const INSTRUCTOR_GROUP_EMOJI: Partial<Record<NavGroup, string>> = {
  Teaching: "📚",
  Students: "👥",
  Progress: "📊",
  Schedule: "🗓",
  Communication: "💬",
  Program: "🧭",
  "Profile & Settings": "👤",
};

const INSTRUCTOR_TEACHING_TOOLS_HREFS: readonly string[] = [
  "/instructor/lesson-design-studio",
  "/lesson-plans",
  "/instructor/lesson-plans/templates",
  "/instructor/workspace",
  "/instructor/curriculum-builder",
  "/instructor/class-settings",
  "/instructor/peer-observation",
];

const BASE_SIDEBAR_BY_HREF: Record<string, { group: NavGroup; label: string; icon: string }> = {
  "/instructor-training": { group: "Teaching", label: "Training", icon: "🎓" },
  "/attendance": { group: "Teaching", label: "Attendance", icon: "📋" },
  "/interviews": { group: "Teaching", label: "Interviews", icon: "🎤" },
  "/instructor/parent-feedback": { group: "Students", label: "Feedback", icon: "💬" },
  "/instructor/mentee-health": { group: "Students", label: "Mental Health", icon: "💚" },
  "/peer-recognition": { group: "Students", label: "Recognition", icon: "🎉" },
  "/goals": { group: "Progress", label: "Goals", icon: "🎯" },
  "/reflection": { group: "Progress", label: "Monthly Reflection", icon: "📝" },
  "/events": { group: "Schedule", label: "Events & Prep", icon: "📅" },
  "/calendar": { group: "Schedule", label: "Calendar", icon: "🗓" },
  "/my-program/schedule": { group: "Schedule", label: "Meetings", icon: "📅" },
  "/messages": { group: "Communication", label: "Messages", icon: "✉" },
  "/instructor/parent-messages": { group: "Communication", label: "Parent Messages", icon: "✉" },
  "/my-program": { group: "Program", label: "Program Overview", icon: "📋" },
  "/my-program/achievement-journey": { group: "Program", label: "Achievement Journey", icon: "🏆" },
  "/college-advisor/activities": { group: "Program", label: "Activities", icon: "🧭" },
  "/profile": { group: "Profile & Settings", label: "Profile", icon: "👤" },
  "/profile/timeline": { group: "Profile & Settings", label: "Journey", icon: "🛤" },
  "/profile/xp": { group: "Profile & Settings", label: "Progress Levels", icon: "⬆" },
  "/settings/personalization": { group: "Profile & Settings", label: "Personalization", icon: "🎨" },
  "/notifications": { group: "Profile & Settings", label: "Notifications", icon: "🔔" },
};

/** Optional Teaching Tools links — same section, after core teaching links. */
const TEACHING_TOOLS_BY_HREF: Record<string, { group: NavGroup; label: string; icon: string }> = {
  "/instructor/lesson-design-studio": { group: "Teaching", label: "Lesson Design Studio", icon: "🎨" },
  "/lesson-plans": { group: "Teaching", label: "Lesson Plans", icon: "📋" },
  "/instructor/lesson-plans/templates": { group: "Teaching", label: "Plan Templates", icon: "📄" },
  "/instructor/workspace": { group: "Teaching", label: "Instructor Workspace", icon: "🧩" },
  "/instructor/curriculum-builder": { group: "Teaching", label: "Curriculum Builder", icon: "🛠" },
  "/instructor/class-settings": { group: "Teaching", label: "Class Settings", icon: "⚙" },
  "/instructor/peer-observation": { group: "Teaching", label: "Peer Observation", icon: "👁" },
};

/** Full sidebar order (excluding Home `/`, which lives in Top Tools). */
export const INSTRUCTOR_SIDEBAR_LINK_ORDER: string[] = [
  "/instructor-training",
  "/attendance",
  "/interviews",
  "/instructor/lesson-design-studio",
  "/lesson-plans",
  "/instructor/lesson-plans/templates",
  "/instructor/workspace",
  "/instructor/curriculum-builder",
  "/instructor/class-settings",
  "/instructor/peer-observation",
  "/instructor/parent-feedback",
  "/instructor/mentee-health",
  "/peer-recognition",
  "/goals",
  "/reflection",
  "/events",
  "/calendar",
  "/my-program/schedule",
  "/messages",
  "/instructor/parent-messages",
  "/my-program",
  "/my-program/achievement-journey",
  "/college-advisor/activities",
  "/profile",
  "/profile/timeline",
  "/profile/xp",
  "/settings/personalization",
  "/notifications",
];

const BASE_ALLOWED = new Set<string>([
  "/",
  ...INSTRUCTOR_SIDEBAR_LINK_ORDER.filter((h) => !INSTRUCTOR_TEACHING_TOOLS_HREFS.includes(h)),
]);

export function getInstructorAllowedHrefs(enabledFeatureKeys: Set<string> | undefined): Set<string> {
  const next = new Set(BASE_ALLOWED);
  if (enabledFeatureKeys?.has("INSTRUCTOR_TEACHING_TOOLS")) {
    for (const h of INSTRUCTOR_TEACHING_TOOLS_HREFS) {
      next.add(h);
    }
  }
  return next;
}

export function instructorSidebarLinkOrderIndex(href: string): number {
  const i = INSTRUCTOR_SIDEBAR_LINK_ORDER.indexOf(href);
  return i === -1 ? 9999 : i;
}

function layoutEntryForHref(
  href: string,
  enabledFeatureKeys: Set<string> | undefined,
): { group: NavGroup; label: string; icon: string } | undefined {
  if (BASE_SIDEBAR_BY_HREF[href]) return BASE_SIDEBAR_BY_HREF[href];
  if (enabledFeatureKeys?.has("INSTRUCTOR_TEACHING_TOOLS") && TEACHING_TOOLS_BY_HREF[href]) {
    return TEACHING_TOOLS_BY_HREF[href];
  }
  return undefined;
}

export function applyInstructorSidebarLayout(
  link: NavLink,
  enabledFeatureKeys: Set<string> | undefined,
): NavLink {
  const mapped = layoutEntryForHref(link.href, enabledFeatureKeys);
  if (!mapped) return link;
  return {
    ...link,
    group: mapped.group,
    label: mapped.label,
    icon: mapped.icon,
  };
}
