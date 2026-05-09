import { useTranslation } from "react-i18next";
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  getActiveLocale,
  type SupportedLanguage,
} from "@/i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  // Re-evaluated on every render; useTranslation triggers a re-render whenever
  // i18n.language changes, so this stays in sync with the active locale.
  const current = getActiveLocale();

  const handleChange = (lang: SupportedLanguage) => {
    if (lang === current) return;
    void i18n.changeLanguage(lang);
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-md border border-ms-line bg-white/[0.03] p-0.5"
      role="group"
      aria-label={t("common.languageSwitcher")}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = lang === current;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handleChange(lang)}
            aria-pressed={active}
            className={
              "px-2.5 py-1 rounded-sm text-xs transition-colors flex items-center gap-1 whitespace-nowrap " +
              (active
                ? "bg-ms-blue/25 text-white font-semibold ring-1 ring-inset ring-ms-blue/70"
                : "text-slate-400 hover:text-white hover:bg-white/5")
            }
            title={LANGUAGE_LABELS[lang].native}
          >
            <span aria-hidden>{LANGUAGE_LABELS[lang].flag}</span>
            <span className="font-medium">{LANGUAGE_LABELS[lang].native}</span>
          </button>
        );
      })}
    </div>
  );
}
