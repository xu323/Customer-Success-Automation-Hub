import clsx from "clsx";
import { useTranslation } from "react-i18next";

export type TimeRange = "today" | "7d" | "30d" | "90d";

const RANGES: TimeRange[] = ["today", "7d", "30d", "90d"];

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
        "inline-flex items-center gap-0.5 rounded border border-neutral-40 bg-white p-0.5",
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
              "h-7 px-2.5 rounded text-xs font-semibold transition-colors whitespace-nowrap",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-neutral-130 hover:bg-neutral-20 hover:text-neutral-190",
            )}
          >
            {t(`time.${r}`)}
          </button>
        );
      })}
    </div>
  );
}
