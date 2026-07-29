export const PALETTE = {
  dark: {
    pageBg: "#050308",
    pageGridA: "rgba(139,92,246,0.16)",
    pageGridB: "rgba(59,130,246,0.14)",
    panel: "rgba(22,19,36,0.55)",
    panelSolid: "#14111f",
    panelHover: "rgba(30,26,48,0.68)",
    border: "rgba(255,255,255,0.08)",
    borderStrong: "rgba(255,255,255,0.18)",
    text: "#F4F2FB",
    subtext: "#9C97B4",
    faint: "#635F7D",
    violet: "#8B5CF6",
    violetSoft: "rgba(139,92,246,0.16)",
    violetDark: "#6D28D9",
    blue: "#4F9EF8",
    blueSoft: "rgba(79,158,248,0.16)",
    amber: "#F5A524",
    amberSoft: "rgba(245,165,36,0.16)",
    green: "#2FD98A",
    greenSoft: "rgba(47,217,138,0.16)",
    red: "#FB7A6C",
    redSoft: "rgba(251,122,108,0.16)",
    teal: "#2DD4BF",
    tealSoft: "rgba(45,212,191,0.16)",
    inputBg: "rgba(255,255,255,0.045)",
    navBg: "rgba(8,7,14,0.72)",
    shadowSm: "0 2px 8px rgba(0,0,0,0.25)",
    shadowMd: "0 12px 32px -8px rgba(0,0,0,0.5)",
    shadowLg: "0 24px 64px -16px rgba(0,0,0,0.65)",
    glow: "0 0 0 1px rgba(139,92,246,0.15), 0 8px 32px -8px rgba(139,92,246,0.35)",
  },
  light: {
    pageBg: "#F6F4FC",
    pageGridA: "rgba(124,58,237,0.10)",
    pageGridB: "rgba(37,99,235,0.08)",
    panel: "rgba(255,255,255,0.72)",
    panelSolid: "#FFFFFF",
    panelHover: "rgba(255,255,255,0.9)",
    border: "rgba(30,20,60,0.09)",
    borderStrong: "rgba(30,20,60,0.18)",
    text: "#161127",
    subtext: "#635D7C",
    faint: "#9993AF",
    violet: "#7C3AED",
    violetSoft: "rgba(124,58,237,0.10)",
    violetDark: "#6D28D9",
    blue: "#2563EB",
    blueSoft: "rgba(37,99,235,0.10)",
    amber: "#C2760A",
    amberSoft: "rgba(194,118,10,0.10)",
    green: "#0E9F6E",
    greenSoft: "rgba(14,159,110,0.10)",
    red: "#DC4C3F",
    redSoft: "rgba(220,76,63,0.10)",
    teal: "#0D9488",
    tealSoft: "rgba(13,148,136,0.10)",
    inputBg: "rgba(30,20,60,0.035)",
    navBg: "rgba(255,255,255,0.72)",
    shadowSm: "0 2px 8px rgba(30,20,60,0.06)",
    shadowMd: "0 12px 32px -8px rgba(30,20,60,0.12)",
    shadowLg: "0 24px 64px -16px rgba(30,20,60,0.18)",
    glow: "0 0 0 1px rgba(124,58,237,0.10), 0 8px 32px -8px rgba(124,58,237,0.25)",
  },
} as const;

export type Theme = keyof typeof PALETTE;
export type Palette = (typeof PALETTE)[Theme];
export type AccentColor = "green" | "amber" | "violet";
export type BreakColorKey = "violet" | "blue" | "amber" | "teal";

export const FONT_HEAD = "'Space Grotesk', 'Segoe UI', sans-serif";
export const FONT_BODY = "'Inter', 'Segoe UI', sans-serif";
export const FONT_MONO = "'JetBrains Mono', 'SFMono-Regular', monospace";

export const BREAK_COLORS_KEY: BreakColorKey[] = ["violet", "blue", "amber", "teal"];
