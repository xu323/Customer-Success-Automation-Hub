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
    // Only load the active language. Without this, "zh-TW" would also load "zh",
    // which has no registered resources and surfaces raw keys.
    load: "currentOnly",
    // Keep code casing untouched so "zh-TW" matches our resource key exactly.
    cleanCode: false,
    lowerCaseLng: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
      // Whatever the detector finds (raw localStorage value, navigator.language
      // like "zh-Hant-TW", "en-GB" etc.), force it into one of our 3 codes.
      convertDetectedLanguage: (lng: string) => normalizeLanguage(lng),
    },
    returnNull: false,
  });

/** Active language for our app, always one of the 3 supported codes. */
export function getActiveLocale(): SupportedLanguage {
  return normalizeLanguage(i18n.resolvedLanguage ?? i18n.language ?? "zh-TW");
}

/** Map our language code to a BCP 47 code suitable for Intl.* APIs. */
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
