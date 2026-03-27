"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePreferences } from "@/components/PreferencesContext";

type Props = {
  vendeursHref: string;
  vendeursLabel?: string;
  notificationsHref: string;
};

export function RegionalPreferencesForm({ vendeursHref, vendeursLabel, notificationsHref }: Props) {
  const { refreshPreferences, t } = usePreferences();
  const [country, setCountry] = useState("");
  const [locale, setLocale] = useState("fr");
  const [currencyCode, setCurrencyCode] = useState("EUR");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        if (!u) return;
        setCountry(u.country ?? "");
        setLocale(u.locale ?? "fr");
        setCurrencyCode(u.currencyCode ?? "EUR");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sel =
    "mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-3 py-2.5 text-sm text-shop-text outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20";

  if (loading) {
    return <p className="text-sm text-shop-muted">{t("settings.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-shop-navy">{t("settings.regionTitle")}</h2>
        <p className="mt-1 text-sm text-shop-muted">{t("settings.regionHelp")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            {t("settings.country")}
            <input
              className={sel}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={t("settings.countryPh")}
            />
          </label>
          <label className="text-sm">
            {t("settings.language")}
            <select className={sel} value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            {t("settings.currency")}
            <select className={sel} value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="DJF">DJF</option>
            </select>
          </label>
        </div>
        <button
          type="button"
          className="mt-4 rounded-xl bg-shop-cyan px-6 py-2.5 text-sm font-semibold text-white"
          onClick={async () => {
            const r = await fetch("/api/me", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                country: country || null,
                locale,
                currencyCode,
              }),
            });
            if (!r.ok) {
              toast.error(t("settings.error"));
              return;
            }
            refreshPreferences();
            toast.success(t("settings.success"));
            load();
          }}
        >
          {t("settings.save")}
        </button>
      </section>

      <section className="border-t border-shop-border pt-8">
        <h2 className="text-lg font-semibold text-shop-navy">{t("settings.notificationsTitle")}</h2>
        <ul className="mt-4 space-y-3 text-sm">
          <li>
            <Link href={notificationsHref} className="font-medium text-shop-cyan hover:underline">
              {t("settings.notificationsLink")}
            </Link>
            <p className="text-xs text-shop-muted">{t("settings.notificationsHint")}</p>
          </li>
          <li>
            <Link href={vendeursHref} className="font-medium text-shop-cyan hover:underline">
              {vendeursLabel ?? t("account.sellerFollow")}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
