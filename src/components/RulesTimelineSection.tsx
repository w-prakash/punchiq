import { ListChecks } from "lucide-react";
import { Card } from "./ui/Card";
import { RuleRow } from "./ui/RuleRow";
import { TimelineRow } from "./ui/TimelineRow";
import type { CalculationResult } from "../lib/types";

export function RulesTimelineSection({ result }: { result: CalculationResult }) {
  return (
    <div id="timeline" className="pq-grid-rules pq-fade-up" style={{ marginBottom: 16 }}>
      <Card>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
          <ListChecks size={16} color="var(--violet)" /> Rule validation
        </div>
        {result.rules.map((r) => <RuleRow key={r.key} rule={r} />)}
      </Card>

      <Card className="pq-scroll" style={{ overflowX: "auto" }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, marginBottom: 6, color: "var(--text)" }}>Today's timeline</div>
        {result.timeline.map((seg, i) => <TimelineRow key={i} seg={seg} />)}
      </Card>
    </div>
  );
}
