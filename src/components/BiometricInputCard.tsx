import type { KeyboardEvent } from "react";
import { Fingerprint, ClipboardPaste, AlertTriangle, Play, Loader2, Trash2, FileText } from "lucide-react";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

type BiometricInputCardProps = {
  logText: string;
  setLogText: (v: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: () => void;
  error: string | null;
  isCalculating: boolean;
  onCalculate: () => void;
  onClear: () => void;
  onSample: () => void;
  progress: number;
  loadingStep: string;
};

export function BiometricInputCard({
  logText, setLogText, onKeyDown, onPaste, error, isCalculating, onCalculate, onClear, onSample, progress, loadingStep,
}: BiometricInputCardProps) {
  return (
    <Card id="input">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Fingerprint size={16} color="var(--violet)" />
          <span style={{ fontFamily: "var(--font-head)", fontWeight: 600, fontSize: 15, color: "var(--text)" }}>Biometric log</span>
        </div>
        <Button variant="pill" onClick={onPaste}><ClipboardPaste size={13} /> Paste clipboard</Button>
      </div>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--faint)", marginBottom: 10 }}>Paste your biometric log data below</div>

      <textarea
        className="pq-textarea"
        value={logText}
        onChange={(e) => setLogText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={"11:02\nBiometric.\n11:09\nBiometric."}
        rows={7}
        style={{ width: "100%" }}
      />

      {error && (
        <div className="pq-fade-up" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, padding: "9px 12px", borderRadius: 9, background: "var(--red-soft)", color: "var(--red)", fontFamily: "var(--font-body)", fontSize: 13 }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <Button variant="primary" disabled={isCalculating} onClick={onCalculate} style={{ flex: "1 1 140px" }}>
          {isCalculating ? <><Loader2 size={16} className="pq-spin" /> Calculating…</> : <><Play size={15} /> Calculate</>}
        </Button>
        <Button variant="pill" onClick={onClear}><Trash2 size={13} /> Clear</Button>
        <Button variant="pill" onClick={onSample}><FileText size={13} /> Sample data</Button>
      </div>
      <div style={{ marginTop: 10, fontFamily: "var(--font-body)", fontSize: 11, color: "var(--faint)" }}>Shortcut: Ctrl / ⌘ + Enter to calculate</div>

      {isCalculating && (
        <div style={{ marginTop: 12 }}>
          <div style={{ height: 4, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--violet)", transition: "width .05s linear" }} />
          </div>
          <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--subtext)", animation: "pqPulse 1.2s ease infinite" }}>{loadingStep}</div>
        </div>
      )}
    </Card>
  );
}
