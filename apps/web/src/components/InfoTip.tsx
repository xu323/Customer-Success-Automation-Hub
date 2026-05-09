import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

/**
 * "(?)" icon with a popover that opens on click.
 */
export function InfoTip({
  children,
  ariaLabel = "More info",
  width = 320,
}: {
  children: ReactNode;
  ariaLabel?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-neutral-130 hover:text-brand-500 transition-colors"
      >
        <HelpCircle size={14} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-full mt-2 z-30 rounded border border-neutral-40 bg-white shadow-flyout p-3 text-xs text-neutral-160 leading-relaxed"
          style={{ width }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}
