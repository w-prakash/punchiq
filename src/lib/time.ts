import type { Settings, Session, CalculationResult, BreakSegment, TimelineSegment } from "./types";

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function toMinutes(hhmm: string) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function formatClock(minsRaw: number) {
  const mins = ((Math.round(minsRaw) % 1440) + 1440) % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${pad2(m)} ${period}`;
}

export function formatDuration(minsRaw: number) {
  const mins = Math.max(0, Math.round(minsRaw));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function todayLabel(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function fullDateLabel(d = new Date()) {
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

/** Parse raw biometric log text into a sorted, de-duplicated list of minute-of-day values. */
export function parseBiometricLog(text: string) {
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

export function buildSessions(timestamps: number[]) {
  const sessions: Session[] = [];
  for (let i = 0; i < timestamps.length; i += 2) {
    sessions.push({ in: timestamps[i], out: timestamps[i + 1] ?? null });
  }
  return sessions;
}

export function computeResult(timestamps: number[], settings: Settings, nowMinutes: number): CalculationResult | { error: string } {
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

  let status: CalculationResult["status"];
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
