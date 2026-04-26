import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import zhTW from "./locales/zh-TW";
import en from "./locales/en";
import ja from "./locales/ja";

export const SUPPORTED_LANGUAGES = ["zh-TW", "en", "ja"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, { native: string; flag: string }> = {
  "zh-TW": { native: "繁體中文", flag: "🇹🇼" },
  en: { native: "English", flag: "🇺🇸" },
  ja: { native: "日本語", flag: "🇯🇵" },
};

export const STORAGE_KEY = "csah-language";

const resources = {
  "zh-TW": { translation: zhTW },
  en: { translation: en },
  ja: { translation: ja },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    fallbackLng: "zh-TW",
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
    returnNull: false,
  });

// Locale used by Intl.* APIs.
export function getActiveLocale(): SupportedLanguage {
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? "zh-TW") as string;
  if ((SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
    return lang as SupportedLanguage;
  }
  // navigator could give us "zh", "zh-Hant", "ja-JP" etc.
  if (lang.toLowerCase().startsWith("ja")) return "ja";
  if (lang.toLowerCase().startsWith("zh")) return "zh-TW";
  if (lang.toLowerCase().startsWith("en")) return "en";
  return "zh-TW";
}

// Map our language codes to BCP 47 codes used by Intl.*.
export function intlLocale(lang: SupportedLanguage = getActiveLocale()): string {
  switch (lang) {
    case "zh-TW":
      return "zh-Hant-TW";
    case "ja":
      return "ja-JP";
    case "en":
    default:
      return "en-US";
  }
}

export default i18n;
