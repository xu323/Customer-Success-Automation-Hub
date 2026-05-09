import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * "(?)" icon with a popover that opens on click. Used to replace permanent
 * tutorial blocks while keeping the explanation available on demand.
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
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-ms-line text-ms-muted hover:text-white hover:border-ms-blue/60 transition-colors text-[10px] font-bold"
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          className="absolute right-0 top-full mt-2 z-30 rounded-md border border-ms-line bg-[#0e1730] shadow-xl p-3 text-xs text-ms-muted leading-relaxed"
          style={{ width }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}
