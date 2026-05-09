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
      className={clsx("flex items-center gap-1 border-b border-neutral-40", className)}
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
                ? "text-brand-700 border-b-2 border-brand-500 font-semibold"
                : "text-neutral-130 hover:text-neutral-190 border-b-2 border-transparent",
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== null && tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={clsx(
                  "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  tab.badgeTone === "danger"
                    ? "bg-danger-bg text-danger"
                    : tab.badgeTone === "info"
                    ? "bg-info-bg text-brand-700"
                    : "bg-neutral-20 text-neutral-160",
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
