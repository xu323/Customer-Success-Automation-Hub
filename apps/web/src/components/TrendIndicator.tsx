import clsx from "clsx";

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
    return <span className={clsx("text-xs text-slate-400", className)}>—</span>;
  }
  const up = delta > 0;
  const good = inverse ? !up : up;
  const tone = good ? "text-emerald-400" : "text-rose-400";
  const arrow = up ? "▲" : "▼";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums whitespace-nowrap",
        tone,
        className,
      )}
    >
      <span aria-hidden>{arrow}</span>
      <span>
        {Math.abs(delta).toFixed(0)}
        {suffix}
      </span>
    </span>
  );
}
