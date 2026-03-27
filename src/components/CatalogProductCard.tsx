"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import { usePreferences } from "@/components/PreferencesContext";

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  isPromo?: boolean;
  images: string[];
  brand?: { name: string } | null;
  ratingAvg?: number;
  reviewCount?: number;
  badge?: "bestseller" | "new" | null;
};

export function CatalogProductCard({
  product,
  index = 0,
}: {
  product: CatalogProduct;
  index?: number;
}) {
  const { formatPrice } = usePreferences();
  const img = product.images[0] ?? "https://placehold.co/400x400/f8f9fa/00b8d9?text=NEXORA";
  const brandName = product.brand?.name?.toUpperCase() ?? "NEXORA";
  const rating = product.ratingAvg ?? 4 + (index % 2) * 0.3;
  const reviews = product.reviewCount ?? 0;
  const badge =
    product.badge ??
    (product.isPromo ? "bestseller" : index % 4 === 0 ? "new" : null);

  const addCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(d.error ?? "Panier indisponible");
      return;
    }
    toast.success("Ajouté au panier");
  };

  const toggleWish = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const r = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ productId: product.id }),
    });
    if (r.status === 401) toast.error("Connectez-vous pour les favoris");
    else toast.success("Favori mis à jour");
  };

  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#e8eaef] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_24px_rgba(0,184,217,0.12)]"
    >
      <div className="relative aspect-square bg-[#f8f9fa]">
        <Image src={img} alt="" fill className="object-cover" sizes="280px" unoptimized />
        {badge === "bestseller" && (
          <span className="absolute left-3 top-3 rounded-md bg-[#ff6b35] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Best-seller
          </span>
        )}
        {badge === "new" && (
          <span className="absolute left-3 top-3 rounded-md bg-[#00b8d9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Nouveau
          </span>
        )}
        <button
          type="button"
          onClick={toggleWish}
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border border-[#e8eaef] bg-white/95 text-[#5c6578] shadow-sm hover:text-red-500"
          aria-label="Favoris"
        >
          <Heart className="size-4" />
        </button>
        <button
          type="button"
          onClick={addCart}
          className="absolute bottom-3 right-3 flex size-11 items-center justify-center rounded-full bg-[#00d4ff] text-white shadow-md transition hover:bg-[#00b8d9]"
          aria-label="Ajouter au panier"
        >
          <ShoppingCart className="size-5" />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold tracking-wide text-[#888]">{brandName}</p>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-[#333]">
          {product.name}
        </p>
        <div className="mt-2 flex items-center gap-1 text-amber-500">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= Math.round(rating) ? "text-amber-500" : "text-[#ddd]"}>
              ★
            </span>
          ))}
          <span className="text-xs text-[#888]">({reviews})</span>
        </div>
        <div className="mt-auto flex items-baseline gap-2 pt-3">
          <span className="text-lg font-bold text-[#333]">{formatPrice(product.price)}</span>
          {product.comparePrice != null && product.comparePrice > product.price && (
            <span className="text-sm text-[#aaa] line-through">
              {formatPrice(product.comparePrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
