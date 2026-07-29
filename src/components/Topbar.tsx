import { useState } from "react";
import { Sun, Moon, Bell, Search, Menu, ShieldCheck, AlertTriangle, Settings2, Sparkles } from "lucide-react";
import type { Theme } from "../lib/theme";
import type { CalculationResult } from "../lib/types";
import { fullDateLabel } from "../lib/time";

type TopbarProps = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  now: Date;
  greeting: string;
  name: string;
  result: CalculationResult | null;
  onSearch: (q: string) => void;
  searchValue: string;
  onOpenPolicy: () => void;
  onToggleMobileSidebar: () => void;
};

export function Topbar({ theme, setTheme, now, greeting, name, result, onSearch, searchValue, onOpenPolicy, onToggleMobileSidebar }: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const alertCount = result ? result.rules.filter((r) => !r.pass).length : 0;
  const initials = (name || "You").trim().slice(0, 2).toUpperCase();

  return (
    <header className="pq-topbar">
      <button
        className="pq-btn pq-btn-icon"
        onClick={onToggleMobileSidebar}
        aria-label="Toggle navigation"
        style={{ width: 34, height: 34, border: "1px solid var(--border)", borderRadius: 9, background: "var(--input-bg)" }}
      >
        <Menu size={16} color="var(--text)" />
      </button>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 14.5, color: "var(--text)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          {greeting}{name ? `, ${name}` : ""}! <Sparkles size={13} color="var(--amber)" />
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--subtext)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {result ? "Here's your work summary for today." : "Paste a biometric log to get started."}
        </div>
      </div>

      <div className="pq-topbar-search">
        <Search size={14} />
        <input placeholder="Search history or status…" value={searchValue} onChange={(e) => onSearch(e.target.value)} />
      </div>

      <div className="pq-topbar-actions">
        <div style={{ textAlign: "right", display: "none" }} className="pq-clock-desktop">
          <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--subtext)" }}>{fullDateLabel(now)}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 500, color: "var(--text)" }}>
            {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 20, background: "var(--green-soft)", color: "var(--green)", fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, letterSpacing: 0.4 }}>
            <span style={{ width: 5, height: 5, borderRadius: 5, background: "var(--green)", animation: "pqBlink 1.4s ease infinite" }} /> LIVE
          </span>
        </div>

        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 9, overflow: "hidden" }}>
          <button className="pq-btn" onClick={() => setTheme("light")} style={{ width: 32, height: 32, border: "none", background: theme === "light" ? "var(--violet-soft)" : "transparent", color: theme === "light" ? "var(--violet)" : "var(--subtext)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sun size={15} />
          </button>
          <button className="pq-btn" onClick={() => setTheme("dark")} style={{ width: 32, height: 32, border: "none", borderLeft: "1px solid var(--border)", background: theme === "dark" ? "var(--violet-soft)" : "transparent", color: theme === "dark" ? "var(--violet)" : "var(--subtext)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Moon size={15} />
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <button
            className="pq-btn pq-btn-icon"
            onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false); }}
            style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border)", background: "var(--input-bg)" }}
          >
            <Bell size={15} color="var(--text)" />
          </button>
          {alertCount > 0 && (
            <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: "var(--red)", color: "#fff", fontFamily: "var(--font-body)", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px", pointerEvents: "none" }}>
              {alertCount}
            </span>
          )}
          {notifOpen && (
            <div className="pq-card pq-scale-in" style={{ position: "absolute", right: 0, top: 42, width: 260, padding: 14, zIndex: 50, boxShadow: "var(--shadow-lg)" }}>
              <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 13, marginBottom: 8, color: "var(--text)" }}>Notifications</div>
              {result ? (
                result.rules.filter((r) => !r.pass).length ? (
                  result.rules.filter((r) => !r.pass).map((r) => (
                    <div key={r.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                      <AlertTriangle size={13} color="var(--amber)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--subtext)" }}>{r.label} — currently {r.detail}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
                    <ShieldCheck size={14} color="var(--green)" />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--subtext)" }}>All policy rules are passing.</span>
                  </div>
                )
              ) : (
                <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--faint)" }}>Run a calculation to see alerts.</div>
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            className="pq-btn"
            onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false); }}
            style={{ width: 34, height: 34, borderRadius: 9, border: "1px solid var(--border)", background: "linear-gradient(135deg, var(--violet), var(--blue))", color: "#fff", fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {initials}
          </button>
          {profileOpen && (
            <div className="pq-card pq-scale-in" style={{ position: "absolute", right: 0, top: 42, width: 200, padding: 8, zIndex: 50, boxShadow: "var(--shadow-lg)" }}>
              <div style={{ padding: "8px 10px", fontFamily: "var(--font-body)", fontSize: 12.5, color: "var(--text)", fontWeight: 600 }}>{name || "Guest user"}</div>
              <button
                className="pq-btn pq-sidebar-link"
                style={{ padding: "8px 10px" }}
                onClick={() => { onOpenPolicy(); setProfileOpen(false); }}
              >
                <Settings2 size={14} /> <span>Configure policy</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
