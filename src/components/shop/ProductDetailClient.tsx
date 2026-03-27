"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Heart, Sparkles, Store, ZoomIn } from "lucide-react";
import { ProductActions } from "@/components/ProductActions";

type SellerInfo = {
  id: string;
  name: string | null;
  avatar: string | null;
  sellerProfile: {
    shopName: string;
    description: string | null;
    logoUrl: string | null;
    approved: boolean;
    rating: number;
    salesCount: number;
  } | null;
} | null;

type P = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
};

export function ProductDetailClient({
  product,
  seller,
  category,
  comparePrice,
  badge,
  avgRating,
  reviewCount,
  cross,
  upsell,
  recent,
}: {
  product: P;
  seller: SellerInfo;
  category: { name: string; slug: string } | null;
  comparePrice: number | null;
  badge: string | null;
  avgRating: number;
  reviewCount: number;
  cross: P[];
  upsell: P[];
  recent: P[];
}) {
  const [mainIdx, setMainIdx] = useState(0);
  const [tab, setTab] = useState<"details" | "shipping">("details");
  const [fav, setFav] = useState(false);
  /** Coup de cœur produit (wishlist) — signal pour recommandations / futur modèle IA */
  const [productLiked, setProductLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [me, setMe] = useState<{ user: { id: string } | null } | null>(null);
  const imgs = product.images.length ? product.images : [""];

  const sp = seller?.sellerProfile;
  const shopLabel = sp?.shopName ?? seller?.name ?? "Vendeur";
  const canVisit = !!sp?.approved;

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null }));
  }, []);

  useEffect(() => {
    const t0 = Date.now();
    const sendDwell = () => {
      const durationMs = Math.min(86_400_000, Date.now() - t0);
      if (durationMs < 400) return;
      void fetch("/api/track", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "PRODUCT_VIEW",
          productId: product.id,
          path: `/produit/${product.slug}`,
          durationMs,
          meta: { phase: "dwell" },
        }),
      });
    };
    window.addEventListener("pagehide", sendDwell);
    return () => {
      window.removeEventListener("pagehide", sendDwell);
      sendDwell();
    };
  }, [product.id, product.slug]);

  /** Pulsations d’engagement (temps passé sur la fiche) — complète le dwell final pour la reco */
  useEffect(() => {
    let ticks = 0;
    const id = window.setInterval(() => {
      if (ticks >= 4) return;
      ticks += 1;
      void fetch("/api/track", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "PRODUCT_VIEW",
          productId: product.id,
          path: `/produit/${product.slug}`,
          durationMs: 45_000,
          meta: { phase: "engagement_tick", tick: ticks },
        }),
      });
    }, 45_000);
    return () => clearInterval(id);
  }, [product.id, product.slug]);

  useEffect(() => {
    if (!seller?.id || !canVisit) return;
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: "PAGE_VIEW",
        path: `/produit/${product.slug}`,
        productId: product.id,
        meta: { sellerUserId: seller.id, kind: "product_seller_view" },
      }),
    });
  }, [seller?.id, canVisit, product.id, product.slug]);

  useEffect(() => {
    if (!me?.user?.id) {
      setProductLiked(false);
      return;
    }
    void fetch(`/api/wishlist?productId=${encodeURIComponent(product.id)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d: { liked?: boolean }) => setProductLiked(!!d.liked))
      .catch(() => setProductLiked(false));
  }, [me?.user?.id, product.id]);

  useEffect(() => {
    if (!me?.user?.id || !seller?.id) return;
    void fetch("/api/vendor-favorites", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const ids = (d.favorites ?? []).map((x: { sellerUserId: string }) => x.sellerUserId);
        setFav(ids.includes(seller.id));
      })
      .catch(() => null);
  }, [me?.user?.id, seller?.id]);

  const toggleProductLike = async () => {
    if (!me?.user) {
      toast.error("Connectez-vous pour aimer ce produit.");
      return;
    }
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      if (productLiked) {
        const r = await fetch(
          `/api/wishlist?productId=${encodeURIComponent(product.id)}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!r.ok) throw new Error();
        setProductLiked(false);
        toast.success("Retiré de vos favoris");
      } else {
        const r = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ productId: product.id }),
        });
        if (r.status === 401) {
          toast.error("Connectez-vous pour aimer ce produit.");
          return;
        }
        if (!r.ok) throw new Error();
        setProductLiked(true);
        toast.success("Ajouté à vos favoris — merci !");
      }
    } catch {
      toast.error("Action impossible");
    } finally {
      setLikeBusy(false);
    }
  };

  const toggleFav = async () => {
    if (!me?.user) {
      toast.error("Connectez-vous pour suivre ce vendeur.");
      return;
    }
    if (!seller?.id) return;
    try {
      if (fav) {
        const r = await fetch(
          `/api/vendor-favorites?sellerUserId=${encodeURIComponent(seller.id)}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!r.ok) throw new Error();
        setFav(false);
        toast.success("Vendeur retiré de vos favoris");
      } else {
        const r = await fetch("/api/vendor-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sellerUserId: seller.id }),
        });
        if (!r.ok) throw new Error();
        setFav(true);
        toast.success("Vendeur ajouté à vos favoris");
      }
    } catch {
      toast.error("Action impossible");
    }
  };

  return (
    <div className="bg-[#f4f7fb] pb-16 pt-6 text-slate-900">
      <div className="mx-auto max-w-7xl px-4">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-cyan-600">
            Accueil
          </Link>
          <span>/</span>
          {category ?
            <>
              <Link href="/categories" className="hover:text-cyan-600">
                {category.name}
              </Link>
              <span>/</span>
            </>
          : null}
          <span className="font-medium text-slate-800">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {imgs[mainIdx] ?
                <Image
                  src={imgs[mainIdx]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized
                  priority
                />
              : <div className="flex size-full items-center justify-center text-slate-400">Pas d’image</div>}
              <span className="pointer-events-none absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow">
                <ZoomIn className="size-3.5" />
                Agrandir
              </span>
            </div>
            {imgs.length > 1 ?
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imgs.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainIdx(i)}
                    className={`relative size-20 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      i === mainIdx ? "border-cyan-500" : "border-transparent ring-1 ring-slate-200"
                    }`}
                  >
                    {src ?
                      <Image src={src} alt="" fill className="object-cover" unoptimized />
                    : null}
                  </button>
                ))}
              </div>
            : null}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {badge === "new" ?
                <span className="rounded-full bg-cyan-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-cyan-800">
                  Nouveauté
                </span>
              : null}
              {badge === "bestseller" ?
                <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">
                  Best-seller
                </span>
              : null}
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{product.name}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-amber-500">{"★".repeat(Math.min(5, Math.round(avgRating)))}</span>
              <span className="text-slate-600">
                {avgRating.toFixed(1)} ({reviewCount} avis)
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-cyan-600">
                {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(product.price)}
              </span>
              {comparePrice && comparePrice > product.price ?
                <span className="text-lg text-slate-400 line-through">
                  {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(comparePrice)}
                </span>
              : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={likeBusy}
                onClick={() => void toggleProductLike()}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                  productLiked
                    ? "border-rose-400 bg-rose-50 text-rose-800"
                    : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-rose-200 hover:bg-rose-50/50"
                }`}
                aria-pressed={productLiked}
              >
                <Heart
                  className={`size-5 ${productLiked ? "fill-rose-500 text-rose-500" : "text-slate-500"}`}
                />
                {productLiked ? "Aimé" : "J’aime"}
              </button>
              <Link
                href="/compte/favoris"
                className="text-sm font-medium text-cyan-700 underline-offset-2 hover:underline"
              >
                Mes favoris
              </Link>
              <span className="text-xs text-slate-500">
                Utilisé pour personnaliser vos recommandations.
              </span>
            </div>

            {seller && (
              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                {canVisit ?
                  <Link
                    href={`/boutique/${seller.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {sp?.logoUrl ?
                        <Image src={sp.logoUrl} alt="" fill className="object-cover" unoptimized />
                      : (
                        <span className="flex size-full items-center justify-center text-xs font-bold text-slate-500">
                          <Store className="size-6" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vendeur</span>
                      <span className="mt-0.5 block truncate text-base font-bold text-slate-900">{shopLabel}</span>
                      {sp?.description ?
                        <span className="line-clamp-2 text-xs text-slate-600">{sp.description}</span>
                      : null}
                      <span className="mt-1 inline-flex items-center gap-2 text-xs text-cyan-600">
                        Voir la boutique →
                        {typeof sp?.rating === "number" && sp.rating > 0 ?
                          <span className="text-slate-500">★ {sp.rating.toFixed(1)}</span>
                        : null}
                      </span>
                    </span>
                  </Link>
                : (
                  <div className="flex min-w-0 flex-1 items-center gap-3 opacity-80">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <span className="flex size-full items-center justify-center text-slate-500">
                        <Store className="size-6" />
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vendeur</span>
                      <span className="mt-0.5 block truncate text-base font-bold text-slate-900">{shopLabel}</span>
                      <span className="mt-1 text-xs text-amber-700">Boutique en validation — lien bientôt disponible.</span>
                    </span>
                  </div>
                )}
                {canVisit ?
                  <button
                    type="button"
                    onClick={() => void toggleFav()}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                      fav ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <Heart className={`size-4 ${fav ? "fill-cyan-600 text-cyan-600" : ""}`} />
                    {fav ? "Favori" : "Suivre"}
                  </button>
                : null}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-900">
                <Sparkles className="size-4 text-cyan-600" />
                Suggestion IA
              </div>
              <p className="mt-1 text-xs text-cyan-800/90">
                Aligné sur vos consultations : ajoutez ce produit pour compléter votre panier.
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ProductActions
                variant="light"
                product={product}
                cross={cross}
                upsell={upsell}
                recent={recent}
              />
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap border-b border-slate-200">
            {(
              [
                { id: "details" as const, label: "Détails produit" },
                { id: "shipping" as const, label: "Livraison & retours" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-semibold transition md:px-8 ${
                  tab === t.id ? "border-b-2 border-cyan-500 text-cyan-700" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}
            <Link
              href="#avis"
              className="px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 md:px-8"
            >
              Avis clients
            </Link>
          </div>
          <div className="p-6 text-sm leading-relaxed text-slate-600">
            {tab === "details" ?
              <p>{product.description}</p>
            : <p>Expédition sous 48h ouvrées. Retours sous 14 jours (conditions générales — simulation).</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
