"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { formatDisplayPrice, formatOrderAmountEur } from "@/lib/currency";
import { translate } from "@/i18n/translate";
import type { Locale } from "@/i18n/dictionaries";

type Prefs = {
  locale: string;
  currencyCode: string;
  ready: boolean;
  refreshPreferences: () => void;
  /** Traduction interface selon la langue du compte (persistée en base par utilisateur). */
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<
  Prefs & {
    formatPrice: (eur: number) => string;
    /** Commandes passées : toujours en EUR (montant contractuel). */
    formatOrderPrice: (eur: number) => string;
  }
>({
  locale: "fr",
  currencyCode: "EUR",
  ready: false,
  refreshPreferences: () => {},
  t: (key) => key,
  formatPrice: (eur) => `${eur.toFixed(2)} €`,
  formatOrderPrice: formatOrderAmountEur,
});

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function applyLangFromLocale(loc: string) {
  if (typeof document === "undefined") return;
  const isAr = loc === "ar";
  document.documentElement.lang = isAr ? "ar" : loc === "en" ? "en" : "fr";
  document.documentElement.dir = isAr ? "rtl" : "ltr";
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("fr");
  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [ready, setReady] = useState(false);

  const refreshPreferences = useCallback(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        if (u) {
          const l = (u.locale as Locale) ?? "fr";
          setLocale(l);
          setCurrencyCode(u.currencyCode ?? "EUR");
          applyLangFromLocale(String(l));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        if (u) {
          const l = (u.locale as Locale) ?? "fr";
          setLocale(l);
          setCurrencyCode(u.currencyCode ?? "EUR");
          applyLangFromLocale(String(l));
        } else {
          const c = readCookie("nexora_locale");
          if (c === "fr" || c === "en" || c === "ar") {
            setLocale(c);
            applyLangFromLocale(c);
          }
        }
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const formatPrice = useMemo(
    () => (eur: number) => formatDisplayPrice(eur, currencyCode, locale),
    [currencyCode, locale]
  );

  const formatOrderPrice = useMemo(() => (eur: number) => formatOrderAmountEur(eur), []);

  const value = useMemo(
    () => ({
      locale,
      currencyCode,
      ready,
      refreshPreferences,
      t,
      formatPrice,
      formatOrderPrice,
    }),
    [locale, currencyCode, ready, refreshPreferences, t, formatPrice, formatOrderPrice]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences() {
  return useContext(Ctx);
}
