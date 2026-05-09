import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  getActiveLocale,
  type SupportedLanguage,
} from "@/i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = getActiveLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleChange = (lang: SupportedLanguage) => {
    if (lang !== current) void i18n.changeLanguage(lang);
    setOpen(false);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t("common.languageSwitcher")}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded border border-neutral-40 bg-white text-neutral-160 hover:bg-neutral-20 hover:text-neutral-190 transition-colors text-xs font-semibold"
      >
        <Globe size={14} aria-hidden />
        <span>{LANGUAGE_LABELS[current].native}</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 min-w-[160px] rounded border border-neutral-40 bg-white shadow-flyout overflow-hidden"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = lang === current;
            return (
              <button
                key={lang}
                role="menuitem"
                type="button"
                onClick={() => handleChange(lang)}
                className={
                  "w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left transition-colors " +
                  (active
                    ? "bg-brand-50 text-brand-700 font-semibold"
                    : "text-neutral-190 hover:bg-neutral-20")
                }
              >
                <span>{LANGUAGE_LABELS[lang].native}</span>
                {active && <Check size={14} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
