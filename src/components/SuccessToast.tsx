export function SuccessToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="pq-slide-in"
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
      }}
    >
      <span style={{ fontSize: 22 }}>🎉</span>
      <div>
        <div style={{ fontWeight: 700 }}>Calculation Complete</div>
        <div style={{ fontSize: 13 }}>Your work summary is ready.</div>
      </div>
    </div>
  );
}
