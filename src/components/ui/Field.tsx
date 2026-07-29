import type { ReactNode } from "react";

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--subtext)" }}>{label}</span>
      {children}
    </label>
  );
}
