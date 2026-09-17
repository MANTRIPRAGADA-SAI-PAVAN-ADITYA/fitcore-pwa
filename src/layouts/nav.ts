import type { LucideIcon } from "lucide-react";
import {
  Home,
  ClipboardList,
  TrendingUp,
  Pill,
  UserRound,
  Scale,
  Apple,
  Droplets,
  Dumbbell,
  Moon,
  Stethoscope,
  Ruler,
  ShieldAlert,
  Flame,
  Lightbulb,
  CalendarCheck,
  Settings,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** Fixed 5-item bottom navigation for mobile, per product spec. */
export const bottomNavItems: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/log", label: "Log", icon: ClipboardList },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/medication", label: "Medication", icon: Pill },
  { to: "/profile", label: "Profile", icon: UserRound },
];

/** Fuller navigation shown in the desktop sidebar. */
export const sidebarSections: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [
      { to: "/", label: "Home", icon: Home },
      { to: "/check-in", label: "Daily check-in", icon: CalendarCheck },
      { to: "/insights", label: "Insights", icon: Lightbulb },
      { to: "/weekly-review", label: "Weekly review", icon: TrendingUp },
    ],
  },
  {
    heading: "Log",
    items: [
      { to: "/weight", label: "Weight", icon: Scale },
      { to: "/nutrition", label: "Nutrition", icon: Apple },
      { to: "/water", label: "Water", icon: Droplets },
      { to: "/exercise", label: "Exercise", icon: Dumbbell },
      { to: "/sleep", label: "Sleep", icon: Moon },
      { to: "/measurements", label: "Measurements", icon: Ruler },
    ],
  },
  {
    heading: "Medication",
    items: [
      { to: "/medication", label: "Medication", icon: Pill },
      { to: "/symptoms", label: "Symptoms", icon: Stethoscope },
      { to: "/safety", label: "Safety & help", icon: ShieldAlert },
    ],
  },
  {
    heading: "Progress",
    items: [
      { to: "/progress", label: "Progress", icon: TrendingUp },
      { to: "/habits", label: "Habits", icon: Flame },
    ],
  },
  {
    heading: "You",
    items: [
      { to: "/profile", label: "Profile", icon: UserRound },
      { to: "/settings", label: "Settings & data", icon: Settings },
    ],
  },
];
