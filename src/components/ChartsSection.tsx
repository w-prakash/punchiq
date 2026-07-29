import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import { FileText, FileSpreadsheet, Download, ChevronRight, Coffee } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import type { CalculationResult } from "../lib/types";
import { formatDuration, formatClock } from "../lib/time";
import { PALETTE, BREAK_COLORS_KEY, type Theme } from "../lib/theme";

type ChartsSectionProps = {
  theme: Theme;
  result: CalculationResult | null;
  weeklyChartData: { name: string; hours: number }[];
  sessionCount: number;
  onExportPdf: () => void;
  onExportCsv: (filename?: string) => void;
};

export function ChartsSection({ theme, result, weeklyChartData, sessionCount, onExportPdf, onExportCsv }: ChartsSectionProps) {
  const c = PALETTE[theme];

  return (
    <div id="analytics" className="pq-grid-charts" style={{ marginBottom: 16 }}>
      <Card>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, marginBottom: 14, color: "var(--text)" }}>Work hours overview</div>
        {weeklyChartData.length ? (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <AreaChart data={weeklyChartData} margin={{ left: -18, top: 6 }}>
                <defs>
                  <linearGradient id="pqAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c.violet} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={c.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={c.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: c.subtext, fontSize: 11, fontFamily: "Inter" }} axisLine={{ stroke: c.border }} tickLine={false} />
                <YAxis tick={{ fill: c.subtext, fontSize: 11, fontFamily: "Inter" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: c.panelSolid, border: `1px solid ${c.border}`, borderRadius: 8, fontFamily: "Inter", fontSize: 12 }} labelStyle={{ color: c.text }} formatter={(v) => [`${v}h`, "Worked"]} />
                <Area type="monotone" dataKey="hours" stroke={c.violet} strokeWidth={2.5} fill="url(#pqAreaFill)" dot={{ r: 3.5, fill: c.violet, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--faint)" }}>Run a calculation to build history</div>
        )}
      </Card>

      <Card>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, marginBottom: 14, color: "var(--text)" }}>Break distribution</div>
        {result && result.breakSegments.length ? (
          <>
            <div style={{ width: "100%", height: 150, position: "relative" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={result.breakSegments} dataKey="duration" nameKey="from" innerRadius={42} outerRadius={68} paddingAngle={3}>
                    {result.breakSegments.map((_, i) => <Cell key={i} fill={c[BREAK_COLORS_KEY[i % BREAK_COLORS_KEY.length]]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: c.panelSolid, border: `1px solid ${c.border}`, borderRadius: 8, fontFamily: "Inter", fontSize: 12 }} formatter={(value) => [formatDuration(Number(value ?? 0)), "Break"]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 17, color: "var(--text)" }}>{formatDuration(result.breakMinutes)}</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--faint)" }}>Total break</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {result.breakSegments.map((seg, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--subtext)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: `var(--${BREAK_COLORS_KEY[i % BREAK_COLORS_KEY.length]})`, display: "inline-block" }} />
                    Break {i + 1} ({formatClock(seg.from)}–{formatClock(seg.to)})
                  </span>
                  <span style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>{formatDuration(seg.duration)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--faint)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Coffee size={14} /> No breaks logged yet</span>
          </div>
        )}
      </Card>

      <Card style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Sessions</div>
        <div style={{ fontFamily: "var(--font-head)", fontSize: 30, fontWeight: 700, color: "var(--text)", marginTop: 6 }}>{sessionCount}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--faint)", marginBottom: 16 }}>Total sessions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
          <Button variant="pill" onClick={onExportPdf} style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><FileText size={13} /> Export PDF</span><ChevronRight size={13} color="var(--faint)" />
          </Button>
          <Button variant="pill" onClick={() => onExportCsv("punchiq-history.xls")} style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><FileSpreadsheet size={13} /> Export Excel</span><ChevronRight size={13} color="var(--faint)" />
          </Button>
          <Button variant="pill" onClick={() => onExportCsv()} style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Download size={13} /> Export CSV</span><ChevronRight size={13} color="var(--faint)" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
