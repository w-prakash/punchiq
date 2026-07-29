import { CheckCircle2, XCircle } from "lucide-react";
import { IconBadge } from "./IconBadge";
import type { Rule } from "../../lib/types";

export function RuleRow({ rule }: { rule: Rule }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid var(--border)", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <IconBadge tone={rule.pass ? "green" : "red"} size={26} radius={13}>
          {rule.pass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        </IconBadge>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, color: "var(--text)" }}>{rule.label}</span>
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: rule.pass ? "var(--green)" : "var(--red)", whiteSpace: "nowrap" }}>{rule.detail}</span>
    </div>
  );
}
