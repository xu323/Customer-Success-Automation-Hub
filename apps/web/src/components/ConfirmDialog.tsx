import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

/**
 * Replacement for native window.confirm. Wraps Radix AlertDialog. Use when a
 * destructive action needs explicit confirmation.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-neutral-190/40" />
        <AlertDialog.Content
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded border border-neutral-40 bg-white shadow-modal p-5 focus:outline-none"
        >
          <div className="flex items-start gap-3">
            {destructive && (
              <span className="text-danger shrink-0 mt-0.5">
                <AlertTriangle size={20} aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <AlertDialog.Title className="text-sm font-semibold text-neutral-190">
                {title}
              </AlertDialog.Title>
              {description && (
                <AlertDialog.Description className="text-xs text-neutral-130 mt-2 leading-relaxed">
                  {description}
                </AlertDialog.Description>
              )}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="h-8 px-3 rounded text-sm font-semibold border border-neutral-40 bg-white text-neutral-190 hover:bg-neutral-20"
              >
                {cancelLabel ?? t("common.cancel")}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={onConfirm}
                className={
                  "h-8 px-3 rounded text-sm font-semibold border text-white " +
                  (destructive
                    ? "bg-danger border-danger hover:opacity-90"
                    : "bg-brand-500 border-brand-500 hover:bg-brand-600")
                }
              >
                {confirmLabel ?? t("common.confirm")}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
