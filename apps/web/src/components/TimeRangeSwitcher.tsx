import clsx from "clsx";
import { useTranslation } from "react-i18next";

export type TimeRange = "today" | "7d" | "30d" | "90d";

const RANGES: TimeRange[] = ["today", "7d", "30d", "90d"];

/** Days covered by each range — useful for downstream filtering. */
export function rangeDays(r: TimeRange): number {
  switch (r) {
    case "today":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
  }
}

export function TimeRangeSwitcher({
  value,
  onChange,
  className,
}: {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      className={clsx(
        "inline-flex items-center gap-0.5 rounded-md border border-ms-line bg-white/[0.03] p-0.5",
        className,
      )}
    >
      {RANGES.map((r) => {
        const active = r === value;
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(r)}
            className={clsx(
              "px-2.5 py-1 rounded-sm text-xs transition-colors whitespace-nowrap",
              active
                ? "bg-ms-blue/25 text-white font-semibold ring-1 ring-inset ring-ms-blue/70"
                : "text-slate-400 hover:text-white hover:bg-white/5",
            )}
          >
            {t(`time.${r}`)}
          </button>
        );
      })}
    </div>
  );
}
