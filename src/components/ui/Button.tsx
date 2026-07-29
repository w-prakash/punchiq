import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "pill" | "icon";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = "pill", className = "", style, ...rest }: ButtonProps) {
  const variantClass = variant === "primary" ? "pq-btn-primary" : variant === "icon" ? "pq-btn-icon" : "pq-btn-pill";
  return <button className={`pq-btn ${variantClass} ${className}`} style={style} {...rest} />;
}
