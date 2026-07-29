import type { CSSProperties } from "react";
import type { Palette } from "./theme";

/**
 * Bridges the JS theme palette onto CSS custom properties so that plain,
 * reusable CSS classes (see styles/premium.css) can theme themselves without
 * every component needing to thread a `palette` prop through.
 */
export function paletteToCssVars(c: Palette): CSSProperties {
  return {
    "--page-bg": c.pageBg,
    "--page-grid-a": c.pageGridA,
    "--page-grid-b": c.pageGridB,
    "--panel": c.panel,
    "--panel-solid": c.panelSolid,
    "--panel-hover": c.panelHover,
    "--border": c.border,
    "--border-strong": c.borderStrong,
    "--text": c.text,
    "--subtext": c.subtext,
    "--faint": c.faint,
    "--violet": c.violet,
    "--violet-soft": c.violetSoft,
    "--violet-dark": c.violetDark,
    "--blue": c.blue,
    "--blue-soft": c.blueSoft,
    "--amber": c.amber,
    "--amber-soft": c.amberSoft,
    "--green": c.green,
    "--green-soft": c.greenSoft,
    "--red": c.red,
    "--red-soft": c.redSoft,
    "--teal": c.teal,
    "--teal-soft": c.tealSoft,
    "--input-bg": c.inputBg,
    "--nav-bg": c.navBg,
    "--shadow-sm": c.shadowSm,
    "--shadow-md": c.shadowMd,
    "--shadow-lg": c.shadowLg,
    "--glow": c.glow,
  } as CSSProperties;
}
