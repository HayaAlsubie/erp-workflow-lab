import type { Locale } from "../i18n";
import { localeTag } from "../i18n";

export function formatMoney(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale), {
    style: "currency",
    currency: "SAR",
    currencyDisplay: locale === "ar" ? "name" : "symbol",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTag(locale)).format(value);
}

export function formatDateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatRequestId(id: number): string {
  return `PR-${String(id).padStart(4, "0")}`;
}
