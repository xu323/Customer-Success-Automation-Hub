import { describe, it, expect, beforeAll } from "vitest";
import i18n, {
  STORAGE_KEY,
  SUPPORTED_LANGUAGES,
  getActiveLocale,
  normalizeLanguage,
} from "./index";

const SAMPLE_KEYS = [
  "common.appName",
  "common.appSubtitle",
  "common.demoBanner",
  "common.mockBadge",
  "common.errorTitle",
  "nav.dashboard",
  "nav.crm",
  "dashboard.title",
  "crm.title",
  "audit.events.empty",
];

beforeAll(async () => {
  await i18n.changeLanguage("zh-TW");
});

describe("normalizeLanguage", () => {
  it("maps any zh* variant to zh-TW", () => {
    for (const c of ["zh", "zh-CN", "zh-Hant", "zh-Hans-CN", "zh-tw", "ZH-TW"]) {
      expect(normalizeLanguage(c)).toBe("zh-TW");
    }
  });

  it("maps any en* variant to en", () => {
    for (const c of ["en", "en-US", "en-GB", "EN-us"]) {
      expect(normalizeLanguage(c)).toBe("en");
    }
  });

  it("maps any ja* variant to ja", () => {
    for (const c of ["ja", "ja-JP", "JA"]) {
      expect(normalizeLanguage(c)).toBe("ja");
    }
  });

  it("falls back to zh-TW for unsupported codes", () => {
    expect(normalizeLanguage("ko")).toBe("zh-TW");
    expect(normalizeLanguage("")).toBe("zh-TW");
    expect(normalizeLanguage(null)).toBe("zh-TW");
    expect(normalizeLanguage(undefined)).toBe("zh-TW");
  });
});

describe("i18n resources loaded for every supported language", () => {
  for (const lng of SUPPORTED_LANGUAGES) {
    it(`returns real translations (not raw keys) for ${lng}`, async () => {
      await i18n.changeLanguage(lng);
      expect(getActiveLocale()).toBe(lng);
      for (const key of SAMPLE_KEYS) {
        const value = i18n.t(key);
        expect(value, `key "${key}" was not translated for ${lng}`).not.toBe(key);
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      }
    });
  }
});

describe("language migrations & detector normalization", () => {
  it("language switching is persisted to localStorage with the canonical code", async () => {
    await i18n.changeLanguage("zh-TW");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("zh-TW");
    await i18n.changeLanguage("en");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("en");
    await i18n.changeLanguage("ja");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("ja");
  });

  it("zh-TW translations are distinct from en", async () => {
    await i18n.changeLanguage("zh-TW");
    const zh = i18n.t("dashboard.title");
    await i18n.changeLanguage("en");
    const en = i18n.t("dashboard.title");
    expect(zh).not.toBe(en);
  });
});
