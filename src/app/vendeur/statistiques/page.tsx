"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { usePreferences } from "@/components/PreferencesContext";

type Stats = {
  products: number;
  orders: number;
  ordersToday: number;
  revenueApprox: number;
  revenueLast7Days: { date: string; revenue: number }[];
  outOfStockCount: number;
  topProducts: {
    productId: string;
    name: string;
    slug: string;
    impressions: number;
    clicks: number;
    purchases: number;
  }[];
};

export default function VendeurStatistiquesPage() {
  const { formatPrice } = usePreferences();
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/seller/stats", { credentials: "include" });
    const d = await r.json();
    if (!r.ok) throw new Error();
    setStats(d);
  }, []);

  useEffect(() => {
    void load().catch(() =>
      toast.error("Chargement statistiques impossible", { id: "vendeur-stats-load" })
    );
  }, [load]);

  const maxRev =
    stats?.revenueLast7Days?.length ?
      Math.max(...stats.revenueLast7Days.map((x) => x.revenue), 1)
    : 1;

  return (
    <div className="px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-shop-text">Statistiques</h1>
      <p className="mt-1 text-sm text-shop-muted">Indicateurs limités à votre activité.</p>

      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Produits", v: stats?.products ?? 0 },
          { label: "Commandes (hors annulées)", v: stats?.orders ?? 0 },
          { label: "Aujourd’hui", v: stats?.ordersToday ?? 0 },
          { label: "CA cumulé", v: formatPrice(stats?.revenueApprox ?? 0) },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border border-white/10 bg-nexora-card p-4">
            <div className="text-xs text-shop-muted">{x.label}</div>
            <div className="mt-2 text-lg font-bold text-shop-text">{x.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-nexora-card p-5">
        <h2 className="text-lg font-bold text-shop-text">CA sur 7 jours</h2>
        <div className="mt-6 flex h-48 items-end gap-1">
          {(stats?.revenueLast7Days ?? []).length === 0 ?
            <p className="text-sm text-shop-muted">Pas de ventes sur cette fenêtre.</p>
          : (stats?.revenueLast7Days ?? []).map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full max-w-[36px] rounded-t bg-emerald-500/50"
                  style={{ height: `${Math.max(10, (d.revenue / maxRev) * 100)}%` }}
                  title={`${d.date}: ${formatPrice(d.revenue)}`}
                />
                <span className="rotate-45 text-[8px] text-shop-muted">{d.date.slice(5)}</span>
              </div>
            ))
          }
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-nexora-card p-5">
        <h2 className="text-lg font-bold text-shop-text">Produits les plus exposés (reco)</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(stats?.topProducts ?? []).length === 0 ?
            <li className="text-shop-muted">—</li>
          : (stats?.topProducts ?? []).map((p) => (
              <li key={p.productId} className="flex justify-between gap-2 border-b border-white/5 py-2">
                <Link href={`/produit/${p.slug}`} className="text-shop-cyan hover:underline">
                  {p.name}
                </Link>
                <span className="text-shop-muted">
                  {p.impressions} impr. · {p.clicks} clics · {p.purchases} achats
                </span>
              </li>
            ))
          }
        </ul>
      </div>

      <p className="mt-6 text-xs text-shop-muted">
        Ruptures : <strong className="text-shop-text">{stats?.outOfStockCount ?? 0}</strong> produits à stock 0.
      </p>
    </div>
  );
}
