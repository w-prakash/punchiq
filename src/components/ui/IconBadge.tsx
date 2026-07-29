import type { ReactNode } from "react";

export type Tone = "violet" | "blue" | "amber" | "green" | "red" | "teal";

type IconBadgeProps = {
  tone: Tone;
  size?: number;
  radius?: number;
  children: ReactNode;
  className?: string;
};

export function IconBadge({ tone, size = 34, radius = 10, children, className = "" }: IconBadgeProps) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `var(--${tone}-soft)`,
        color: `var(--${tone})`,
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}
