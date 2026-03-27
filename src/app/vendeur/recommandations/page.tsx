"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type TopProduct = {
  productId: string;
  name: string;
  slug: string;
  impressions: number;
  clicks: number;
  purchases: number;
  ctr: number;
  conversionReco: number;
};

type PlacementRow = {
  placement: string;
  impressions: number;
  clicks: number;
  purchases: number;
};

type Stats = {
  recommendationStats: {
    impressions: number;
    clicks: number;
    purchases: number;
    ctr: number;
    conversionReco: number;
    bestPlacement: string | null;
  };
  topProducts: TopProduct[];
  suggestions: string[];
  placementBreakdown: PlacementRow[];
};

export default function VendeurRecoPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/seller/stats", { credentials: "include" });
    const d = await r.json();
    if (!r.ok) throw new Error();
    setStats(d);
  }, []);

  useEffect(() => {
    void load().catch(() =>
      toast.error("Chargement stats IA impossible", { id: "vendeur-reco-load" })
    );
  }, [load]);

  const perf = stats?.recommendationStats;
  const top = stats?.topProducts ?? [];
  const placements = stats?.placementBreakdown ?? [];
  const suggestions = stats?.suggestions ?? [];

  return (
    <div className="px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-shop-text">Recommandation IA</h1>
      <p className="mt-1 text-sm text-shop-muted">
        Métriques issues du suivi des emplacements (accueil, fiche produit, panier…). Vous n’avez pas accès aux
        données des autres vendeurs.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Impressions", v: perf?.impressions ?? 0 },
          { label: "Clics", v: perf?.clicks ?? 0 },
          { label: "Achats (attribués)", v: perf?.purchases ?? 0 },
          {
            label: "CTR / Conv.",
            v: `${perf?.ctr ? (perf.ctr * 100).toFixed(1) : "0"}% / ${perf?.conversionReco ? (perf.conversionReco * 100).toFixed(1) : "0"}%`,
          },
        ].map((x) => (
          <div key={x.label} className="rounded-2xl border border-white/10 bg-nexora-card p-4">
            <div className="text-xs text-shop-muted">{x.label}</div>
            <div className="mt-2 text-xl font-bold text-shop-text">{x.v}</div>
          </div>
        ))}
      </div>

      {perf?.bestPlacement ?
        <p className="mt-4 text-sm text-shop-muted">
          Combinaison la plus active : <strong className="text-shop-text">{perf.bestPlacement}</strong>
        </p>
      : null}

      <div className="mt-10 rounded-2xl border border-white/10 bg-nexora-card p-5">
        <h2 className="text-lg font-bold text-shop-text">Performance par emplacement</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[520px] w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-shop-muted">
              <tr>
                <th className="px-2 py-2">Placement</th>
                <th className="px-2 py-2">Impressions</th>
                <th className="px-2 py-2">Clics</th>
                <th className="px-2 py-2">Achats</th>
              </tr>
            </thead>
            <tbody>
              {placements.length === 0 ?
                <tr>
                  <td colSpan={4} className="px-2 py-4 text-shop-muted">
                    Pas encore de données.
                  </td>
                </tr>
              : placements.map((p) => (
                  <tr key={p.placement} className="border-b border-white/5">
                    <td className="px-2 py-2 font-mono text-xs">{p.placement}</td>
                    <td className="px-2 py-2">{p.impressions}</td>
                    <td className="px-2 py-2">{p.clicks}</td>
                    <td className="px-2 py-2">{p.purchases}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-nexora-card p-5">
        <h2 className="text-lg font-bold text-shop-text">Top produits (reco)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-shop-muted">
              <tr>
                <th className="px-2 py-2">Produit</th>
                <th className="px-2 py-2">Impr.</th>
                <th className="px-2 py-2">Clics</th>
                <th className="px-2 py-2">Achats</th>
                <th className="px-2 py-2">CTR</th>
                <th className="px-2 py-2">Conv.</th>
              </tr>
            </thead>
            <tbody>
              {top.length === 0 ?
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-shop-muted">
                    Pas encore assez de données.
                  </td>
                </tr>
              : top.map((p) => (
                  <tr key={p.productId} className="border-b border-white/5">
                    <td className="px-2 py-2">
                      <Link href={`/produit/${p.slug}`} className="text-shop-cyan hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{p.impressions}</td>
                    <td className="px-2 py-2">{p.clicks}</td>
                    <td className="px-2 py-2">{p.purchases}</td>
                    <td className="px-2 py-2">{p.ctr ? `${(p.ctr * 100).toFixed(1)}%` : "0%"}</td>
                    <td className="px-2 py-2">
                      {p.conversionReco ? `${(p.conversionReco * 100).toFixed(1)}%` : "0%"}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {suggestions.length > 0 ?
        <div className="mt-8 rounded-2xl border border-white/10 bg-nexora-card p-5">
          <h2 className="text-lg font-bold text-shop-text">Suggestions d’optimisation</h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-shop-muted">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      : null}
    </div>
  );
}
