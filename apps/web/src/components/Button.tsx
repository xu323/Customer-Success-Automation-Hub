import clsx from "clsx";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary: "bg-ms-blue hover:bg-ms-blue/90 text-white border-ms-blue",
  secondary: "bg-neutral-10 hover:bg-neutral-30 text-white border-ms-line",
  ghost: "bg-transparent hover:bg-neutral-20 text-ms-muted hover:text-neutral-190 border-transparent",
  danger: "bg-rose-500/90 hover:bg-rose-500 text-white border-rose-500",
};

export function Button({
  variant = "secondary",
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors whitespace-nowrap",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
      )}
    />
  );
}
