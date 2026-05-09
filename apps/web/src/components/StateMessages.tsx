import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 text-ms-muted text-sm">
      <span className="inline-block h-3 w-3 rounded-full bg-ms-blue animate-pulse" />
      {label ?? t("common.loading")}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      <div className="font-semibold mb-1">{t("common.errorTitle")}</div>
      <div className="opacity-80 break-all">{message}</div>
    </div>
  );
}

/**
 * Empty state with an SVG illustration, title, optional description and a
 * call-to-action slot. Use for any "this list has 0 items" situation.
 */
export function EmptyState({
  illustration = "default",
  title,
  description,
  action,
}: {
  illustration?: "default" | "search" | "success" | "inbox" | "alert";
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className="mb-4 opacity-60">
        <Illustration kind={illustration} />
      </div>
      <div className="text-sm font-medium text-ms-text mb-1">{title}</div>
      {description && (
        <div className="text-xs text-ms-muted max-w-md mb-4 leading-relaxed">
          {description}
        </div>
      )}
      {action}
    </div>
  );
}

function Illustration({ kind }: { kind: "default" | "search" | "success" | "inbox" | "alert" }) {
  const stroke = "rgba(0, 120, 212, 0.55)";
  const fill = "rgba(0, 120, 212, 0.08)";
  const subtle = "rgba(255, 255, 255, 0.18)";
  if (kind === "search") {
    return (
      <svg width="84" height="84" viewBox="0 0 84 84" fill="none" aria-hidden>
        <circle cx="36" cy="36" r="22" fill={fill} stroke={stroke} strokeWidth="2" />
        <line x1="52" y1="52" x2="68" y2="68" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <line x1="30" y1="36" x2="42" y2="36" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "success") {
    return (
      <svg width="84" height="84" viewBox="0 0 84 84" fill="none" aria-hidden>
        <circle cx="42" cy="42" r="28" fill={fill} stroke={stroke} strokeWidth="2" />
        <path
          d="M30 42 L40 52 L56 34"
          stroke="rgba(16, 185, 129, 0.9)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }
  if (kind === "inbox") {
    return (
      <svg width="84" height="84" viewBox="0 0 84 84" fill="none" aria-hidden>
        <rect x="14" y="22" width="56" height="42" rx="4" fill={fill} stroke={stroke} strokeWidth="2" />
        <path d="M14 44 L30 44 L34 52 L50 52 L54 44 L70 44" stroke={stroke} strokeWidth="2" fill="none" strokeLinejoin="round" />
        <line x1="24" y1="32" x2="60" y2="32" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "alert") {
    return (
      <svg width="84" height="84" viewBox="0 0 84 84" fill="none" aria-hidden>
        <path d="M42 14 L72 64 L12 64 Z" fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <line x1="42" y1="32" x2="42" y2="48" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
        <circle cx="42" cy="56" r="2" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" fill="none" aria-hidden>
      <rect x="14" y="20" width="56" height="44" rx="4" fill={fill} stroke={stroke} strokeWidth="2" />
      <line x1="22" y1="32" x2="50" y2="32" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="40" x2="62" y2="40" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="48" x2="44" y2="48" stroke={subtle} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
