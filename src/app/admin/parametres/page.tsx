"use client";

import { useEffect, useState } from "react";
import { RegionalPreferencesForm } from "@/components/account/RegionalPreferencesForm";
import { usePreferences } from "@/components/PreferencesContext";

export default function AdminParametresPage() {
  const { t } = usePreferences();
  const [email, setEmail] = useState("");

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? ""));
  }, []);

  return (
    <main className="flex-1 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">{t("settings.adminTitle")}</h1>
      <p className="mt-1 text-sm text-[#666]">{t("settings.adminAccount", { email })}</p>
      <div className="mt-8 max-w-2xl rounded-2xl border border-[#e8eaef] bg-white p-6 shadow-sm">
        <RegionalPreferencesForm
          notificationsHref="/admin/notifications"
          vendeursHref="/admin/vendeurs"
          vendeursLabel={t("admin.vendorsLink")}
        />
      </div>
    </main>
  );
}
