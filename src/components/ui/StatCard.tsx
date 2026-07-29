import type { ReactNode } from "react";
import { Card } from "./Card";
import { IconBadge, type Tone } from "./IconBadge";
import { ProgressBar } from "./ProgressBar";

type StatCardProps = {
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone: Tone;
  percent?: number;
  delay?: number;
};

export function StatCard({ icon, label, value, sub, tone, percent, delay = 0 }: StatCardProps) {
  return (
    <Card className={`pq-fade-up${delay ? ` pq-delay-${delay}` : ""}`} style={{ padding: "18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <IconBadge tone={tone}>{icon}</IconBadge>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--subtext)", letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: "var(--font-head)", fontSize: 24, fontWeight: 700, color: "var(--text)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--faint)", marginTop: 6 }}>{sub}</div>}
      {percent !== undefined && <ProgressBar percent={percent} color={`var(--${tone})`} />}
    </Card>
  );
}
