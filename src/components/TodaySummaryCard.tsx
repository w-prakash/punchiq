import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card } from "./ui/Card";
import { ProgressRing } from "./ui/ProgressRing";
import type { CalculationResult } from "../lib/types";
import { formatClock, formatDuration } from "../lib/time";

type TodaySummaryCardProps = {
  result: CalculationResult | null;
  ringPercent: number;
};

export function TodaySummaryCard({ result, ringPercent }: TodaySummaryCardProps) {
  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Today's summary</span>
        {result && (
          <span className="pq-badge" style={{ background: result.compliance === 100 ? "var(--green-soft)" : "var(--amber-soft)", color: result.compliance === 100 ? "var(--green)" : "var(--amber)" }}>
            <ShieldCheck size={11} /> {result.compliance === 100 ? "Policy compliant" : "Needs attention"}
          </span>
        )}
      </div>

      {result ? (
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 160px", minWidth: 0 }}>
            {[
              ["Check in", formatClock(result.checkIn)],
              ["Worked", formatDuration(result.workedMinutes)],
              ["Break", formatDuration(result.breakMinutes)],
              ["Remaining", formatDuration(result.remaining)],
              ["Sessions", result.sessions.length],
              ["Office duration", formatDuration(result.officeEnd - result.officeStart)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--subtext)" }}>{label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text)" }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "center", flex: "0 0 auto" }}>
            <ProgressRing percent={ringPercent} color={result.targetPercent >= 100 ? "var(--green)" : "var(--violet)"} />
          </div>
        </div>
      ) : (
        <div style={{ padding: "30px 0", textAlign: "center", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--faint)" }}>
          Calculate today's log to see your summary
        </div>
      )}

      {result && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: result.completed ? "var(--green-soft)" : "var(--amber-soft)" }}>
          {result.completed ? <CheckCircle2 size={16} color="var(--green)" /> : <AlertTriangle size={16} color="var(--amber)" />}
          <span style={{ fontFamily: "var(--font-body)", fontSize: 12.5, color: result.completed ? "var(--green)" : "var(--amber)" }}>
            {result.completed ? "You've completed your work hours for today." : `${formatDuration(result.remaining)} left to reach today's target.`}
          </span>
        </div>
      )}
    </Card>
  );
}
