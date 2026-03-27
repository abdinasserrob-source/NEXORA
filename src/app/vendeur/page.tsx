"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { usePreferences } from "@/components/PreferencesContext";

type SellerStats = {
  products: number;
  orders: number;
  ordersToday: number;
  outOfStockCount: number;
  revenueApprox: number;
  revenueLast7Days: { date: string; revenue: number }[];
  lowStockProducts: { id: string; name: string; slug: string; stock: number }[];
  recommendationStats: {
    impressions: number;
    clicks: number;
    purchases: number;
    ctr: number;
    conversionReco: number;
  };
};

type SellerOrder = {
  id: string;
  status: string;
  createdAt: string;
  customerLabel: string;
  sellerSubtotal: number;
};

export default function VendeurHomePage() {
  const { formatPrice } = usePreferences();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);

  const load = useCallback(async () => {
    const [st, od] = await Promise.all([
      fetch("/api/seller/stats", { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("stats");
        return r.json();
      }),
      fetch("/api/orders?seller=1", { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("orders");
        return r.json();
      }),
    ]);
    setStats(st);
    setOrders((od.orders ?? []).slice(0, 6));
  }, []);

  useEffect(() => {
    void load().catch(() =>
      toast.error("Impossible de charger le tableau de bord", { id: "vendeur-dashboard-load" })
    );
  }, [load]);

  const perf = stats?.recommendationStats;
  const maxRev =
    stats?.revenueLast7Days?.length ?
      Math.max(...stats.revenueLast7Days.map((x) => x.revenue), 1)
    : 1;

  return (
    <div className="px-4 py-8 md:px-8">
      <div>
        <h1 className="text-2xl font-bold text-shop-text">Tableau de bord</h1>
        <p className="mt-1 text-sm text-shop-muted">
          Vue d’ensemble : ventes, commandes, stock et performance des recommandations IA (vos données
          uniquement).
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Chiffre d’affaires (total)", value: formatPrice(stats?.revenueApprox ?? 0) },
          { label: "Commandes aujourd’hui", value: String(stats?.ordersToday ?? 0) },
          { label: "Produits actifs", value: String(stats?.products ?? 0) },
          { label: "En rupture", value: String(stats?.outOfStockCount ?? 0) },
          { label: "Reco — impressions (90j)", value: String(perf?.impressions ?? 0) },
          { label: "Ventes via reco (90j)", value: String(perf?.purchases ?? 0) },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-white/10 bg-nexora-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-shop-muted">
              {k.label}
            </div>
            <div className="mt-2 text-lg font-bold text-shop-text md:text-xl">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-nexora-card p-5">
          <h2 className="text-lg font-bold text-shop-text">Ventes (7 derniers jours)</h2>
          <p className="mt-1 text-xs text-shop-muted">CA issu de vos lignes de commande</p>
          <div className="mt-6 flex h-40 items-end gap-1">
            {(stats?.revenueLast7Days ?? []).length === 0 ?
              <p className="text-sm text-shop-muted">Pas encore de données sur cette période.</p>
            : (stats?.revenueLast7Days ?? []).map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full max-w-[28px] rounded-t bg-shop-cyan/60"
                    style={{ height: `${Math.max(8, (d.revenue / maxRev) * 100)}%` }}
                    title={`${d.date}: ${formatPrice(d.revenue)}`}
                  />
                  <span className="text-[9px] text-shop-muted">{d.date.slice(8)}</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-nexora-card p-5">
          <h2 className="text-lg font-bold text-shop-text">Performance IA (aperçu)</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-shop-muted">Clics</span>
              <div className="text-xl font-bold text-shop-text">{perf?.clicks ?? 0}</div>
            </div>
            <div>
              <span className="text-shop-muted">CTR / Conv.</span>
              <div className="text-xl font-bold text-shop-text">
                {perf?.ctr ? `${(perf.ctr * 100).toFixed(1)}%` : "0%"} ·{" "}
                {perf?.conversionReco ? `${(perf.conversionReco * 100).toFixed(1)}%` : "0%"}
              </div>
            </div>
          </div>
          <Link
            href="/vendeur/recommandations"
            className="mt-4 inline-block text-sm font-medium text-shop-cyan hover:underline"
          >
            Détails recommandations →
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-nexora-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-shop-text">Commandes récentes</h2>
            <Link href="/vendeur/commandes" className="text-xs font-medium text-shop-cyan hover:underline">
              Tout voir
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {orders.length === 0 ?
              <li className="text-shop-muted">Aucune commande.</li>
            : orders.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3"
                >
                  <span className="font-mono text-xs text-shop-muted">{o.id.slice(0, 10)}…</span>
                  <span className="text-shop-text">{o.customerLabel}</span>
                  <span className="text-shop-cyan">{formatPrice(o.sellerSubtotal)}</span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-shop-muted">
                    {o.status}
                  </span>
                </li>
              ))
            }
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-nexora-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-shop-text">Stock faible</h2>
            <Link href="/vendeur/produits" className="text-xs font-medium text-shop-cyan hover:underline">
              Gérer
            </Link>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {(stats?.lowStockProducts ?? []).length === 0 ?
              <li className="text-shop-muted">Aucune alerte (&gt; 0 et ≤ 5 unités).</li>
            : (stats?.lowStockProducts ?? []).map((p) => (
                <li key={p.id} className="flex justify-between gap-2">
                  <Link href={`/produit/${p.slug}`} className="text-shop-cyan hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-amber-200">{p.stock} restants</span>
                </li>
              ))
            }
          </ul>
        </div>
      </div>
    </div>
  );
}
