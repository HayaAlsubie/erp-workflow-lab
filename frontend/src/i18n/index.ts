import { ar } from "./ar";
import { en, type Messages } from "./en";

export type Locale = "en" | "ar";
export type { Messages };

export const dictionaries: Record<Locale, Messages> = { en, ar };

export const STORAGE_KEY = "erp-workflow-lab.locale";

export function detectLocale(): Locale {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "ar" || saved === "en") {
      return saved;
    }
  } catch {
    // localStorage may be unavailable in restricted contexts
  }
  return navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
}

export function applyDocumentLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.title = dictionaries[locale].app.documentTitle;
}

export function persistLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore quota / privacy-mode failures
  }
}

export function formatMessage(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    params[key] === undefined ? `{${key}}` : String(params[key]),
  );
}

export function localeTag(locale: Locale): string {
  return locale === "ar" ? "ar-SA" : "en-SA";
}
