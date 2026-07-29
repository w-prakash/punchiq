import {
  Fingerprint, LayoutDashboard, ListChecks, Activity, BarChart3, CalendarClock,
} from "lucide-react";

export type NavItem = { id: string; label: string; icon: typeof LayoutDashboard };

export const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "input", label: "Biometric log", icon: Fingerprint },
  { id: "timeline", label: "Timeline & rules", icon: ListChecks },
  { id: "sessions", label: "Sessions", icon: Activity },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "history", label: "History", icon: CalendarClock },
];
