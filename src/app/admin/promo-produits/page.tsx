"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isFlagged: boolean;
  isPromo: boolean;
  comparePrice: number | null;
  promoPercent: number | null;
  promoAmount: number | null;
  badge: string | null;
  sellerLabel: string;
};

export default function AdminPromoProduitsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        stock: number;
        isFlagged: boolean;
        badge: string | null;
        isPromo: boolean;
        comparePrice: number | null;
        promoPercent: number | null;
        promoAmount: number | null;
      }
    >
  >({});

  useEffect(() => {
    void fetch("/api/admin/products", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = await r.json();
      const list = (d.products ?? []) as Row[];
      setRows(list);
      const next: typeof drafts = {};
      for (const p of list.filter((x) => !!x.isPromo)) {
        next[p.id] = {
          stock: p.stock ?? 0,
          isFlagged: p.isFlagged ?? false,
          badge: p.badge ?? null,
          isPromo: p.isPromo ?? false,
          comparePrice: p.comparePrice ?? null,
          promoPercent: p.promoPercent ?? null,
          promoAmount: p.promoAmount ?? null,
        };
      }
      setDrafts(next);
    });
  }, []);

  const promoRows = useMemo(() => rows.filter((r) => !!r.isPromo), [rows]);

  // Les drafts sont initialisés au moment du chargement/rechargement (pas dans un useEffect).

  if (err) {
    return (
      <main className="p-8 text-center text-[#666]">
        Accès refusé ou erreur de chargement.{" "}
        <Link href="/connexion?next=/admin/promo-produits" className="text-[#00b8d9]">
          Connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-x-auto px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Produits en promotion</h1>
      <p className="text-sm text-[#666]">Gestion des promos, stock et statut.</p>

      <table className="mt-6 w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[#e8eaef] bg-[#f8f9fa] text-xs uppercase text-[#888]">
          <tr>
            <th className="px-3 py-2">Produit</th>
            <th className="px-3 py-2">Vendeur</th>
            <th className="px-3 py-2">Prix EUR</th>
            <th className="px-3 py-2">Stock</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Badge</th>
            <th className="px-3 py-2">Prix barré</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>

        <tbody>
          {promoRows.map((p) => (
            <tr key={p.id} className="border-b border-[#f2f2f2]">
              <td className="px-3 py-2">
                <Link href={`/produit/${p.slug}`} className="font-medium text-[#00b8d9] hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-[#555]">{p.sellerLabel}</td>
              <td className="px-3 py-2">{p.price.toFixed(2)}</td>

              <td className="px-3 py-2">
                <input
                  className="w-24 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  type="number"
                  min={0}
                  value={drafts[p.id]?.stock ?? p.stock}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDrafts((m) => {
                      const cur =
                        m[p.id] ?? {
                          stock: p.stock,
                          isFlagged: p.isFlagged,
                          badge: p.badge,
                          isPromo: p.isPromo,
                          comparePrice: p.comparePrice,
                          promoPercent: p.promoPercent,
                          promoAmount: p.promoAmount,
                        };
                      return { ...m, [p.id]: { ...cur, stock: Number.isNaN(v) ? 0 : v } };
                    });
                  }}
                />
              </td>

              <td className="px-3 py-2">
                <select
                  className="w-28 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  value={drafts[p.id]?.isFlagged ? "FLAGGED" : "OK"}
                  onChange={(e) =>
                    setDrafts((m) => {
                      const cur =
                        m[p.id] ?? {
                          stock: p.stock,
                          isFlagged: p.isFlagged,
                          badge: p.badge,
                          isPromo: p.isPromo,
                          comparePrice: p.comparePrice,
                          promoPercent: p.promoPercent,
                          promoAmount: p.promoAmount,
                        };
                      return { ...m, [p.id]: { ...cur, isFlagged: e.target.value === "FLAGGED" } };
                    })
                  }
                >
                  <option value="OK">Actif</option>
                  <option value="FLAGGED">Signalé</option>
                </select>
              </td>

              <td className="px-3 py-2">
                <select
                  className="w-28 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  value={drafts[p.id]?.badge ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDrafts((m) => {
                      const cur =
                        m[p.id] ?? {
                          stock: p.stock,
                          isFlagged: p.isFlagged,
                          badge: p.badge,
                          isPromo: p.isPromo,
                          comparePrice: p.comparePrice,
                          promoPercent: p.promoPercent,
                          promoAmount: p.promoAmount,
                        };
                      return { ...m, [p.id]: { ...cur, badge: v ? v : null } };
                    });
                  }}
                >
                  <option value="">—</option>
                  <option value="bestseller">Best-seller</option>
                  <option value="new">Nouveau</option>
                </select>
              </td>

              <td className="px-3 py-2">
                <input
                  className="w-32 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Prix barré"
                  value={drafts[p.id]?.comparePrice ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const v = raw === "" ? null : Number(raw);
                    setDrafts((m) => {
                      const cur =
                        m[p.id] ?? {
                          stock: p.stock,
                          isFlagged: p.isFlagged,
                          badge: p.badge,
                          isPromo: p.isPromo,
                          comparePrice: p.comparePrice,
                          promoPercent: p.promoPercent,
                          promoAmount: p.promoAmount,
                        };
                      return { ...m, [p.id]: { ...cur, comparePrice: v } };
                    });
                  }}
                />
              </td>

              <td className="px-3 py-2">
                <button
                  type="button"
                  className="rounded-xl bg-[#00d4ff] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                  disabled={savingId === p.id}
                  onClick={async () => {
                    const d = drafts[p.id] ?? {
                      stock: p.stock ?? 0,
                      isFlagged: p.isFlagged ?? false,
                      badge: p.badge ?? null,
                      isPromo: true,
                      comparePrice: p.comparePrice ?? null,
                      promoPercent: p.promoPercent ?? null,
                      promoAmount: p.promoAmount ?? null,
                    };
                    setSavingId(p.id);
                    const r = await fetch(`/api/admin/products/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        stock: d.stock,
                        isFlagged: d.isFlagged,
                        badge: d.badge,
                        isPromo: true,
                        comparePrice: d.comparePrice,
                        promoPercent: d.promoPercent,
                        promoAmount: d.promoAmount,
                      }),
                    });
                    if (!r.ok) {
                      setSavingId(null);
                      return;
                    }
                    setSavingId(null);
                    const rr = await fetch("/api/admin/products", { credentials: "include" });
                    const dd = await rr.json().catch(() => ({}));
                    const list = (dd.products ?? []) as Row[];
                    setRows(list);
                    const next: typeof drafts = {};
                    for (const x of list.filter((y) => !!y.isPromo)) {
                      next[x.id] = {
                        stock: x.stock ?? 0,
                        isFlagged: x.isFlagged ?? false,
                        badge: x.badge ?? null,
                        isPromo: x.isPromo ?? false,
                        comparePrice: x.comparePrice ?? null,
                        promoPercent: x.promoPercent ?? null,
                        promoAmount: x.promoAmount ?? null,
                      };
                    }
                    setDrafts(next);
                  }}
                >
                  {savingId === p.id ? "…" : "Enregistrer"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

