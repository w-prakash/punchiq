import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Settings2, Sun, Moon, Play, Trash2, Copy, Download,
  CheckCircle2, XCircle, Coffee, LogIn, LogOut, AlertTriangle,
  ClipboardPaste, Loader2, Activity, Search, ArrowUpDown,
  TimerReset, Fingerprint, Bell, ShieldCheck, FileText, FileSpreadsheet,
  Sparkles, ChevronRight, ListChecks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import confetti from "canvas-confetti";
/* ---------------------------------------------------------------------- */
/*  Helpers                                                                */
/* ---------------------------------------------------------------------- */

type Settings = {
  name: string;
  officeStart: string;
  officeEnd: string;
  requiredHours: string;
  maxBreak: string;
  latestCheckIn: string;
};

type Session = { in: number; out: number | null };
type WorkStatus = "Working" | "Completed" | "Incomplete";
type Rule = { key: string; label: string; pass: boolean; detail: string };
type PointSegment = { type: "checkin"; time: number } | { type: "checkout"; time: number };
type WorkSegment = { type: "checkin-work" | "resume"; from: number; to: number; ongoing: boolean };
type BreakSegment = { type: "break"; from: number; to: number };
type TimelineSegment = PointSegment | WorkSegment | BreakSegment;
type BreakSegmentWithDuration = BreakSegment & { duration: number };

type CalculationResult = {
  sessions: Session[];
  checkIn: number;
  lastOut: number | null;
  isOngoing: boolean;
  workedMinutes: number;
  breakMinutes: number;
  expectedLogout: number;
  remaining: number;
  extra: number;
  completed: boolean;
  status: WorkStatus;
  rules: Rule[];
  compliance: number;
  timeline: TimelineSegment[];
  breakSegments: BreakSegmentWithDuration[];
  requiredMinutes: number;
  maxBreak: number;
  officeStart: number;
  officeEnd: number;
  targetPercent: number;
};

