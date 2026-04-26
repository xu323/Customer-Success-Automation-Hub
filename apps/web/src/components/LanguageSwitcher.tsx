import { useTranslation } from "react-i18next";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const current = (() => {
    const code = (i18n.resolvedLanguage ?? i18n.language ?? "zh-TW") as string;
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(code)) return code as SupportedLanguage;
    if (code.toLowerCase().startsWith("ja")) return "ja";
    if (code.toLowerCase().startsWith("zh")) return "zh-TW";
    if (code.toLowerCase().startsWith("en")) return "en";
    return "zh-TW";
  })();

  const handleChange = (lang: SupportedLanguage) => {
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
              "px-2 py-1 rounded-sm text-xs transition-colors flex items-center gap-1 " +
              (active
                ? "bg-ms-blue/20 text-white"
                : "text-ms-muted hover:text-white hover:bg-white/5")
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
