"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <main className="flex-1 px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <BarChart3 className="size-8 text-[#00d4ff]" />
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">Analytics</h1>
          <p className="text-sm text-[#666]">
            Indicateurs détaillés : utilisez l&apos;export CSV depuis le tableau de bord ou consultez les métriques
            recommandations sur la page d&apos;accueil admin.
          </p>
        </div>
      </div>
      <p className="mt-6 text-sm text-[#555]">
        Les graphiques du dashboard principal reflètent l&apos;activité en base. Pour aller plus loin, branchez un outil
        BI sur votre export ou enrichissez{" "}
        <code className="rounded bg-[#f0f0f0] px-1">/api/admin/reports</code>.
      </p>
      <Link href="/admin" className="mt-6 inline-block text-sm font-medium text-[#00b8d9] hover:underline">
        ← Retour au tableau de bord
      </Link>
    </main>
  );
}