type HistoryRow = {
  id: number;
  date: string;
  checkIn: string;
  worked: string;
  workedMinutes: number;
  breakMin: string;
  breakMinutes: number;
  logout: string;
  status: WorkStatus;
  compliance: number;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatClock(minsRaw: number) {
  const mins = ((Math.round(minsRaw) % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad2(m)} ${period}`;
}

function formatDuration(minsRaw: number) {
  const mins = Math.max(0, Math.round(minsRaw));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function todayLabel(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function fullDateLabel(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** Parse raw biometric log text into a sorted, de-duplicated list of minute-of-day values. */
function parseBiometricLog(text: string) {
  const lines = text.split("\n");
  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const found: number[] = [];
  for (const raw of lines) {
    const line = raw.trim().replace(/\.$/, "");
    if (!line) continue;
    if (/^biometric\.?$/i.test(line)) continue;
    const m = line.match(timeRegex);
    if (!m) continue;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (h >= 0 && h <= 23 && mm >= 0 && mm <= 59) {
      found.push(h * 60 + mm);
    }
  }
  const unique = Array.from(new Set(found)).sort((a, b) => a - b);
  return unique;
}

function buildSessions(timestamps: number[]) {
  const sessions: Session[] = [];
  for (let i = 0; i < timestamps.length; i += 2) {
    sessions.push({ in: timestamps[i], out: timestamps[i + 1] ?? null });
  }
  return sessions;
}

function computeResult(timestamps: number[], settings: Settings, nowMinutes: number): CalculationResult | { error: string } {
  if (!timestamps.length) {
    return { error: "No valid biometric timestamps found. Check the log format." };
  }

  const sessions = buildSessions(timestamps);
  const requiredMinutes = Math.round(parseFloat(settings.requiredHours || "0") * 60);
  const maxBreak = parseInt(settings.maxBreak || "0", 10);
  const officeStart = toMinutes(settings.officeStart);
  const officeEnd = toMinutes(settings.officeEnd);
  const latestCheckIn = toMinutes(settings.latestCheckIn);

  const checkIn = sessions[0]!.in;
  const lastSession = sessions[sessions.length - 1]!;
  const isOngoing = lastSession.out === null;
  const lastOut = isOngoing ? null : lastSession.out;

  let workedMinutes = 0;
  let breakMinutes = 0;

  sessions.forEach((s, idx) => {
    const sessionEnd = s.out ?? Math.max(nowMinutes, s.in);
    workedMinutes += Math.max(0, sessionEnd - s.in);
    const next = sessions[idx + 1];
    if (s.out !== null && next) breakMinutes += Math.max(0, next.in - s.out);
  });

  const expectedLogout = checkIn + requiredMinutes + breakMinutes;
  const remaining = Math.max(0, requiredMinutes - workedMinutes);
  const extra = Math.max(0, workedMinutes - requiredMinutes);
  const completed = workedMinutes >= requiredMinutes;
  const targetPercent = requiredMinutes > 0 ? Math.round((workedMinutes / requiredMinutes) * 100) : 0;

  let status: WorkStatus;
  if (isOngoing) status = "Working";
  else if (completed) status = "Completed";
  else status = "Incomplete";

  const rules = [
    { key: "checkin", label: `Started before ${formatClock(latestCheckIn)}`, pass: checkIn <= latestCheckIn, detail: formatClock(checkIn) },
    { key: "hours", label: `Worked ${formatDuration(requiredMinutes)}`, pass: completed, detail: formatDuration(workedMinutes) },
    { key: "break", label: `Break within ${formatDuration(maxBreak)} limit`, pass: breakMinutes <= maxBreak, detail: formatDuration(breakMinutes) },
    { key: "logout", label: `Logout before ${formatClock(officeEnd)}`, pass: (lastOut ?? expectedLogout) <= officeEnd, detail: formatClock(lastOut ?? expectedLogout) },
  ];

  const compliance = Math.round((rules.filter((r) => r.pass).length / rules.length) * 100);

  const timeline: TimelineSegment[] = [];
  timeline.push({ type: "checkin", time: checkIn });
  sessions.forEach((s, idx) => {
    timeline.push({ type: idx === 0 ? "checkin-work" : "resume", from: s.in, to: s.out ?? nowMinutes, ongoing: s.out === null });
    const next = sessions[idx + 1];
    if (s.out !== null && next) timeline.push({ type: "break", from: s.out, to: next.in });
  });
  if (lastOut !== null) timeline.push({ type: "checkout", time: lastOut });

  const breakSegments = timeline
    .filter((segment): segment is BreakSegment => segment.type === "break")
    .map((segment) => ({ ...segment, duration: segment.to - segment.from }));

  return {
    sessions, checkIn, lastOut, isOngoing, workedMinutes, breakMinutes, expectedLogout,
    remaining, extra, completed, status, rules, compliance, timeline, breakSegments,
    requiredMinutes, maxBreak, officeStart, officeEnd, targetPercent,
  };
}

/* ---------------------------------------------------------------------- */
/*  Theme palette                                                          */
/* ---------------------------------------------------------------------- */

const PALETTE = {
  dark: {
    pageBg: "#0A0913", pageGrid: "rgba(139,92,246,0.06)",
    panel: "rgba(22,19,36,0.62)", panelSolid: "#16132a",
    border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.16)",
    text: "#EDEAF8", subtext: "#948FAE", faint: "#5C5878",
    violet: "#8B5CF6", violetSoft: "rgba(139,92,246,0.16)", violetDark: "#6D28D9",
    blue: "#4F9EF8", blueSoft: "rgba(79,158,248,0.16)",
    amber: "#F5A524", amberSoft: "rgba(245,165,36,0.16)",
    green: "#2FD98A", greenSoft: "rgba(47,217,138,0.16)",
    red: "#FB7A6C", redSoft: "rgba(251,122,108,0.16)",
    teal: "#2DD4BF", tealSoft: "rgba(45,212,191,0.16)",
    inputBg: "rgba(255,255,255,0.045)",
  },
  light: {
    pageBg: "#F4F2FA", pageGrid: "rgba(109,40,217,0.05)",
    panel: "rgba(255,255,255,0.8)", panelSolid: "#FFFFFF",
    border: "rgba(30,20,60,0.09)", borderStrong: "rgba(30,20,60,0.17)",
    text: "#161127", subtext: "#645E7C", faint: "#9993AF",
    violet: "#7C3AED", violetSoft: "rgba(124,58,237,0.10)", violetDark: "#6D28D9",
    blue: "#2563EB", blueSoft: "rgba(37,99,235,0.10)",
    amber: "#C2760A", amberSoft: "rgba(194,118,10,0.10)",
    green: "#0E9F6E", greenSoft: "rgba(14,159,110,0.10)",
    red: "#DC4C3F", redSoft: "rgba(220,76,63,0.10)",
    teal: "#0D9488", tealSoft: "rgba(13,148,136,0.10)",
    inputBg: "rgba(30,20,60,0.035)",
  },
};

type Theme = keyof typeof PALETTE;
type Palette = (typeof PALETTE)[Theme];
type AccentColor = "green" | "amber" | "violet";
type BreakColorKey = "violet" | "blue" | "amber" | "teal";

const FONT_HEAD = "'Space Grotesk', 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', 'Segoe UI', sans-serif";
const FONT_MONO = "'JetBrains Mono', 'SFMono-Regular', monospace";

/* ---------------------------------------------------------------------- */
/*  Small building blocks                                                  */
/* ---------------------------------------------------------------------- */

function useCountUp(target: number, duration = 650) {
  const [val, setVal] = useState(0);
  const prevTarget = useRef(0);
  useEffect(() => {
    const from = prevTarget.current;
    const to = target;
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(from + (to - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
      else prevTarget.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return val;
}

type CardProps = HTMLAttributes<HTMLDivElement> & { c: Palette };

function Card({ c, children, style, ...rest }: CardProps) {
  return (
    <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 16, backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", ...style }} {...rest}>
      {children}
    </div>
  );
}

type IconBadgeProps = {
  color: string;
  colorSoft: string;
  size?: number;
  radius?: number;
  children: ReactNode;
};

function IconBadge({ color, colorSoft, size = 34, radius = 10, children }: IconBadgeProps) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, display: "flex", alignItems: "center", justifyContent: "center", background: colorSoft, color, flexShrink: 0 }}>
      {children}
    </div>
  );
}

type ProgressRingProps = { c: Palette; percent: number; size?: number; stroke?: number; color: string };

function ProgressRing({ c, percent, size = 148, stroke = 11, color }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 100));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={c.border} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 25, color: c.text }}>{Math.round(percent)}%</span>
        <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: c.faint, textAlign: "center", lineHeight: 1.3, maxWidth: 80 }}>of daily target</span>
      </div>
    </div>
  );
}

function ProgressBar({ c, percent, color }: { c: Palette; percent: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 4, background: c.border, overflow: "hidden", marginTop: 12 }}>
      <div style={{ height: "100%", width: `${Math.max(2, Math.min(100, percent))}%`, background: color, transition: "width .8s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

type StatCardProps = {
  c: Palette;
  icon: ReactNode;
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  color: string;
  colorSoft: string;
  percent?: number;
};

function StatCard({ c, icon, label, value, sub, color, colorSoft, percent }: StatCardProps) {
  return (
    <Card c={c} style={{ padding: "18px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <IconBadge color={color} colorSoft={colorSoft}>{icon}</IconBadge>
        <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: c.subtext, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontFamily: FONT_HEAD, fontSize: 24, fontWeight: 700, color: c.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: c.faint, marginTop: 6 }}>{sub}</div>}
      {percent !== undefined && <ProgressBar c={c} percent={percent} color={color} />}
    </Card>
  );
}

function Field({ c, label, children }: { c: Palette; label: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: c.subtext }}>{label}</span>
      {children}
    </label>
  );
}

function inputStyle(c: Palette): CSSProperties {
  return { background: c.inputBg, border: `1px solid ${c.border}`, borderRadius: 9, padding: "8px 10px", color: c.text, fontFamily: FONT_MONO, fontSize: 13.5, outline: "none" };
}

function pillBtn(c: Palette): CSSProperties {
  return { display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 9, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontFamily: FONT_BODY, fontSize: 12.5, whiteSpace: "nowrap" };
}

function RuleRow({ c, rule }: { c: Palette; rule: Rule }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0", borderBottom: `1px solid ${c.border}`, gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <IconBadge color={rule.pass ? c.green : c.red} colorSoft={rule.pass ? c.greenSoft : c.redSoft} size={26} radius={13}>
          {rule.pass ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        </IconBadge>
        <span style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: c.text }}>{rule.label}</span>
      </div>
      <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: rule.pass ? c.green : c.red, whiteSpace: "nowrap" }}>{rule.detail}</span>
    </div>
  );
}

const TIMELINE_STYLE = {
  checkin: { color: "green", icon: LogIn },
  "checkin-work": { color: "green", icon: Activity },
  resume: { color: "green", icon: Activity },
  break: { color: "amber", icon: Coffee },
  checkout: { color: "violet", icon: CheckCircle2 },
} satisfies Record<TimelineSegment["type"], { color: AccentColor; icon: LucideIcon }>;

function TimelineRow({ c, seg }: { c: Palette; seg: TimelineSegment }) {
  const meta = TIMELINE_STYLE[seg.type];
  const Icon = meta.icon;
  const colorMap: Record<AccentColor, [string, string]> = { green: [c.green, c.greenSoft], amber: [c.amber, c.amberSoft], violet: [c.violet, c.violetSoft] };
  const [color, colorSoft] = colorMap[meta.color];
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
        <IconBadge color={color} colorSoft={colorSoft} size={26} radius={13}><Icon size={13} /></IconBadge>
        <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: c.text, whiteSpace: "nowrap" }}>{title}</span>
      </div>
      {right && <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: c.faint, whiteSpace: "nowrap" }}>{right}</span>}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Main App                                                               */
/* ---------------------------------------------------------------------- */

const LOADING_STEPS = ["Parsing biometric logs…", "Calculating work sessions…", "Computing work hours…", "Generating dashboard…"];
const SAMPLE_LOG = "11:02\nBiometric.\n11:09\nBiometric.\n11:11\nBiometric.\n12:52\nBiometric.\n13:33\nBiometric.\n17:00\nBiometric.\n17:01\nBiometric.\n20:12\nBiometric.";
const BREAK_COLORS_KEY: BreakColorKey[] = ["violet", "blue", "amber", "teal"];
const celebrateSuccess = () => {
  const duration = 1400;
  const animationEnd = Date.now() + duration;

  const defaults = {
    startVelocity: 28,
    spread: 70,
    ticks: 120,
    gravity: 0.8,
    scalar: 0.8,
    zIndex: 9999,
    colors: [
      "#8B5CF6", // Purple
      "#6366F1", // Indigo
      "#3B82F6", // Blue
      "#FFFFFF", // White
      "#A855F7"
    ]
  };

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    confetti({
      ...defaults,
      particleCount: 4,
      origin: {
        x: 0.15,
        y: 0.25
      }
    });

    confetti({
      ...defaults,
      particleCount: 4,
      origin: {
        x: 0.85,
        y: 0.25
      }
    });

  }, 120);
};
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

      // setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
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

  const alertCount = result ? result.rules.filter((r) => !r.pass).length : 0;

  const statusColor = (status: WorkStatus) => (status === "Working" ? c.green : status === "Completed" ? c.violet : c.amber);
  const statusSoft = (status: WorkStatus) => (status === "Working" ? c.greenSoft : status === "Completed" ? c.violetSoft : c.amberSoft);

  const officeSummary = `Work ${settings.requiredHours}h • Break ${formatDuration(parseInt(settings.maxBreak || "0", 10))} • Logout before ${formatClock(toMinutes(settings.officeEnd))}`;

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: `radial-gradient(circle at 12% -10%, ${c.pageGrid} 0%, transparent 45%), ${c.pageBg}`, fontFamily: FONT_BODY, color: c.text, transition: "background 0.3s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: ${c.violet}55; }
        textarea::placeholder, input::placeholder { color: ${c.faint}; }
        .pq-btn { cursor: pointer; transition: all .15s ease; }
        .pq-btn:hover { border-color: ${c.borderStrong}; }
        .pq-btn:active { transform: scale(0.97); }
        .pq-fade { animation: pqFadeUp .5s ease both; }
        @keyframes pqFadeUp { from { opacity:0; transform: translateY(10px);} to {opacity:1; transform:none;} }
        @keyframes pqPulse { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
        @keyframes pqBlink { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pq-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
        .pq-scroll::-webkit-scrollbar-thumb { background: ${c.borderStrong}; border-radius: 4px; }
      `}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: theme === "dark" ? "rgba(10,9,19,0.82)" : "rgba(244,242,250,0.82)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: `linear-gradient(135deg, ${c.violet}, ${c.blue})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Fingerprint size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 17, letterSpacing: 0.2 }}>PunchIQ</div>
                <div style={{ fontFamily: FONT_BODY, fontSize: 10.5, color: c.faint, letterSpacing: 0.6, textTransform: "uppercase", marginTop: -2 }}>Work hours tracker</div>
              </div>
            </div>
            <div style={{ borderLeft: `1px solid ${c.border}`, paddingLeft: 22 }}>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 14.5, color: c.text, display: "flex", alignItems: "center", gap: 6 }}>
                {greeting}{settings.name ? `, ${settings.name}` : ""}! <Sparkles size={13} color={c.amber} />
              </div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: c.subtext, marginTop: 1 }}>
                {result ? "Here's your work summary for today." : "Paste a biometric log to get started."}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: c.subtext }}>{fullDateLabel()}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end" }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 500, color: c.text }}>
                  {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 20, background: c.greenSoft, color: c.green, fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, letterSpacing: 0.4 }}>
                  <span style={{ width: 5, height: 5, borderRadius: 5, background: c.green, animation: "pqBlink 1.4s ease infinite" }} /> LIVE
                </span>
              </div>
            </div>

            <div style={{ display: "flex", border: `1px solid ${c.border}`, borderRadius: 9, overflow: "hidden" }}>
              <button className="pq-btn" onClick={() => setTheme("light")} style={{ width: 32, height: 32, border: "none", background: theme === "light" ? c.violetSoft : "transparent", color: theme === "light" ? c.violet : c.subtext, display: "flex", alignItems: "center", justifyContent: "center" }}><Sun size={15} /></button>
              <button className="pq-btn" onClick={() => setTheme("dark")} style={{ width: 32, height: 32, border: "none", borderLeft: `1px solid ${c.border}`, background: theme === "dark" ? c.violetSoft : "transparent", color: theme === "dark" ? c.violet : c.subtext, display: "flex", alignItems: "center", justifyContent: "center" }}><Moon size={15} /></button>
            </div>

            <div style={{ position: "relative" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${c.border}`, background: c.inputBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bell size={15} color={c.text} />
              </div>
              {alertCount > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: c.red, color: "#fff", fontFamily: FONT_BODY, fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                  {alertCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 20px 60px" }}>

        {/* Office policy strip */}
        <Card c={c} style={{ padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <IconBadge color={c.teal} colorSoft={c.tealSoft}><ShieldCheck size={17} /></IconBadge>
            <div>
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 14 }}>Office policy</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: c.subtext, marginTop: 1 }}>{officeSummary}</div>
            </div>
          </div>
          <button className="pq-btn" onClick={() => setPolicyOpen((o) => !o)} style={{ ...pillBtn(c), border: `1px solid ${c.violet}`, color: c.violet, background: c.violetSoft }}>
            <Settings2 size={13} /> Configure policy
          </button>
        </Card>

        {policyOpen && (
          <Card c={c} className="pq-fade" style={{ padding: 18, marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
            <Field c={c} label="Your name (optional)">
              <input type="text" value={settings.name} placeholder="e.g. Alex" style={inputStyle(c)} onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field c={c} label="Office start">
              <input type="time" value={settings.officeStart} style={inputStyle(c)} onChange={(e) => setSettings((s) => ({ ...s, officeStart: e.target.value }))} />
            </Field>
            <Field c={c} label="Office end">
              <input type="time" value={settings.officeEnd} style={inputStyle(c)} onChange={(e) => setSettings((s) => ({ ...s, officeEnd: e.target.value }))} />
            </Field>
            <Field c={c} label="Required hours">
              <input type="number" min="0" step="0.5" value={settings.requiredHours} style={inputStyle(c)} onChange={(e) => setSettings((s) => ({ ...s, requiredHours: e.target.value }))} />
            </Field>
            <Field c={c} label="Max break (min)">
              <input type="number" min="0" step="5" value={settings.maxBreak} style={inputStyle(c)} onChange={(e) => setSettings((s) => ({ ...s, maxBreak: e.target.value }))} />
            </Field>
            <Field c={c} label="Latest check-in">
              <input type="time" value={settings.latestCheckIn} style={inputStyle(c)} onChange={(e) => setSettings((s) => ({ ...s, latestCheckIn: e.target.value }))} />
            </Field>
          </Card>
        )}

        {/* Top stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 }}>
          <StatCard c={c} icon={<Activity size={17} />} label="Worked today" color={c.violet} colorSoft={c.violetSoft}
            value={result ? formatDuration(workedCount) : "—"} sub={result ? `of ${formatDuration(result.requiredMinutes)} target` : "Run a calculation"}
            percent={result ? result.targetPercent : 0} />
          <StatCard c={c} icon={<TimerReset size={17} />} label="Remaining time" color={c.blue} colorSoft={c.blueSoft}
            value={result ? formatDuration(remainingCount) : "—"} sub={result && result.extra > 0 ? `${formatDuration(result.extra)} extra worked` : result ? "until target reached" : "—"}
            percent={result ? 100 - Math.min(100, (result.remaining / (result.requiredMinutes || 1)) * 100) : 0} />
          <StatCard c={c} icon={<Coffee size={17} />} label="Break time" color={c.amber} colorSoft={c.amberSoft}
            value={result ? formatDuration(breakCount) : "—"} sub={result ? `limit ${formatDuration(result.maxBreak)}` : "—"}
            percent={result ? Math.min(100, (result.breakMinutes / (result.maxBreak || 1)) * 100) : 0} />
          <StatCard c={c} icon={<LogOut size={17} />} label="Expected logout" color={c.green} colorSoft={c.greenSoft}
            value={result ? formatClock(result.expectedLogout) : "—"} sub={result ? `${formatDuration(Math.max(0, result.expectedLogout - Math.round(nowMinutes)))} remaining` : "—"}
            percent={result ? result.targetPercent : 0} />
          <StatCard c={c} icon={<ShieldCheck size={17} />} label="Status" color={result ? statusColor(result.status) : c.amber} colorSoft={result ? statusSoft(result.status) : c.amberSoft}
            value={result ? result.status : "Idle"} sub={result ? `${result.compliance}% policy compliant` : "Awaiting log"}
            percent={result ? result.compliance : 0} />
        </div>

        {/* Biometric input + Today's summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 16, marginBottom: 16 }}>
          <Card c={c} style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Fingerprint size={16} color={c.violet} />
                <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15 }}>Biometric log</span>
              </div>
              <button className="pq-btn" onClick={handlePaste} style={pillBtn(c)}><ClipboardPaste size={13} /> Paste clipboard</button>
            </div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: c.faint, marginBottom: 10 }}>Paste your biometric log data below</div>

            <textarea
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={"11:02\nBiometric.\n11:09\nBiometric."}
              rows={7}
              style={{ width: "100%", resize: "vertical", background: c.inputBg, border: `1px solid ${c.border}`, borderRadius: 10, padding: 12, color: c.text, fontFamily: FONT_MONO, fontSize: 13, lineHeight: 1.6, outline: "none" }}
            />

            {error && (
              <div className="pq-fade" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "9px 12px", borderRadius: 9, background: c.redSoft, color: c.red, fontFamily: FONT_BODY, fontSize: 13 }}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button className="pq-btn" disabled={isCalculating} onClick={handleCalculate}
                style={{ flex: "1 1 140px", padding: "12px 16px", borderRadius: 11, border: "none",
                  background: isCalculating ? c.inputBg : `linear-gradient(135deg, ${c.violet}, ${c.blue})`,
                  color: isCalculating ? c.subtext : "#fff", fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 9, opacity: isCalculating ? 0.85 : 1 }}>
                {isCalculating ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Calculating…</> : <><Play size={15} /> Calculate</>}
              </button>
              <button className="pq-btn" onClick={() => { setLogText(""); setResult(null); setErrorMsg(null); }} style={pillBtn(c)}><Trash2 size={13} /> Clear</button>
              <button className="pq-btn" onClick={() => { setLogText(SAMPLE_LOG); setErrorMsg(null); }} style={pillBtn(c)}><FileText size={13} /> Sample data</button>
            </div>
            <div style={{ marginTop: 10, fontFamily: FONT_BODY, fontSize: 11, color: c.faint }}>Shortcut: Ctrl / ⌘ + Enter to calculate</div>

            {isCalculating && (
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 4, borderRadius: 4, background: c.border, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: c.violet, transition: "width .05s linear" }} />
                </div>
                <div style={{ marginTop: 8, fontFamily: FONT_MONO, fontSize: 12, color: c.subtext, animation: "pqPulse 1.2s ease infinite" }}>{LOADING_STEPS[loadingStep]}</div>
              </div>
            )}
          </Card>

          <Card c={c} style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15 }}>Today's summary</span>
              {result && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: result.compliance === 100 ? c.greenSoft : c.amberSoft, color: result.compliance === 100 ? c.green : c.amber, fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600 }}>
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
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${c.border}` }}>
                      <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: c.subtext }}>{label}</span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: c.text }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", flex: "0 0 auto" }}>
                  <ProgressRing c={c} percent={ringPercent} color={result.targetPercent >= 100 ? c.green : c.violet} />
                </div>
              </div>
            ) : (
              <div style={{ padding: "30px 0", textAlign: "center", fontFamily: FONT_BODY, fontSize: 12.5, color: c.faint }}>
                Calculate today's log to see your summary
              </div>
            )}

            {result && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, background: result.completed ? c.greenSoft : c.amberSoft }}>
                {result.completed ? <CheckCircle2 size={16} color={c.green} /> : <AlertTriangle size={16} color={c.amber} />}
                <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: result.completed ? c.green : c.amber }}>
                  {result.completed ? "You've completed your work hours for today." : `${formatDuration(result.remaining)} left to reach today's target.`}
                </span>
              </div>
            )}
          </Card>
        </div>

        {result && (
          <div ref={resultsRef}>
            {/* Rules + Timeline */}
            <div style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 16, marginBottom: 16 }} className="pq-fade">
              <Card c={c} style={{ padding: 20 }}>
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <ListChecks size={16} color={c.violet} /> Rule validation
                </div>
                {result.rules.map((r) => <RuleRow key={r.key} c={c} rule={r} />)}
              </Card>

              <Card c={c} style={{ padding: 20, overflowX: "auto" }} className="pq-scroll">
                <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Today's timeline</div>
                {result.timeline.map((seg, i) => <TimelineRow key={i} c={c} seg={seg} />)}
              </Card>
            </div>

            {/* Session table */}
            <Card c={c} style={{ padding: 20, marginBottom: 16, overflowX: "auto" }} className="pq-scroll">
              <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Session table</div>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr>
                    {["Session", "IN", "OUT", "Worked", "Break after", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontFamily: FONT_BODY, fontSize: 11.5, color: c.faint, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${c.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.sessions.map((s, i) => {
                    const next = result.sessions[i + 1];
                    const breakAfter = s.out !== null && next ? formatDuration(next.in - s.out) : "—";
                    const worked = formatDuration((s.out ?? Math.round(nowMinutes)) - s.in);
                    return (
                      <tr key={i}>
                        <td style={{ padding: "8px 8px", fontFamily: FONT_MONO, fontSize: 12.5, color: c.text, borderBottom: `1px solid ${c.border}` }}>#{i + 1}</td>
                        <td style={{ padding: "8px 8px", fontFamily: FONT_MONO, fontSize: 12.5, color: c.text, borderBottom: `1px solid ${c.border}` }}>{formatClock(s.in)}</td>
                        <td style={{ padding: "8px 8px", fontFamily: FONT_MONO, fontSize: 12.5, color: c.text, borderBottom: `1px solid ${c.border}` }}>{s.out !== null ? formatClock(s.out) : "Ongoing"}</td>
                        <td style={{ padding: "8px 8px", fontFamily: FONT_MONO, fontSize: 12.5, color: c.text, borderBottom: `1px solid ${c.border}` }}>{worked}</td>
                        <td style={{ padding: "8px 8px", fontFamily: FONT_MONO, fontSize: 12.5, color: c.text, borderBottom: `1px solid ${c.border}` }}>{breakAfter}</td>
                        <td style={{ padding: "8px 8px", borderBottom: `1px solid ${c.border}` }}>
                          <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, padding: "3px 8px", borderRadius: 6, background: s.out !== null ? c.greenSoft : c.amberSoft, color: s.out !== null ? c.green : c.amber }}>
                            {s.out !== null ? "Complete" : "Ongoing"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Charts + quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 0.8fr", gap: 16, marginBottom: 16 }}>
          <Card c={c} style={{ padding: 20 }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Work hours overview</div>
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
                    <XAxis dataKey="name" tick={{ fill: c.subtext, fontSize: 11, fontFamily: FONT_BODY }} axisLine={{ stroke: c.border }} tickLine={false} />
                    <YAxis tick={{ fill: c.subtext, fontSize: 11, fontFamily: FONT_BODY }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: c.panelSolid, border: `1px solid ${c.border}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 12 }} labelStyle={{ color: c.text }} formatter={(v) => [`${v}h`, "Worked"]} />
                    <Area type="monotone" dataKey="hours" stroke={c.violet} strokeWidth={2.5} fill="url(#pqAreaFill)" dot={{ r: 3.5, fill: c.violet, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, fontSize: 12.5, color: c.faint }}>Run a calculation to build history</div>
            )}
          </Card>

          <Card c={c} style={{ padding: 20 }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Break distribution</div>
            {result && result.breakSegments.length ? (
              <>
                <div style={{ width: "100%", height: 150, position: "relative" }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={result.breakSegments} dataKey="duration" nameKey="from" innerRadius={42} outerRadius={68} paddingAngle={3}>
                        {result.breakSegments.map((_, i) => <Cell key={i} fill={c[BREAK_COLORS_KEY[i % BREAK_COLORS_KEY.length]]} stroke="none" />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: c.panelSolid, border: `1px solid ${c.border}`, borderRadius: 8, fontFamily: FONT_BODY, fontSize: 12 }} formatter={(value) => [formatDuration(Number(value ?? 0)), "Break"]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                    <span style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 17, color: c.text }}>{formatDuration(result.breakMinutes)}</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 10, color: c.faint }}>Total break</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {result.breakSegments.map((seg, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: FONT_BODY, fontSize: 11.5, color: c.subtext }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: c[BREAK_COLORS_KEY[i % BREAK_COLORS_KEY.length]], display: "inline-block" }} />
                        Break {i + 1} ({formatClock(seg.from)}–{formatClock(seg.to)})
                      </span>
                      <span style={{ color: c.text, fontFamily: FONT_MONO }}>{formatDuration(seg.duration)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_BODY, fontSize: 12.5, color: c.faint }}>No breaks logged yet</div>
            )}
          </Card>

          <Card c={c} style={{ padding: 20, display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Sessions</div>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: 30, color: c.text, marginTop: 6 }}>{result ? result.sessions.length : 0}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: c.faint, marginBottom: 16 }}>Total sessions</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
              <button className="pq-btn" onClick={handleExportPdf} style={{ ...pillBtn(c), justifyContent: "space-between" }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><FileText size={13} /> Export PDF</span><ChevronRight size={13} color={c.faint} /></button>
              <button className="pq-btn" onClick={() => handleExportCsv("punchiq-history.xls")} style={{ ...pillBtn(c), justifyContent: "space-between" }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><FileSpreadsheet size={13} /> Export Excel</span><ChevronRight size={13} color={c.faint} /></button>
              <button className="pq-btn" onClick={() => handleExportCsv()} style={{ ...pillBtn(c), justifyContent: "space-between" }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><Download size={13} /> Export CSV</span><ChevronRight size={13} color={c.faint} /></button>
            </div>
          </Card>
        </div>

        {/* Averages */}
        {history.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 16 }}>
            <StatCard c={c} icon={<Activity size={16} />} label="Avg worked / day" color={c.violet} colorSoft={c.violetSoft} value={formatDuration(avgWorked)} />
            <StatCard c={c} icon={<Coffee size={16} />} label="Avg break / day" color={c.amber} colorSoft={c.amberSoft} value={formatDuration(avgBreak)} sub={`Across ${history.length} logged day${history.length > 1 ? "s" : ""}`} />
            <StatCard c={c} icon={<CheckCircle2 size={16} />} label="Avg compliance" color={c.green} colorSoft={c.greenSoft} value={`${avgCompliance}%`} />
          </div>
        )}

        {/* Monthly history + export & share */}
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
          <Card c={c} style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15 }}>Monthly history</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: c.inputBg, border: `1px solid ${c.border}`, borderRadius: 8, padding: "6px 10px" }}>
                  <Search size={13} color={c.faint} />
                  <input value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} placeholder="Search date or status" style={{ background: "transparent", border: "none", outline: "none", color: c.text, fontFamily: FONT_BODY, fontSize: 12.5, width: 140 }} />
                </div>
                <button className="pq-btn" onClick={() => setSortDesc((s) => !s)} style={pillBtn(c)}><ArrowUpDown size={12} /> {sortDesc ? "Newest" : "Oldest"}</button>
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", fontFamily: FONT_BODY, fontSize: 13, color: c.faint }}>No history yet — run a calculation to log today's entry.</div>
            ) : (
              <>
                <div style={{ overflowX: "auto" }} className="pq-scroll">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                    <thead>
                      <tr>
                        {["Date", "Check in", "Worked", "Break", "Logout", "Status", "Compliance", ""].map((h) => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontFamily: FONT_BODY, fontSize: 11, color: c.faint, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1px solid ${c.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleHistory.map((h) => (
                        <tr key={h.id}>
                          <td style={{ padding: "9px 8px", fontFamily: FONT_MONO, fontSize: 12, color: c.text, borderBottom: `1px solid ${c.border}` }}>{h.date}</td>
                          <td style={{ padding: "9px 8px", fontFamily: FONT_MONO, fontSize: 12, color: c.text, borderBottom: `1px solid ${c.border}` }}>{h.checkIn}</td>
                          <td style={{ padding: "9px 8px", fontFamily: FONT_MONO, fontSize: 12, color: c.text, borderBottom: `1px solid ${c.border}` }}>{h.worked}</td>
                          <td style={{ padding: "9px 8px", fontFamily: FONT_MONO, fontSize: 12, color: c.text, borderBottom: `1px solid ${c.border}` }}>{h.breakMin}</td>
                          <td style={{ padding: "9px 8px", fontFamily: FONT_MONO, fontSize: 12, color: c.text, borderBottom: `1px solid ${c.border}` }}>{h.logout}</td>
                          <td style={{ padding: "9px 8px", borderBottom: `1px solid ${c.border}` }}>
                            <span style={{ fontFamily: FONT_BODY, fontSize: 11, padding: "3px 8px", borderRadius: 6, background: statusSoft(h.status), color: statusColor(h.status) }}>{h.status}</span>
                          </td>
                          <td style={{ padding: "9px 8px", fontFamily: FONT_MONO, fontSize: 12, color: c.text, borderBottom: `1px solid ${c.border}` }}>{h.compliance}%</td>
                          <td style={{ padding: "9px 8px", borderBottom: `1px solid ${c.border}` }}>
                            <button className="pq-btn" onClick={() => deleteHistoryRow(h.id)} style={{ background: "none", border: "none", color: c.red, display: "flex" }}><Trash2 size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredHistory.length > 5 && (
                  <button className="pq-btn" onClick={() => setShowAllHistory((s) => !s)} style={{ marginTop: 12, background: "none", border: "none", color: c.violet, fontFamily: FONT_BODY, fontSize: 12.5, display: "flex", alignItems: "center", gap: 5 }}>
                    {showAllHistory ? "Show less" : `View all history (${filteredHistory.length})`} <ChevronRight size={13} />
                  </button>
                )}
              </>
            )}
          </Card>

          <Card c={c} style={{ padding: 20 }}>
            <div style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Export & share</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: c.faint, marginBottom: 16 }}>Download or share today's summary</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="pq-btn" onClick={handleCopySummary}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${c.violet}, ${c.blue})`, color: "#fff", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500 }}>
                <Copy size={14} /> Copy summary
              </button>
              <button className="pq-btn" onClick={handleExportPdf} style={{ ...pillBtn(c), justifyContent: "flex-start" }}><FileText size={13} /> Export PDF</button>
              <button className="pq-btn" onClick={() => handleExportCsv("punchiq-history.xls")} style={{ ...pillBtn(c), justifyContent: "flex-start" }}><FileSpreadsheet size={13} /> Export Excel</button>
              <button className="pq-btn" onClick={() => handleExportCsv()} style={{ ...pillBtn(c), justifyContent: "flex-start" }}><Download size={13} /> Export CSV</button>
            </div>
            {copyMsg && <div style={{ marginTop: 10, fontFamily: FONT_BODY, fontSize: 12, color: c.violet }}>{copyMsg}</div>}
          </Card>
        </div>

        <div style={{ textAlign: "center", marginTop: 26, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 11.5, color: c.faint }}>
          <ShieldCheck size={12} /> All data is stored locally in your browser. Nothing is sent to a server.
        </div>
      </div>
      {showSuccess && (
  <div
    style={{
      position: "fixed",
      top: 25,
      right: 25,
      background: "#16A34A",
      color: "#fff",
      padding: "14px 20px",
      borderRadius: 14,
      display: "flex",
      alignItems: "center",
      gap: 10,
      boxShadow: "0 20px 40px rgba(0,0,0,.35)",
      zIndex: 99999,
      animation: "pqFadeUp .35s ease"
    }}
  >
    <span style={{ fontSize: 22 }}>🎉</span>

    <div>
      <div style={{ fontWeight: 700 }}>
        Calculation Complete
      </div>

      <div style={{ fontSize: 13 }}>
        Your work summary is ready.
      </div>
    </div>
  </div>
)}
    </div>
    
  );
}
