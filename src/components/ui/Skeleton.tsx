import type { CSSProperties } from "react";

export function Skeleton({ style }: { style?: CSSProperties }) {
  return <div className="pq-skeleton" style={{ height: 14, width: "100%", ...style }} />;
}
