"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePreferences } from "@/components/PreferencesContext";

export function Footer() {
  const { t } = usePreferences();
  const year = new Date().getFullYear();
  const [adminHref, setAdminHref] = useState("/connexion?next=/admin");

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.role === "ADMIN") setAdminHref("/admin");
        else setAdminHref("/connexion?next=/admin");
      })
      .catch(() => setAdminHref("/connexion?next=/admin"));
  }, []);

  return (
    <footer className="mt-16 border-t border-shop-border bg-shop-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2 text-lg font-bold text-shop-navy">
            <Image
              src="/brand/nexora-logo.svg"
              alt="NEXORA"
              width={32}
              height={32}
              className="size-8 rounded-md"
              unoptimized
              priority
            />
            NEXORA
          </p>
          <p className="mt-3 text-sm leading-relaxed text-shop-muted">{t("footer.tagline")}</p>
        </div>
        <div>
          <p className="font-semibold text-shop-text">{t("footer.quickLinks")}</p>
          <ul className="mt-3 space-y-2 text-sm text-shop-muted">
            <li>
              <Link href="/suivi" className="hover:text-shop-cyan">
                {t("footer.followOrder")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-shop-cyan">
                {t("footer.faq")}
              </Link>
            </li>
            <li>
              <Link href={adminHref} className="hover:text-shop-cyan">
                {t("footer.adminDash")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-shop-text">{t("footer.support")}</p>
          <ul className="mt-3 space-y-2 text-sm text-shop-muted">
            <li>
              <Link href="/faq" className="hover:text-shop-cyan">
                {t("footer.helpCenter")}
              </Link>
            </li>
            <li>
              <Link href="/commande" className="hover:text-shop-cyan">
                {t("footer.shipping")}
              </Link>
            </li>
            <li>contact@nexora.shop</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-shop-text">{t("footer.contact")}</p>
          <ul className="mt-3 space-y-2 text-sm text-shop-muted">
            <li>12 Balbala, 77105 Djibouti</li>
            <li>+253 77 24 09 95</li>
            <li>support@nexora.shop</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-shop-border pb-8 pt-6 text-center text-xs text-shop-muted">
        {t("footer.copyright", { year })}
      </p>
    </footer>
  );
}
