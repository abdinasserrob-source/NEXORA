"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

type SellerProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  isPromo: boolean;
  isFlagged: boolean;
  badge: string | null;
  images: string[];
  archived: boolean;
};

export default function VendeurProduitsPage() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        price: number;
        stock: number;
        isPromo: boolean;
        comparePrice: number | null;
        badge: string | null;
        isFlagged: boolean;
        archived: boolean;
      }
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/seller/products", { credentials: "include" });
    const d = await r.json();
    if (!r.ok) throw new Error();
    const list = (d.products ?? []) as SellerProduct[];
    setProducts(list);
    const next: typeof drafts = {};
    for (const p of list) {
      next[p.id] = {
        price: p.price,
        stock: p.stock,
        isPromo: p.isPromo,
        comparePrice: p.comparePrice ?? null,
        badge: p.badge ?? null,
        isFlagged: p.isFlagged,
        archived: p.archived,
      };
    }
    setDrafts(next);
  }, []);

  useEffect(() => {
    void load().catch(() => toast.error("Erreur chargement produits"));
  }, [load]);

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-shop-text">Mes produits</h1>
          <p className="mt-1 text-sm text-shop-muted">Uniquement vos références. Archiver retire du catalogue.</p>
        </div>
        <Link
          href="/vendeur/produits/nouveau"
          className="rounded-xl bg-shop-cyan px-4 py-2 text-sm font-semibold text-white"
        >
          Ajouter un produit
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10 bg-nexora-card p-4">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-shop-muted">
            <tr>
              <th className="px-2 py-2">Produit</th>
              <th className="px-2 py-2">Visuel</th>
              <th className="px-2 py-2">Prix</th>
              <th className="px-2 py-2">Stock</th>
              <th className="px-2 py-2">Promo</th>
              <th className="px-2 py-2">Prix barré</th>
              <th className="px-2 py-2">Badge</th>
              <th className="px-2 py-2">Archivé</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const d = drafts[p.id];
              if (!d) return null;
              return (
                <tr key={p.id} className="border-b border-white/5 align-top">
                  <td className="px-2 py-3">
                    <div className="font-medium text-shop-text">{p.name}</div>
                    <Link href={`/produit/${p.slug}`} className="text-xs text-shop-cyan hover:underline">
                      Voir fiche
                    </Link>
                  </td>
                  <td className="px-2 py-3">
                    <div className="relative size-12 overflow-hidden rounded-xl border border-white/10 bg-shop-bg">
                      {p.images[0] ?
                        <Image
                          src={p.images[0]}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      : <span className="flex size-full items-center justify-center text-[9px] text-shop-muted">—</span>}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 rounded-xl border border-white/10 bg-shop-bg px-2 py-1"
                      value={d.price}
                      onChange={(e) =>
                        setDrafts((m) => ({
                          ...m,
                          [p.id]: { ...d, price: Number(e.target.value) },
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="number"
                      min={0}
                      className="w-20 rounded-xl border border-white/10 bg-shop-bg px-2 py-1"
                      value={d.stock}
                      onChange={(e) =>
                        setDrafts((m) => ({
                          ...m,
                          [p.id]: { ...d, stock: Number(e.target.value) },
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-3">
                    <label className="flex items-center gap-2 text-shop-muted">
                      <input
                        type="checkbox"
                        checked={d.isPromo}
                        onChange={(e) =>
                          setDrafts((m) => ({
                            ...m,
                            [p.id]: { ...d, isPromo: e.target.checked },
                          }))
                        }
                      />
                      Promo
                    </label>
                  </td>
                  <td className="px-2 py-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="w-28 rounded-xl border border-white/10 bg-shop-bg px-2 py-1"
                      value={d.comparePrice ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setDrafts((m) => ({
                          ...m,
                          [p.id]: { ...d, comparePrice: raw === "" ? null : Number(raw) },
                        }));
                      }}
                    />
                  </td>
                  <td className="px-2 py-3">
                    <select
                      className="w-32 rounded-xl border border-white/10 bg-shop-bg px-2 py-1"
                      value={d.badge ?? ""}
                      onChange={(e) =>
                        setDrafts((m) => ({
                          ...m,
                          [p.id]: { ...d, badge: e.target.value || null },
                        }))
                      }
                    >
                      <option value="">—</option>
                      <option value="bestseller">Best-seller</option>
                      <option value="new">Nouveau</option>
                    </select>
                  </td>
                  <td className="px-2 py-3">
                    <label className="flex items-center gap-2 text-shop-muted">
                      <input
                        type="checkbox"
                        checked={d.archived}
                        onChange={(e) =>
                          setDrafts((m) => ({
                            ...m,
                            [p.id]: { ...d, archived: e.target.checked },
                          }))
                        }
                      />
                      Archivé
                    </label>
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      disabled={savingId === p.id}
                      className="rounded-xl bg-shop-cyan px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      onClick={async () => {
                        setSavingId(p.id);
                        const r = await fetch(`/api/seller/products/${p.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            price: d.price,
                            stock: d.stock,
                            isPromo: d.isPromo,
                            comparePrice: d.isPromo ? d.comparePrice : null,
                            badge: d.badge,
                            isFlagged: d.isFlagged,
                            archived: d.archived,
                          }),
                        });
                        setSavingId(null);
                        if (!r.ok) toast.error((await r.json().catch(() => ({}))).error ?? "Erreur");
                        else {
                          toast.success("Enregistré");
                          await load();
                        }
                      }}
                    >
                      {savingId === p.id ? "…" : "OK"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 ?
              <tr>
                <td colSpan={9} className="px-2 py-8 text-center text-shop-muted">
                  Aucun produit.{" "}
                  <Link href="/vendeur/produits/nouveau" className="text-shop-cyan hover:underline">
                    Créer le premier
                  </Link>
                </td>
              </tr>
            : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
