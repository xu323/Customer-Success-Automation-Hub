import clsx from "clsx";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

/**
 * "↑ 12%" / "↓ 4%" delta chip. Pass `inverse` for metrics where down is good
 * (e.g. open tickets, breach count).
 */
export function TrendIndicator({
  delta,
  inverse = false,
  suffix = "%",
  className,
}: {
  delta: number | null | undefined;
  inverse?: boolean;
  suffix?: string;
  className?: string;
}) {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) {
    return (
      <span className={clsx("inline-flex items-center text-xs text-neutral-90", className)}>
        <Minus size={12} aria-hidden />
      </span>
    );
  }
  const up = delta > 0;
  const good = inverse ? !up : up;
  const tone = good ? "text-success" : "text-danger";
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Arrow size={12} strokeWidth={2.25} aria-hidden />
      <span>
        {Math.abs(delta).toFixed(0)}
        {suffix}
      </span>
    </span>
  );
}
