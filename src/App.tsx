import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { KeyboardEvent } from "react";

import { PALETTE, type Theme } from "./lib/theme";
import { paletteToCssVars } from "./lib/cssVars";
import { useCountUp } from "./lib/useCountUp";
import { celebrateSuccess } from "./lib/confetti";
import {
  formatClock, formatDuration, todayLabel, parseBiometricLog, computeResult,
} from "./lib/time";
import type { Settings, CalculationResult, HistoryRow, WorkStatus } from "./lib/types";
import type { Tone } from "./components/ui/IconBadge";

import { Sidebar } from "./components/Sidebar";
import { NAV_ITEMS } from "./lib/navItems";
import { Topbar } from "./components/Topbar";
import { PolicyPanel } from "./components/PolicyPanel";
import { StatsGrid } from "./components/StatsGrid";
import { BiometricInputCard } from "./components/BiometricInputCard";
import { TodaySummaryCard } from "./components/TodaySummaryCard";
import { RulesTimelineSection } from "./components/RulesTimelineSection";
import { SessionTableCard } from "./components/SessionTableCard";
import { ChartsSection } from "./components/ChartsSection";
import { HistorySection } from "./components/HistorySection";
import { SuccessToast } from "./components/SuccessToast";

/* ---------------------------------------------------------------------- */
/*  Constants                                                              */
/* ---------------------------------------------------------------------- */

const LOADING_STEPS = ["Parsing biometric logs…", "Calculating work sessions…", "Computing work hours…", "Generating dashboard…"];
const SAMPLE_LOG = "11:02\nBiometric.\n11:09\nBiometric.\n11:11\nBiometric.\n12:52\nBiometric.\n13:33\nBiometric.\n17:00\nBiometric.\n17:01\nBiometric.\n20:12\nBiometric.";

