export type Settings = {
  name: string;
  officeStart: string;
  officeEnd: string;
  requiredHours: string;
  maxBreak: string;
  latestCheckIn: string;
};

export type Session = { in: number; out: number | null };
export type WorkStatus = "Working" | "Completed" | "Incomplete";
export type Rule = { key: string; label: string; pass: boolean; detail: string };
export type PointSegment = { type: "checkin"; time: number } | { type: "checkout"; time: number };
export type WorkSegment = { type: "checkin-work" | "resume"; from: number; to: number; ongoing: boolean };
export type BreakSegment = { type: "break"; from: number; to: number };
export type TimelineSegment = PointSegment | WorkSegment | BreakSegment;
export type BreakSegmentWithDuration = BreakSegment & { duration: number };

export type CalculationResult = {
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

export type HistoryRow = {
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
