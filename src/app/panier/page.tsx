"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { usePreferences } from "@/components/PreferencesContext";

type Item = {
  id: string;
  quantity: number;
  product: { id: string; name: string; slug: string; price: number; images: string[] };
};

async function readJsonBody<T>(r: Response, fallback: T): Promise<T> {
  const text = await r.text();
  if (!text.trim()) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export default function CartPage() {
  const { formatPrice } = usePreferences();
  const [items, setItems] = useState<Item[]>([]);
  const [reco, setReco] = useState<Parameters<typeof ProductCard>[0]["p"][]>([]);

  const load = () => {
    void fetch("/api/cart", { credentials: "include" }).then(async (r) => {
      const d = await readJsonBody<{ items?: Item[] }>(r, { items: [] });
      setItems(Array.isArray(d.items) ? d.items : []);
    });
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const ids = items.map((i) => i.product.id).join(",");
    if (!ids) {
      setReco([]);
      return;
    }
    void fetch(`/api/recommendations?placement=CART_CROSS&cart=${encodeURIComponent(ids)}&record=1`, {
      credentials: "include",
    }).then(async (r) => {
      const d = await readJsonBody<{ recommendations?: Parameters<typeof ProductCard>[0]["p"][] }>(
        r,
        { recommendations: [] }
      );
      setReco(Array.isArray(d.recommendations) ? d.recommendations : []);
    });
  }, [items]);

  const patch = async (itemId: string, quantity: number) => {
    await fetch("/api/cart", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ itemId, quantity }),
    });
    load();
  };

  const subtotal = items.reduce((a, i) => a + i.product.price * i.quantity, 0);

  const inpQty =
    "w-24 rounded-xl border border-slate-200 bg-white py-2 text-center text-sm font-semibold text-slate-900 shadow-inner";

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-20 pt-8 text-slate-900">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-600">
              {items.length} article{items.length > 1 ? "s" : ""}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">Votre panier</h1>
            <p className="mt-2 text-sm text-slate-600">Livraison calculée à l’étape commande.</p>
          </div>
          <Link
            href="/categories"
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700 hover:underline"
          >
            Continuer les achats
          </Link>
        </div>

        {items.length === 0 ?
          <div className="mt-16 rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm">
            <ShoppingBag className="mx-auto size-12 text-slate-300" />
            <p className="mt-4 text-lg font-medium text-slate-800">Panier vide</p>
            <p className="mt-1 text-sm text-slate-500">Ajoutez des produits depuis le catalogue.</p>
            <Link
              href="/categories"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 hover:bg-cyan-600"
            >
              Explorer le catalogue
              <ArrowRight className="size-4" />
            </Link>
          </div>
          : <div className="mt-10 grid gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {items.map((i) => (
                <div
                  key={i.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="relative mx-auto size-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:mx-0">
                    <Image
                      src={i.product.images[0] ?? ""}
                      alt={i.product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <Link
                      href={`/produit/${i.product.slug}`}
                      className="font-semibold text-slate-900 hover:text-cyan-600"
                    >
                      {i.product.name}
                    </Link>
                    <p className="mt-1 text-sm text-cyan-600">{formatPrice(i.product.price)}</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 sm:justify-end">
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                      <button
                        type="button"
                        className="px-3 py-2 text-slate-600 hover:text-cyan-600"
                        onClick={() => void patch(i.id, Math.max(0, i.quantity - 1))}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        className={inpQty}
                        value={i.quantity}
                        onChange={(e) => {
                          const q = Number(e.target.value);
                          void patch(i.id, q);
                          if (q <= 0) toast.success("Article retiré");
                        }}
                      />
                      <button
                        type="button"
                        className="px-3 py-2 text-slate-600 hover:text-cyan-600"
                        onClick={() => void patch(i.id, i.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:border-red-200 hover:text-red-500"
                      aria-label="Retirer"
                      onClick={() => void patch(i.id, 0)}
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
                <h2 className="text-lg font-bold text-slate-900">Récapitulatif</h2>
                <div className="mt-4 space-y-2 border-b border-slate-100 pb-4 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total</span>
                    <span className="font-medium text-slate-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Livraison</span>
                    <span className="text-cyan-600">À l’étape suivante</span>
                  </div>
                </div>
                <div className="mt-4 flex justify-between text-base font-bold text-slate-900">
                  <span>Total estimé</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <Link
                  href="/commande"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-cyan-700"
                >
                  Commander
                  <ArrowRight className="size-4" />
                </Link>
                <p className="mt-4 text-center text-[10px] text-slate-400">Paiement sécurisé</p>
              </div>
            </div>
          </div>
        }

        {reco.length > 0 && (
          <section className="mt-16 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Complétez votre commande</h2>
            <p className="mt-1 text-sm text-slate-500">Suggestions IA & compléments.</p>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {reco.map((p) => (
                <ProductCard key={p.id} p={p} placement="CART_CROSS" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