/* ---------------------------------------------------------------------- */
/*  Main App                                                               */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [theme, setTheme] = useState<Theme>("dark");
  const c = PALETTE[theme];

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const nowMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [policyOpen, setPolicyOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    name: "", officeStart: "11:30", officeEnd: "20:30", requiredHours: "8", maxBreak: "60", latestCheckIn: "11:30",
  });

  const [logText, setLogText] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setErrorMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState("");

  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const handleCalculate = useCallback(() => {
    setErrorMsg(null);
    const timestamps = parseBiometricLog(logText);
    if (!timestamps.length) {
      setErrorMsg('Invalid biometric log format. Add lines like "11:02" (one timestamp per line).');
      setResult(null);
      return;
    }
    setIsCalculating(true);
    setResult(null);
    setProgress(0);
    setLoadingStep(0);
    celebrateSuccess();
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
    const totalDuration = 850;
    const stepDuration = totalDuration / LOADING_STEPS.length;
    LOADING_STEPS.forEach((_, i) => setTimeout(() => setLoadingStep(i), i * stepDuration));

    const startTs = Date.now();
    const progInterval = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startTs) / totalDuration) * 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(progInterval);
    }, 30);

    setTimeout(() => {
      const computed = computeResult(timestamps, settings, Math.round(nowMinutes));
      if ("error" in computed) {
        setErrorMsg(computed.error);
        setIsCalculating(false);
        return;
      }
      setResult(computed);
      setIsCalculating(false);

      setHistory((h) => [
        {
          id: Date.now(), date: todayLabel(), checkIn: formatClock(computed.checkIn),
          worked: formatDuration(computed.workedMinutes), workedMinutes: computed.workedMinutes,
          breakMin: formatDuration(computed.breakMinutes), breakMinutes: computed.breakMinutes,
          logout: formatClock(computed.lastOut ?? computed.expectedLogout),
          status: computed.status, compliance: computed.compliance,
        },
        ...h,
      ]);
    }, totalDuration + 50);
  }, [logText, settings, nowMinutes]);

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCalculate();
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setLogText(text);
    } catch {
      setErrorMsg("Couldn't read from clipboard — paste manually with Ctrl/Cmd+V.");
    }
  }

  function summaryText() {
    if (!result) return "";
    return [
      `PunchIQ Summary — ${todayLabel()}`,
      `Check in: ${formatClock(result.checkIn)}`,
      `Worked: ${formatDuration(result.workedMinutes)}`,
      `Break: ${formatDuration(result.breakMinutes)}`,
      `Remaining: ${formatDuration(result.remaining)}`,
      `Expected logout: ${formatClock(result.expectedLogout)}`,
      `Status: ${result.status}`,
      `Compliance: ${result.compliance}%`,
    ].join("\n");
  }

  function handleCopySummary() {
    if (!result) return;
    navigator.clipboard.writeText(summaryText())
      .then(() => { setCopyMsg("Copied!"); setTimeout(() => setCopyMsg(""), 1800); })
      .catch(() => setCopyMsg("Copy failed"));
  }

  function handleExportCsv(filename = "punchiq-history.csv") {
    if (!history.length) { setCopyMsg("No history to export"); setTimeout(() => setCopyMsg(""), 1800); return; }
    const header = "Date,Check In,Worked,Break,Logout,Status,Compliance %";
    const rows = history.map((h) => `${h.date},${h.checkIn},${h.worked},${h.breakMin},${h.logout},${h.status},${h.compliance}`);
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    if (!result) { setCopyMsg("Run a calculation first"); setTimeout(() => setCopyMsg(""), 1800); return; }
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<pre style="font-family:monospace;font-size:14px;white-space:pre-wrap;">${summaryText()}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  }

  function deleteHistoryRow(id: number) {
    setHistory((h) => h.filter((r) => r.id !== id));
  }

  const filteredHistory = useMemo(() => {
    let rows = history.filter((r) => r.date.toLowerCase().includes(historyQuery.toLowerCase()) || r.status.toLowerCase().includes(historyQuery.toLowerCase()));
    rows = rows.sort((a, b) => (sortDesc ? b.id - a.id : a.id - b.id));
    return rows;
  }, [history, historyQuery, sortDesc]);

  const visibleHistory = showAllHistory ? filteredHistory : filteredHistory.slice(0, 5);

  const weeklyChartData = useMemo(
    () => history.slice(0, 7).reverse().map((h) => ({ name: h.date.split(",")[0], hours: +(h.workedMinutes / 60).toFixed(2) })),
    [history]
  );

  const workedCount = useCountUp(result ? result.workedMinutes : 0);
  const remainingCount = useCountUp(result ? result.remaining : 0);
  const breakCount = useCountUp(result ? result.breakMinutes : 0);
  const ringPercent = useCountUp(result ? result.targetPercent : 0);

  const avgWorked = history.length ? history.reduce((s, h) => s + h.workedMinutes, 0) / history.length : 0;
  const avgBreak = history.length ? history.reduce((s, h) => s + (h.breakMinutes || 0), 0) / history.length : 0;
  const avgCompliance = history.length ? Math.round(history.reduce((s, h) => s + h.compliance, 0) / history.length) : 0;

  const statusTone = useCallback((status: WorkStatus): Tone => (status === "Working" ? "green" : status === "Completed" ? "violet" : "amber"), []);

  // Track which section is in view for the sidebar's active-link highlight.
  useEffect(() => {
    const sections = NAV_ITEMS.map((n) => document.getElementById(n.id)).filter((el): el is HTMLElement => !!el);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [result, history.length]);

  function handleNavigate(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileSidebarOpen(false);
  }

  return (
    <div className="pq-app" style={paletteToCssVars(c)}>
      <div className="pq-layout">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          mobileOpen={mobileSidebarOpen}
        />
        {mobileSidebarOpen && <div className="pq-overlay-backdrop" onClick={() => setMobileSidebarOpen(false)} />}

        <div className="pq-main">
          <Topbar
            theme={theme}
            setTheme={setTheme}
            now={now}
            greeting={greeting}
            name={settings.name}
            result={result}
            searchValue={historyQuery}
            onSearch={(q) => { setHistoryQuery(q); handleNavigate("history"); }}
            onOpenPolicy={() => setPolicyOpen(true)}
            onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
          />

          <div className="pq-content">
            <div id="overview">
              <PolicyPanel settings={settings} onChange={setSettings} open={policyOpen} onToggle={() => setPolicyOpen((o) => !o)} />

              <StatsGrid
                result={result}
                workedCount={workedCount}
                remainingCount={remainingCount}
                breakCount={breakCount}
                nowMinutes={nowMinutes}
                statusTone={statusTone}
              />

              <div className="pq-grid-2" style={{ marginBottom: 16 }}>
                <BiometricInputCard
                  logText={logText}
                  setLogText={setLogText}
                  onKeyDown={handleTextareaKeyDown}
                  onPaste={handlePaste}
                  error={error}
                  isCalculating={isCalculating}
                  onCalculate={handleCalculate}
                  onClear={() => { setLogText(""); setResult(null); setErrorMsg(null); }}
                  onSample={() => { setLogText(SAMPLE_LOG); setErrorMsg(null); }}
                  progress={progress}
                  loadingStep={LOADING_STEPS[loadingStep]}
                />
                <TodaySummaryCard result={result} ringPercent={ringPercent} />
              </div>
            </div>

            {result && (
              <div ref={resultsRef}>
                <RulesTimelineSection result={result} />
                <SessionTableCard result={result} nowMinutes={nowMinutes} />
              </div>
            )}

            <ChartsSection
              theme={theme}
              result={result}
              weeklyChartData={weeklyChartData}
              sessionCount={result ? result.sessions.length : 0}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
            />

            <HistorySection
              history={history}
              avgWorked={avgWorked}
              avgBreak={avgBreak}
              avgCompliance={avgCompliance}
              historyQuery={historyQuery}
              setHistoryQuery={setHistoryQuery}
              sortDesc={sortDesc}
              setSortDesc={setSortDesc}
              filteredHistory={filteredHistory}
              visibleHistory={visibleHistory}
              showAllHistory={showAllHistory}
              setShowAllHistory={setShowAllHistory}
              onDeleteRow={deleteHistoryRow}
              statusTone={statusTone}
              onCopySummary={handleCopySummary}
              onExportPdf={handleExportPdf}
              onExportCsv={handleExportCsv}
              copyMsg={copyMsg}
            />

            <div style={{ textAlign: "center", marginTop: 26, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--faint)" }}>
              All data is stored locally in your browser. Nothing is sent to a server.
            </div>
          </div>
        </div>
      </div>

      <SuccessToast show={showSuccess} />
    </div>
  );
}
