import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  hover?: boolean;
  gradientBorder?: boolean;
  noPad?: boolean;
};

export function Card({ hover = true, gradientBorder = false, noPad = false, className = "", children, ...rest }: CardProps) {
  const classes = [
    "pq-card",
    hover ? "pq-card--hover" : "",
    gradientBorder ? "pq-card--gradient-border" : "",
    noPad ? "" : "pq-card-pad",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
