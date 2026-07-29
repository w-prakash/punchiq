import { Activity, TimerReset, Coffee, LogOut, ShieldCheck } from "lucide-react";
import { StatCard } from "./ui/StatCard";
import type { CalculationResult, WorkStatus } from "../lib/types";
import { formatDuration, formatClock } from "../lib/time";
import type { Tone } from "./ui/IconBadge";

type StatsGridProps = {
  result: CalculationResult | null;
  workedCount: number;
  remainingCount: number;
  breakCount: number;
  nowMinutes: number;
  statusTone: (status: WorkStatus) => Tone;
};

export function StatsGrid({ result, workedCount, remainingCount, breakCount, nowMinutes, statusTone }: StatsGridProps) {
  return (
    <div className="pq-grid-stats" style={{ marginBottom: 18 }}>
      <StatCard
        icon={<Activity size={17} />} label="Worked today" tone="violet" delay={1}
        value={result ? formatDuration(workedCount) : "—"}
        sub={result ? `of ${formatDuration(result.requiredMinutes)} target` : "Run a calculation"}
        percent={result ? result.targetPercent : 0}
      />
      <StatCard
        icon={<TimerReset size={17} />} label="Remaining time" tone="blue" delay={2}
        value={result ? formatDuration(remainingCount) : "—"}
        sub={result && result.extra > 0 ? `${formatDuration(result.extra)} extra worked` : result ? "until target reached" : "—"}
        percent={result ? 100 - Math.min(100, (result.remaining / (result.requiredMinutes || 1)) * 100) : 0}
      />
      <StatCard
        icon={<Coffee size={17} />} label="Break time" tone="amber" delay={3}
        value={result ? formatDuration(breakCount) : "—"}
        sub={result ? `limit ${formatDuration(result.maxBreak)}` : "—"}
        percent={result ? Math.min(100, (result.breakMinutes / (result.maxBreak || 1)) * 100) : 0}
      />
      <StatCard
        icon={<LogOut size={17} />} label="Expected logout" tone="green" delay={4}
        value={result ? formatClock(result.expectedLogout) : "—"}
        sub={result ? `${formatDuration(Math.max(0, result.expectedLogout - Math.round(nowMinutes)))} remaining` : "—"}
        percent={result ? result.targetPercent : 0}
      />
      <StatCard
        icon={<ShieldCheck size={17} />} label="Status" tone={result ? statusTone(result.status) : "amber"} delay={5}
        value={result ? result.status : "Idle"}
        sub={result ? `${result.compliance}% policy compliant` : "Awaiting log"}
        percent={result ? result.compliance : 0}
      />
    </div>
  );
}
