export function ProgressBar({ percent, color }: { percent: number; color: string }) {
  return (
    <div style={{ height: 4, borderRadius: 4, background: "var(--border)", overflow: "hidden", marginTop: 12 }}>
      <div
        style={{
          height: "100%",
          width: `${Math.max(2, Math.min(100, percent))}%`,
          background: color,
          transition: "width .8s cubic-bezier(.22,1,.36,1)",
        }}
      />
    </div>
  );
}
