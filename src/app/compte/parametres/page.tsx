"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RegionalPreferencesForm } from "@/components/account/RegionalPreferencesForm";
import { usePreferences } from "@/components/PreferencesContext";

export default function ParametresPage() {
  const { t } = usePreferences();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setEmail(d.user?.email ?? "");
        setRole(d.user?.role ?? null);
      });
  }, []);

  const vendeursHref =
    role === "SELLER" ? "/compte/vendeur" : "/compte/favoris?tab=vendeurs";
  const vendeursLabel =
    role === "SELLER" ? t("account.sellerShop") : t("account.sellerFollow");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "/";
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">{t("settings.title")}</h1>
      <p className="mt-1 text-sm text-shop-muted">{t("settings.connectedAs", { email })}</p>

      <div className="mt-8">
        <RegionalPreferencesForm
          notificationsHref="/compte/notifications"
          vendeursHref={vendeursHref}
          vendeursLabel={vendeursLabel}
        />
      </div>

      <ul className="mt-10 space-y-2 border-t border-shop-border pt-8 text-sm">
        <li>
          <Link href="/compte/profil" className="text-shop-cyan hover:underline">
            {t("account.profilLink")}
          </Link>
        </li>
        <li>
          <Link href="/faq" className="text-shop-cyan hover:underline">
            {t("account.faqLink")}
          </Link>
        </li>
        <li>
          <Link href="/compte/abonnement" className="text-shop-cyan hover:underline">
            {t("account.subLink")}
          </Link>
        </li>
      </ul>

      <div className="mt-10 border-t border-shop-border pt-8">
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800"
        >
          {t("account.disconnect")}
        </button>
      </div>
    </>
  );
}
