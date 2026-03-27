"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Percent, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { usePreferences } from "@/components/PreferencesContext";

type Row = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  description?: string;
  images: string[];
  badge?: string | null;
  promoPercent?: number | null;
};

function discountPct(p: Row) {
  if (p.promoPercent != null && p.promoPercent > 0) return Math.round(p.promoPercent);
  if (p.comparePrice != null && p.comparePrice > p.price) {
    return Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100);
  }
  return null;
}

export default function PromosPage() {
  const { formatPrice } = usePreferences();
  const [products, setProducts] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetch("/api/products?promo=1&limit=48&sort=price-asc")
      .then((r) => r.json())
      .then((d) => {
        setProducts((d.products ?? []) as Row[]);
        setTotal(typeof d.total === "number" ? d.total : (d.products ?? []).length);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-shop-bg pb-20 pt-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg">
            <Percent className="size-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-shop-navy md:text-4xl">Promotions</h1>
            <p className="mt-1 text-sm text-shop-muted">
              Produits marqués en promo par l’équipe NEXORA ({total} offre{total > 1 ? "s" : ""}).
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-shop-border bg-gradient-to-br from-slate-100 to-white p-8 shadow-sm md:p-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-shop-cyan">Sélection équipe</p>
                <h2 className="mt-2 text-2xl font-bold text-shop-navy md:text-3xl">Les meilleures offres du moment</h2>
                <p className="mt-3 text-sm leading-relaxed text-shop-muted">
                  Ces articles ont le flag <strong>promotion</strong> activé dans l’admin (Promo produits). Prix avant /
                  après affichés lorsque le prix barré est renseigné.
                </p>
                <Link
                  href="/categories"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-shop-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-shop-navy/90"
                >
                  Parcourir tout le catalogue
                </Link>
              </div>
              {products[0] ?
                <div className="relative hidden w-40 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-xl md:block md:size-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={products[0].images[0] ?? "https://placehold.co/200x200/f4f6f9/00b8d9?text=NEXORA"}
                    alt=""
                    className="size-full object-cover"
                  />
                </div>
              : null}
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-3xl border border-cyan-200 bg-gradient-to-b from-cyan-600 to-teal-700 p-8 text-white shadow-lg">
            <Sparkles className="size-8 opacity-90" />
            <p className="mt-4 text-lg font-bold">Offres vérifiées</p>
            <p className="mt-2 text-sm leading-relaxed text-cyan-50">
              Stock et visibilité sont contrôlés côté admin. Les vendeurs voient leurs produits mis en avant lorsque la
              promo est activée.
            </p>
            <p className="mt-6 text-xs font-medium text-cyan-100">
              Activation côté admin : menu « Promo produits » ou flag promo sur la fiche produit.
            </p>
          </div>
        </div>

        {loading ?
          <p className="mt-16 text-center text-shop-muted">Chargement des promos…</p>
        : products.length === 0 ?
          <div className="mt-16 rounded-2xl border border-dashed border-shop-border bg-white py-20 text-center shadow-sm">
            <Flame className="mx-auto size-10 text-orange-400" />
            <p className="mt-4 font-medium text-shop-navy">Aucune promotion active pour l’instant.</p>
            <p className="mt-2 text-sm text-shop-muted">
              Dans l’admin, activez <strong>isPromo</strong> sur des produits (Promo produits ou fiche produit).
            </p>
            <Link href="/" className="mt-6 inline-block text-sm font-semibold text-shop-cyan underline">
              Retour à l’accueil
            </Link>
          </div>
        : <>
            <section className="mt-14">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-shop-navy">Produits en promotion</h3>
                  <p className="text-sm text-shop-muted">Prix en euros — démo.</p>
                </div>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => {
                  const pct = discountPct(p);
                  return (
                    <ProductCard
                      key={p.id}
                      p={{
                        id: p.id,
                        name: p.name,
                        slug: p.slug,
                        price: p.price,
                        images: p.images,
                        comparePrice: p.comparePrice,
                        description: p.description,
                        discountPct: pct,
                        badge: p.badge ?? undefined,
                      }}
                      variant="flash"
                      showLimited
                    />
                  );
                })}
              </div>
            </section>

            <div className="mt-16 rounded-2xl border border-shop-border bg-shop-surface px-6 py-8 text-center shadow-sm">
              <p className="text-sm text-shop-muted">
                Total affiché : <strong className="text-shop-navy">{formatPrice(products.reduce((a, p) => a + p.price, 0))}</strong>{" "}
                (somme indicative des prix unitaires listés).
              </p>
            </div>
          </>
        }
      </div>
    </div>
  );
}
