"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ProductCard } from "@/components/ProductCard";

type VendorFav = {
  id: string;
  sellerUserId: string;
  shopName: string;
  seller: { id: string; name: string | null; avatar: string | null };
};

export function WishlistContent() {
  const sp = useSearchParams();
  const [tab, setTab] = useState<"produits" | "vendeurs">("produits");
  const [items, setItems] = useState<Parameters<typeof ProductCard>[0]["p"][]>([]);
  const [vendors, setVendors] = useState<VendorFav[]>([]);
  const [catalog, setCatalog] = useState<{ sellerUserId: string; shopName: string }[]>([]);
  const [pick, setPick] = useState("");

  async function parseJson<T>(r: Response, empty: T): Promise<T> {
    const t = await r.text();
    if (!t.trim()) return empty;
    try {
      return JSON.parse(t) as T;
    } catch {
      return empty;
    }
  }

  const loadProducts = () => {
    void fetch("/api/wishlist", { credentials: "include" }).then(async (r) => {
      const d = await parseJson<{ items?: { product: Parameters<typeof ProductCard>[0]["p"] }[] }>(r, {});
      setItems((d.items ?? []).map((x) => x.product));
    });
  };
  const loadVendors = () => {
    void fetch("/api/vendor-favorites", { credentials: "include" }).then(async (r) => {
      const d = await parseJson<{ favorites?: VendorFav[] }>(r, { favorites: [] });
      setVendors(Array.isArray(d.favorites) ? d.favorites : []);
    });
  };
  const loadCatalog = () => {
    void fetch("/api/vendors").then(async (r) => {
      const d = await parseJson<{ vendors?: { sellerUserId: string; shopName: string }[] }>(r, {});
      setCatalog((d.vendors ?? []).map((v) => v));
    });
  };

  useEffect(() => {
    loadProducts();
    loadVendors();
    loadCatalog();
  }, []);

  useEffect(() => {
    if (sp.get("tab") === "vendeurs") setTab("vendeurs");
  }, [sp]);

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Favoris</h1>
      <div className="mt-6 flex gap-2 border-b border-shop-border">
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "produits" ? "border-shop-cyan text-shop-cyan" : "border-transparent text-shop-muted"
          }`}
          onClick={() => setTab("produits")}
        >
          Produits
        </button>
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "vendeurs" ? "border-shop-cyan text-shop-cyan" : "border-transparent text-shop-muted"
          }`}
          onClick={() => setTab("vendeurs")}
        >
          Boutiques / vendeurs
        </button>
      </div>

      {tab === "produits" && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.length === 0 && <p className="col-span-full text-sm text-shop-muted">Aucun produit favori.</p>}
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {tab === "vendeurs" && (
        <div className="mt-6">
          <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="text-xs font-medium text-shop-muted">Ajouter une boutique suivie</label>
              <select
                className="mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-3 py-2 text-sm"
                value={pick}
                onChange={(e) => setPick(e.target.value)}
              >
                <option value="">Choisir…</option>
                {catalog.map((v) => (
                  <option key={v.sellerUserId} value={v.sellerUserId}>
                    {v.shopName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="rounded-xl bg-shop-cyan px-4 py-2 text-sm font-semibold text-white"
              onClick={async () => {
                if (!pick) return;
                const r = await fetch("/api/vendor-favorites", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ sellerUserId: pick }),
                });
                if (!r.ok) toast.error("Impossible d’ajouter");
                else {
                  toast.success("Boutique ajoutée");
                  setPick("");
                  loadVendors();
                }
              }}
            >
              Ajouter
            </button>
          </div>

          <ul className="mt-8 space-y-3">
            {vendors.length === 0 && <li className="text-sm text-shop-muted">Aucune boutique suivie.</li>}
            {vendors.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between rounded-2xl border border-shop-border bg-shop-bg px-4 py-3"
              >
                <Link href={`/boutique/${v.sellerUserId}`} className="font-medium text-shop-cyan hover:underline">
                  {v.shopName}
                </Link>
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={async () => {
                    await fetch(`/api/vendor-favorites?sellerUserId=${encodeURIComponent(v.sellerUserId)}`, {
                      method: "DELETE",
                      credentials: "include",
                    });
                    loadVendors();
                  }}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
