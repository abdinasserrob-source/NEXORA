"use client";

import Image from "next/image";
import Link from "next/link";
import { usePreferences } from "@/components/PreferencesContext";

type P = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
  algorithm?: string;
  /** Score affiché (ex. score01 0–1 pour les reco) */
  score?: number;
  recoReason?: string;
  comparePrice?: number | null;
  discountPct?: number | null;
  badge?: string;
  soldHint?: string;
  /** Extrait description (recherche, grille promo) */
  description?: string;
};

export function ProductCard({
  p,
  placement,
  variant = "default",
  aiMatchPercent,
  showLimited,
  recoPlacement,
}: {
  p: P;
  placement?: string;
  variant?: "default" | "flash" | "trend" | "search";
  /** Mode grille recommandations (badge + justification) */
  recoPlacement?: boolean;
  /** Badge type maquette « IA » (pourcentage fictif ou issu d’un score) */
  aiMatchPercent?: number;
  /** Badge orange type « LIMITED » */
  showLimited?: boolean;
}) {
  const { formatPrice } = usePreferences();
  const img =
    p.images[0] ?? "https://placehold.co/400x400/f4f6f9/00b8d9?text=NEXORA";

  const onNav = () => {
    if (placement) {
      void fetch("/api/reco/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId: p.id, placement }),
      });
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: "PRODUCT_CLICK",
        productId: p.id,
        path: typeof window !== "undefined" ? window.location.pathname : "",
      }),
    });
  };

  const showDiscount =
    variant === "flash" &&
    (p.discountPct != null ||
      (p.comparePrice != null && p.comparePrice > p.price));

  const pct =
    p.discountPct ??
    (p.comparePrice != null && p.comparePrice > p.price
      ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
      : null);

  const cardClass =
    variant === "trend"
      ? "rounded-2xl border border-shop-border bg-shop-surface p-4 shadow-md md:p-6"
      : "rounded-2xl border border-shop-border bg-shop-surface shadow-sm";

  return (
    <Link
      href={`/produit/${p.slug}`}
      onClick={onNav}
      className={`group flex flex-col overflow-hidden transition hover:shadow-lg ${cardClass}`}
    >
      <div className="relative aspect-square bg-shop-bg">
        <Image
          src={img}
          alt={p.name}
          fill
          className="object-cover transition duration-300 group-hover:scale-105"
          sizes="(max-width:768px) 50vw, 25vw"
          unoptimized
        />
        {typeof aiMatchPercent === "number" && (
          <span className="absolute left-2 top-2 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            IA · {aiMatchPercent}% match
          </span>
        )}
        {showLimited && (
          <span
            className={`absolute rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white ${
              typeof aiMatchPercent === "number" ? "left-2 top-10" : "right-2 top-2"
            }`}
          >
            Promo
          </span>
        )}
        {showDiscount && pct != null && (
          <span
            className={`absolute left-2 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white ${
              typeof aiMatchPercent === "number" ? "top-10" : "top-2"
            }`}
          >
            -{pct}%
          </span>
        )}
        {p.algorithm && !aiMatchPercent && (
          <span className="absolute right-2 top-2 rounded bg-shop-navy/90 px-2 py-0.5 text-[10px] font-medium text-white">
            {recoPlacement ?
              `[${p.algorithm}]`
            : `${p.algorithm}${typeof p.score === "number" ? ` · ${p.score.toFixed(1)}` : ""}`}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        {p.badge && (
          <span className="mb-1 w-fit rounded-md bg-shop-navy/10 px-2 py-0.5 text-[11px] font-semibold text-shop-navy">
            {p.badge}
          </span>
        )}
        {variant === "search" ?
          <>
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold text-shop-text">{p.name}</p>
              <p className="shrink-0 text-base font-bold text-cyan-600">{formatPrice(p.price)}</p>
            </div>
            {p.description ?
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-shop-muted">{p.description}</p>
            : null}
            <div className="mt-auto flex flex-wrap items-baseline gap-2 border-t border-shop-border/60 pt-3">
              {p.comparePrice != null && p.comparePrice > p.price ?
                <p className="text-sm text-shop-muted line-through">{formatPrice(p.comparePrice)}</p>
              : null}
              <span className="ml-auto text-xs font-medium text-shop-cyan">Voir le produit →</span>
            </div>
          </>
        : <>
            <p className={`line-clamp-2 font-medium text-shop-text ${variant === "trend" ? "text-base" : "text-sm"}`}>
              {p.name}
            </p>
            {recoPlacement && p.recoReason ?
              <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-shop-muted">{p.recoReason}</p>
            : null}
            {p.description && variant === "trend" ?
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-shop-muted">{p.description}</p>
            : null}
            {p.soldHint && (
              <p className="mt-1 text-xs font-medium text-shop-cyan">{p.soldHint}</p>
            )}
            <div className="mt-auto flex items-baseline gap-2 pt-2">
              <p className="text-lg font-bold text-shop-text">{formatPrice(p.price)}</p>
              {p.comparePrice != null && p.comparePrice > p.price && (
                <p className="text-sm text-shop-muted line-through">{formatPrice(p.comparePrice)}</p>
              )}
            </div>
          </>
        }
      </div>
    </Link>
  );
}
