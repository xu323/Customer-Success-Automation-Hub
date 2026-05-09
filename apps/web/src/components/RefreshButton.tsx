import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { formatRelative } from "@/lib/format";

/**
 * "Last updated 2m ago" + circular refresh icon. Re-renders the relative time
 * every 30 seconds so it stays accurate while the page sits open.
 */
export function RefreshButton({
  isFetching,
  lastUpdated,
  onRefresh,
}: {
  isFetching: boolean;
  lastUpdated?: number | null;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const updatedLabel = lastUpdated
    ? t("common.lastUpdated", {
        time: formatRelative(new Date(lastUpdated).toISOString()),
      })
    : t("common.notLoadedYet");

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-130">
      <span className="hidden md:inline whitespace-nowrap">{updatedLabel}</span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isFetching}
        title={t("common.refresh")}
        aria-label={t("common.refresh")}
        className="h-8 w-8 rounded border border-neutral-40 bg-white text-neutral-130 hover:text-neutral-190 hover:bg-neutral-20 transition-colors flex items-center justify-center disabled:opacity-50"
      >
        <RefreshCw
          size={14}
          strokeWidth={1.75}
          aria-hidden
          className={isFetching ? "animate-spin" : ""}
        />
      </button>
    </div>
  );
}
