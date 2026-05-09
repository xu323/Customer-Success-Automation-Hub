import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import zhTW from "./locales/zh-TW";
import en from "./locales/en";
import ja from "./locales/ja";

export const SUPPORTED_LANGUAGES = ["zh-TW", "en", "ja"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, { native: string; short: string }> = {
  "zh-TW": { native: "繁體中文", short: "繁中" },
  en: { native: "English", short: "EN" },
  ja: { native: "日本語", short: "日本語" },
};

export const STORAGE_KEY = "csah-language";

const resources = {
  "zh-TW": { translation: zhTW },
  en: { translation: en },
  ja: { translation: ja },
} as const;

/**
 * Map any incoming language code (browser, localStorage, detector) to one of
 * our three supported codes. Handles "zh", "zh-Hant", "zh-Hans-CN", "zh-tw",
 * "en-US", "ja-JP", "ja-jp" etc.
 */
export function normalizeLanguage(code: string | null | undefined): SupportedLanguage {
  if (!code) return "zh-TW";
  const lower = code.toLowerCase();
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("en")) return "en";
  if (lower.startsWith("zh")) return "zh-TW";
  return "zh-TW";
}

// One-time migration: if localStorage has a stale value (e.g. "zh", "zh-Hant",
// "zh-CN", or anything outside our 3 supported codes), normalize it BEFORE
// i18next's LanguageDetector reads it.
if (typeof window !== "undefined") {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const normalized = normalizeLanguage(raw);
      if (normalized !== raw) {
        window.localStorage.setItem(STORAGE_KEY, normalized);
      }
    }
  } catch {
    /* localStorage unavailable (private mode etc.) — ignore */
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    fallbackLng: "zh-TW",
    load: "currentOnly",
    cleanCode: false,
    lowerCaseLng: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
      convertDetectedLanguage: (lng: string) => normalizeLanguage(lng),
    },
    returnNull: false,
  });

export function getActiveLocale(): SupportedLanguage {
  return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language ?? "zh-TW");
}

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
