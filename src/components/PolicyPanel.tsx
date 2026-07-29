import { Settings2, ShieldCheck } from "lucide-react";
import { Card } from "./ui/Card";
import { IconBadge } from "./ui/IconBadge";
import { Field } from "./ui/Field";
import { Button } from "./ui/Button";
import type { Settings } from "../lib/types";
import { formatClock, formatDuration, toMinutes } from "../lib/time";

type PolicyPanelProps = {
  settings: Settings;
  onChange: (updater: (s: Settings) => Settings) => void;
  open: boolean;
  onToggle: () => void;
};

export function PolicyPanel({ settings, onChange, open, onToggle }: PolicyPanelProps) {
  const officeSummary = `Work ${settings.requiredHours}h • Break ${formatDuration(parseInt(settings.maxBreak || "0", 10))} • Logout before ${formatClock(toMinutes(settings.officeEnd))}`;

  return (
    <>
      <Card style={{ padding: "14px 18px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconBadge tone="teal"><ShieldCheck size={17} /></IconBadge>
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 14, color: "var(--text)" }}>Office policy</div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--subtext)", marginTop: 1 }}>{officeSummary}</div>
          </div>
        </div>
        <Button
          variant="pill"
          onClick={onToggle}
          style={{ border: "1px solid var(--violet)", color: "var(--violet)", background: "var(--violet-soft)" }}
        >
          <Settings2 size={13} /> Configure policy
        </Button>
      </Card>

      {open && (
        <Card className="pq-fade-up pq-grid-policy" style={{ padding: 18, marginBottom: 18 }}>
          <Field label="Your name (optional)">
            <input type="text" className="pq-input" value={settings.name} placeholder="e.g. Alex" onChange={(e) => onChange((s) => ({ ...s, name: e.target.value }))} />
          </Field>
          <Field label="Office start">
            <input type="time" className="pq-input" value={settings.officeStart} onChange={(e) => onChange((s) => ({ ...s, officeStart: e.target.value }))} />
          </Field>
          <Field label="Office end">
            <input type="time" className="pq-input" value={settings.officeEnd} onChange={(e) => onChange((s) => ({ ...s, officeEnd: e.target.value }))} />
          </Field>
          <Field label="Required hours">
            <input type="number" min="0" step="0.5" className="pq-input" value={settings.requiredHours} onChange={(e) => onChange((s) => ({ ...s, requiredHours: e.target.value }))} />
          </Field>
          <Field label="Max break (min)">
            <input type="number" min="0" step="5" className="pq-input" value={settings.maxBreak} onChange={(e) => onChange((s) => ({ ...s, maxBreak: e.target.value }))} />
          </Field>
          <Field label="Latest check-in">
            <input type="time" className="pq-input" value={settings.latestCheckIn} onChange={(e) => onChange((s) => ({ ...s, latestCheckIn: e.target.value }))} />
          </Field>
        </Card>
      )}
    </>
  );
}
