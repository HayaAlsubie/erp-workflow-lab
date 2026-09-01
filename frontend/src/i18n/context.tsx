/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyDocumentLocale,
  detectLocale,
  dictionaries,
  formatMessage,
  persistLocale,
  type Locale,
  type Messages,
} from "./index";

type I18nContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Messages;
  setLocale: (locale: Locale) => void;
  tf: (template: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    applyDocumentLocale(locale);
    persistLocale(locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      t: dictionaries[locale],
      setLocale: (next) => {
        setLocaleState(next);
      },
      tf: formatMessage,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
