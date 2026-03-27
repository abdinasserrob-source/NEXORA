"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePreferences } from "@/components/PreferencesContext";
import { ProductCard } from "./ProductCard";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
};

export function ProductActions({
  product,
  cross,
  upsell,
  recent,
  variant = "dark",
}: {
  product: Product;
  cross: Product[];
  upsell: Product[];
  recent: Product[];
  variant?: "dark" | "light";
}) {
  const { formatPrice } = usePreferences();
  const [qty, setQty] = useState(1);
  const isLight = variant === "light";

  useEffect(() => {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: "PRODUCT_VIEW",
        productId: product.id,
        path: window.location.pathname,
        meta: { t: Date.now() },
      }),
    });
  }, [product.id]);

  const add = async () => {
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId: product.id, quantity: qty }),
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      toast.error(e.error ?? "Erreur panier");
      return;
    }
    toast.success("Ajouté au panier");
  };

  return (
    <div className="space-y-10">
      <p className={isLight ? "text-slate-600" : "text-nexora-muted"}>{product.description}</p>
      <p className={`text-3xl font-bold ${isLight ? "text-cyan-600" : "text-nexora-cyan"}`}>
        {formatPrice(product.price)}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={1}
          max={product.stock}
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className={
            isLight ?
              "w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm"
            : "w-20 rounded-xl border border-white/10 bg-nexora-card px-3 py-2"
          }
        />
        <button
          type="button"
          onClick={() => void add()}
          disabled={product.stock <= 0}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 font-semibold disabled:opacity-40 ${
            isLight ?
              "bg-cyan-500 text-white shadow-md shadow-cyan-500/25 hover:bg-cyan-600"
            : "bg-nexora-cyan text-nexora-bg"
          }`}
        >
          Ajouter au panier
        </button>
      </div>

      {upsell.length > 0 && (
        <div>
          <h3 className={`text-lg font-semibold ${isLight ? "text-slate-900" : ""}`}>
            Passez à la version supérieure
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {upsell.map((p) => (
              <ProductCard key={p.id} p={p} placement="PRODUCT_UPSELL" />
            ))}
          </div>
        </div>
      )}

      {cross.length > 0 && (
        <div>
          <h3 className={`text-lg font-semibold ${isLight ? "text-slate-900" : ""}`}>
            Les clients ont aussi aimé
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {cross.map((p) => (
              <ProductCard key={p.id} p={p} placement="PRODUCT_CROSS" />
            ))}
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className={`text-lg font-semibold ${isLight ? "text-slate-900" : ""}`}>
            Récemment consultés
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {recent.map((p) => (
              <ProductCard key={p.id} p={p} placement="SIDEBAR_RECENT" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
