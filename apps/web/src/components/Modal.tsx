import { useEffect, type ReactNode } from "react";

/**
 * Lightweight modal dialog. Open / close controlled by the parent. Click
 * outside the panel or press Esc to dismiss.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-[#0e1730] border border-ms-line rounded-lg shadow-2xl w-full ${width} max-h-[85vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-ms-line flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 className="font-semibold text-base">{title}</h2>
            {subtitle && <p className="text-xs text-ms-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md text-ms-muted hover:text-white hover:bg-white/5 flex items-center justify-center shrink-0"
            aria-label="Close"
          >
            <span aria-hidden className="text-base leading-none">✕</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-soft p-5">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-ms-line bg-white/[0.02] flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
