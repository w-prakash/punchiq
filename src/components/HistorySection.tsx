import { Activity, Coffee, CheckCircle2, Search, ArrowUpDown, Trash2, Copy, FileText, FileSpreadsheet, Download, ChevronRight } from "lucide-react";
import { Card } from "./ui/Card";
import { StatCard } from "./ui/StatCard";
import { Button } from "./ui/Button";
import type { HistoryRow, WorkStatus } from "../lib/types";
import { formatDuration } from "../lib/time";
import type { Tone } from "./ui/IconBadge";

type HistorySectionProps = {
  history: HistoryRow[];
  avgWorked: number;
  avgBreak: number;
  avgCompliance: number;
  historyQuery: string;
  setHistoryQuery: (v: string) => void;
  sortDesc: boolean;
  setSortDesc: (updater: (v: boolean) => boolean) => void;
  filteredHistory: HistoryRow[];
  visibleHistory: HistoryRow[];
  showAllHistory: boolean;
  setShowAllHistory: (updater: (v: boolean) => boolean) => void;
  onDeleteRow: (id: number) => void;
  statusTone: (status: WorkStatus) => Tone;
  onCopySummary: () => void;
  onExportPdf: () => void;
  onExportCsv: (filename?: string) => void;
  copyMsg: string;
};

export function HistorySection({
  history, avgWorked, avgBreak, avgCompliance, historyQuery, setHistoryQuery, sortDesc, setSortDesc,
  filteredHistory, visibleHistory, showAllHistory, setShowAllHistory, onDeleteRow, statusTone,
  onCopySummary, onExportPdf, onExportCsv, copyMsg,
}: HistorySectionProps) {
  return (
    <div id="history">
      {history.length > 0 && (
        <div className="pq-grid-avg" style={{ marginBottom: 16 }}>
          <StatCard icon={<Activity size={16} />} label="Avg worked / day" tone="violet" value={formatDuration(avgWorked)} />
          <StatCard icon={<Coffee size={16} />} label="Avg break / day" tone="amber" value={formatDuration(avgBreak)} sub={`Across ${history.length} logged day${history.length > 1 ? "s" : ""}`} />
          <StatCard icon={<CheckCircle2 size={16} />} label="Avg compliance" tone="green" value={`${avgCompliance}%`} />
        </div>
      )}

      <div className="pq-grid-history">
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Monthly history</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px" }}>
                <Search size={13} color="var(--faint)" />
                <input value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} placeholder="Search date or status" style={{ background: "transparent", border: "none", outline: "none", color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 12.5, width: 140 }} />
              </div>
              <Button variant="pill" onClick={() => setSortDesc((s) => !s)}><ArrowUpDown size={12} /> {sortDesc ? "Newest" : "Oldest"}</Button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div style={{ padding: "30px 0", textAlign: "center", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--faint)" }}>No history yet — run a calculation to log today's entry.</div>
          ) : (
            <>
              <div className="pq-scroll" style={{ overflowX: "auto" }}>
                <table className="pq-table" style={{ minWidth: 560 }}>
                  <thead>
                    <tr>
                      {["Date", "Check in", "Worked", "Break", "Logout", "Status", "Compliance", ""].map((h) => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleHistory.map((h) => (
                      <tr key={h.id}>
                        <td>{h.date}</td>
                        <td>{h.checkIn}</td>
                        <td>{h.worked}</td>
                        <td>{h.breakMin}</td>
                        <td>{h.logout}</td>
                        <td>
                          <span className="pq-badge" style={{ background: `var(--${statusTone(h.status)}-soft)`, color: `var(--${statusTone(h.status)})` }}>{h.status}</span>
                        </td>
                        <td>{h.compliance}%</td>
                        <td>
                          <button className="pq-btn" onClick={() => onDeleteRow(h.id)} style={{ background: "none", border: "none", color: "var(--red)", display: "flex" }}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredHistory.length > 5 && (
                <button className="pq-btn" onClick={() => setShowAllHistory((s) => !s)} style={{ marginTop: 12, background: "none", border: "none", color: "var(--violet)", fontFamily: "var(--font-body)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 5 }}>
                  {showAllHistory ? "Show less" : `View all history (${filteredHistory.length})`} <ChevronRight size={13} />
                </button>
              )}
            </>
          )}
        </Card>

        <Card>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, marginBottom: 4, color: "var(--text)" }}>Export & share</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--faint)", marginBottom: 16 }}>Download or share today's summary</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Button variant="primary" onClick={onCopySummary} style={{ fontSize: 13, padding: "10px 13px" }}>
              <Copy size={14} /> Copy summary
            </Button>
            <Button variant="pill" onClick={onExportPdf} style={{ justifyContent: "flex-start" }}><FileText size={13} /> Export PDF</Button>
            <Button variant="pill" onClick={() => onExportCsv("punchiq-history.xls")} style={{ justifyContent: "flex-start" }}><FileSpreadsheet size={13} /> Export Excel</Button>
            <Button variant="pill" onClick={() => onExportCsv()} style={{ justifyContent: "flex-start" }}><Download size={13} /> Export CSV</Button>
          </div>
          {copyMsg && <div style={{ marginTop: 10, fontFamily: "var(--font-body)", fontSize: 12, color: "var(--violet)" }}>{copyMsg}</div>}
        </Card>
      </div>
    </div>
  );
}
