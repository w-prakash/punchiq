import { Card } from "./ui/Card";
import type { CalculationResult } from "../lib/types";
import { formatClock, formatDuration } from "../lib/time";

export function SessionTableCard({ result, nowMinutes }: { result: CalculationResult; nowMinutes: number }) {
  return (
    <Card id="sessions" className="pq-scroll" style={{ marginBottom: 16, overflowX: "auto" }}>
      <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, marginBottom: 14, color: "var(--text)" }}>Session table</div>
      <table className="pq-table" style={{ minWidth: 520 }}>
        <thead>
          <tr>
            {["Session", "IN", "OUT", "Worked", "Break after", "Status"].map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.sessions.map((s, i) => {
            const next = result.sessions[i + 1];
            const breakAfter = s.out !== null && next ? formatDuration(next.in - s.out) : "—";
            const worked = formatDuration((s.out ?? Math.round(nowMinutes)) - s.in);
            return (
              <tr key={i}>
                <td>#{i + 1}</td>
                <td>{formatClock(s.in)}</td>
                <td>{s.out !== null ? formatClock(s.out) : "Ongoing"}</td>
                <td>{worked}</td>
                <td>{breakAfter}</td>
                <td>
                  <span className="pq-badge" style={{ background: s.out !== null ? "var(--green-soft)" : "var(--amber-soft)", color: s.out !== null ? "var(--green)" : "var(--amber)" }}>
                    {s.out !== null ? "Complete" : "Ongoing"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
