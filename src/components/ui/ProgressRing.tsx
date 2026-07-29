type ProgressRingProps = {
  percent: number;
  size?: number;
  stroke?: number;
  color: string;
};

export function ProgressRing({ percent, size = 148, stroke = 11, color }: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 100));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 25, color: "var(--text)" }}>{Math.round(percent)}%</span>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 10.5, color: "var(--faint)", textAlign: "center", lineHeight: 1.3, maxWidth: 80 }}>of daily target</span>
      </div>
    </div>
  );
}
