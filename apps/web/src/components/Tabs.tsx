import clsx from "clsx";
import type { ReactNode } from "react";

export interface TabSpec<K extends string = string> {
  key: K;
  label: ReactNode;
  badge?: number | null;
  badgeTone?: "neutral" | "danger" | "info";
}

export function Tabs<K extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabSpec<K>[];
  active: K;
  onChange: (k: K) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={clsx(
        "flex items-center gap-1 border-b border-ms-line",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={clsx(
              "relative px-3 py-2 -mb-px text-sm transition-colors whitespace-nowrap",
              "flex items-center gap-2",
              isActive
                ? "text-white border-b-2 border-ms-blue font-semibold"
                : "text-ms-muted hover:text-white border-b-2 border-transparent",
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={clsx(
                  "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  tab.badgeTone === "danger"
                    ? "bg-rose-500/30 text-rose-200 ring-1 ring-rose-500/60"
                    : tab.badgeTone === "info"
                    ? "bg-ms-blue/25 text-white ring-1 ring-ms-blue/60"
                    : "bg-white/10 text-ms-muted",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
