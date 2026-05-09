import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Search,
  FileText,
  Loader2,
} from "lucide-react";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 text-neutral-130 text-sm">
      <Loader2 size={14} className="animate-spin" aria-hidden />
      {label ?? t("common.loading")}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div
      role="alert"
      className="rounded border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger flex items-start gap-2"
    >
      <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />
      <div>
        <div className="font-semibold mb-0.5">{t("common.errorTitle")}</div>
        <div className="opacity-90 break-all">{message}</div>
      </div>
    </div>
  );
}

const ICONS = {
  default: FileText,
  search: Search,
  success: CheckCircle2,
  inbox: Inbox,
  alert: AlertTriangle,
} as const;

/**
 * Empty state with a lucide icon, title, optional description and a CTA slot.
 */
export function EmptyState({
  illustration = "default",
  title,
  description,
  action,
}: {
  illustration?: keyof typeof ICONS;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  const Icon = ICONS[illustration];
  const tone =
    illustration === "success"
      ? "text-success"
      : illustration === "alert"
      ? "text-warning"
      : "text-brand-500";
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <div className={`mb-3 ${tone}`}>
        <Icon size={36} strokeWidth={1.5} aria-hidden />
      </div>
      <div className="text-sm font-semibold text-neutral-190 mb-1">{title}</div>
      {description && (
        <div className="text-xs text-neutral-130 max-w-md mb-4 leading-relaxed">
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
