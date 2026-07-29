import { LogIn, Activity, Coffee, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IconBadge } from "./IconBadge";
import { formatClock, formatDuration } from "../../lib/time";
import type { TimelineSegment } from "../../lib/types";
import type { AccentColor } from "../../lib/theme";

const TIMELINE_STYLE = {
  checkin: { tone: "green" as AccentColor, icon: LogIn },
  "checkin-work": { tone: "green" as AccentColor, icon: Activity },
  resume: { tone: "green" as AccentColor, icon: Activity },
  break: { tone: "amber" as AccentColor, icon: Coffee },
  checkout: { tone: "violet" as AccentColor, icon: CheckCircle2 },
} satisfies Record<TimelineSegment["type"], { tone: AccentColor; icon: LucideIcon }>;

export function TimelineRow({ seg }: { seg: TimelineSegment }) {
  const meta = TIMELINE_STYLE[seg.type];
  const Icon = meta.icon;
  let title: string;
  let right: string | null = null;
  if (seg.type === "checkin" || seg.type === "checkout") {
    title = `${seg.type === "checkin" ? "Check in" : "Check out"} — ${formatClock(seg.time)}`;
  } else if (seg.type === "break") {
    title = `Break — ${formatClock(seg.from)} to ${formatClock(seg.to)}`;
    right = formatDuration(seg.to - seg.from);
  } else {
    title = `${seg.type === "checkin-work" ? "Working" : "Resume"} — ${formatClock(seg.from)} to ${seg.ongoing ? "now" : formatClock(seg.to)}`;
    right = `Worked ${formatDuration(seg.to - seg.from)}`;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <IconBadge tone={meta.tone} size={26} radius={13}><Icon size={13} /></IconBadge>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--text)", whiteSpace: "nowrap" }}>{title}</span>
      </div>
      {right && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--faint)", whiteSpace: "nowrap" }}>{right}</span>}
    </div>
  );
}
