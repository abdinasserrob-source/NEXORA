"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, ChevronRight } from "lucide-react";
import { CatalogProductCard, type CatalogProduct } from "@/components/CatalogProductCard";

type Cat = {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
  children: { id: string; name: string; slug: string }[];
};

type Brand = { id: string; name: string };

function CategoriesCatalogInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [minRating, setMinRating] = useState<string>("");

  const [flyout, setFlyout] = useState<{
    slug: string;
    top: number;
    items: CatalogProduct[];
  } | null>(null);

  const categorySlug = useMemo(() => {
    const raw = (searchParams.get("slug") ?? "all").trim();
    if (categories.length === 0) {
      if (!raw || raw === "all") return "all";
      return null;
    }
    if (!raw || raw === "all") return "all";
    const exists = categories.some(
      (c) => c.slug === raw || c.children?.some((ch) => ch.slug === raw)
    );
    return exists ? raw : "all";
  }, [categories, searchParams]);

  const loadProducts = useCallback(async () => {
    if (categorySlug === null) return;
    setLoading(true);
    const p = new URLSearchParams();
    if (categorySlug !== "all") p.set("category", categorySlug);
    p.set("sort", sort);
    p.set("limit", "48");
    if (selectedBrands.length) p.set("brands", selectedBrands.join(","));
    if (priceMin) p.set("min", priceMin);
    if (priceMax) p.set("max", priceMax);
    if (minRating) p.set("minRating", minRating);
    const r = await fetch(`/api/products?${p.toString()}`);
    const d = await r.json();
    setProducts(d.products ?? []);
    setLoading(false);
  }, [categorySlug, sort, selectedBrands, priceMin, priceMax, minRating]);

  useEffect(() => {
    void fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
    void fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands ?? []));
  }, []);

  useEffect(() => {
    if (categorySlug === null) {
      setLoading(true);
      return;
    }
    void loadProducts();
  }, [categorySlug, loadProducts]);

  const openFlyout = (slug: string, top: number) => {
    if (slug === "all") {
      setFlyout(null);
      return;
    }
    if (closeTimer.current) clearTimeout(closeTimer.current);
    void fetch(`/api/products?category=${encodeURIComponent(slug)}&limit=10`)
      .then((r) => r.json())
      .then((d) =>
        setFlyout({ slug, top, items: d.products ?? [] })
      );
  };

  const scheduleCloseFlyout = () => {
    closeTimer.current = setTimeout(() => setFlyout(null), 220);
  };

  const cancelCloseFlyout = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const activeCat =
    categorySlug && categorySlug !== "all"
      ? categories.find((c) => c.slug === categorySlug)
      : undefined;
  const title =
    categorySlug === "all" || categorySlug === null
      ? "Tous les produits"
      : activeCat?.name ?? "Catégorie";

  const resetFilters = () => {
    setSelectedBrands([]);
    setPriceMin("");
    setPriceMax("");
    setMinRating("");
  };

  const toggleBrand = (id: string) => {
    setSelectedBrands((b) =>
      b.includes(id) ? b.filter((x) => x !== id) : [...b, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-16">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-8">
        {/* Colonne gauche : catégories + filtres */}
        <aside className="relative hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 space-y-6">
            <div className="rounded-2xl border border-[#e8eaef] bg-white p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#333]">
                <span className="text-[#00b8d9]">◇</span> Catégories
              </p>
              <div className="max-h-[min(55vh,22rem)] overflow-y-auto overflow-x-hidden pr-1">
                <ul className="space-y-0.5">
                  <li>
                    <button
                      type="button"
                      onClick={() => router.push("/categories")}
                      onMouseEnter={() => scheduleCloseFlyout()}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                        categorySlug === "all"
                          ? "bg-[#00d4ff]/15 text-[#0088a3]"
                          : "text-[#555] hover:bg-[#f8f9fa]"
                      }`}
                    >
                      Tous les produits
                      <ChevronRight className="size-4 opacity-40" />
                    </button>
                  </li>
                  {categories.map((c) => (
                    <li
                      key={c.id}
                      className="relative"
                      onMouseEnter={(e) => {
                        cancelCloseFlyout();
                        const top = (e.currentTarget as HTMLElement).getBoundingClientRect().top;
                        openFlyout(c.slug, top);
                      }}
                      onMouseLeave={() => scheduleCloseFlyout()}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`/categories?slug=${encodeURIComponent(c.slug)}`)
                        }
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                          categorySlug === c.slug
                            ? "bg-[#00d4ff]/15 text-[#0088a3]"
                            : "text-[#555] hover:bg-[#f8f9fa]"
                        }`}
                      >
                        <span className="line-clamp-2">{c.name}</span>
                        <span className="shrink-0 text-xs text-[#aaa]">{c._count.products}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e8eaef] bg-white p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-[#333]">
                <Filter className="size-4 text-[#00b8d9]" />
                Filtres
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#888]">Marque</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                {brands.map((b) => (
                  <li key={b.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-[#f8f9fa]">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(b.id)}
                        onChange={() => toggleBrand(b.id)}
                        className="rounded border-[#ccc] text-[#00b8d9]"
                      />
                      <span className="text-[#444]">{b.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#888]">
                Prix (€)
              </p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full rounded-lg border border-[#e8eaef] px-2 py-1.5 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full rounded-lg border border-[#e8eaef] px-2 py-1.5 text-sm"
                />
              </div>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#888]">
                Note mini
              </p>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="w-full rounded-lg border border-[#e8eaef] px-2 py-2 text-sm"
              >
                <option value="">Toutes</option>
                <option value="4">4★ & plus</option>
                <option value="3">3★ & plus</option>
              </select>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 w-full rounded-xl bg-[#e8f8fb] py-2.5 text-sm font-semibold text-[#0088a3] hover:bg-[#d5f0f6]"
              >
                Réinitialiser
              </button>
            </div>
          </div>

          {/* Fenêtre flottante au survol */}
          {flyout && flyout.items.length > 0 && (
            <div
              className="fixed z-[60] w-[300px] rounded-2xl border border-[#e8eaef] bg-white p-3 shadow-2xl"
              style={{
                left: "clamp(1rem, 16rem + 1.5vw, 20rem)",
                top: Math.min(
                  flyout.top,
                  typeof window !== "undefined" ? window.innerHeight - 360 : flyout.top
                ),
                maxHeight: "min(400px, 80vh)",
              }}
              onMouseEnter={cancelCloseFlyout}
              onMouseLeave={scheduleCloseFlyout}
            >
              <p className="border-b border-[#eee] pb-2 text-xs font-bold uppercase tracking-wide text-[#888]">
                Aperçu —{" "}
                {categories.find((x) => x.slug === flyout.slug)?.name ?? flyout.slug}
              </p>
              <ul className="mt-2 max-h-[300px] space-y-2 overflow-y-auto">
                {flyout.items.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/produit/${p.slug}`}
                      className="flex gap-2 rounded-lg p-1 hover:bg-[#f8f9fa]"
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-[#f0f0f0]">
                        <Image
                          src={p.images[0]}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="56px"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 text-sm">
                        <p className="line-clamp-2 font-medium text-[#333]">{p.name}</p>
                        <p className="font-bold text-[#00b8d9]">{p.price.toFixed(2)} €</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/categories?slug=${encodeURIComponent(flyout.slug)}`}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(`/categories?slug=${encodeURIComponent(flyout.slug)}`);
                  setFlyout(null);
                }}
                className="mt-2 block text-center text-xs font-semibold text-[#00b8d9]"
              >
                Voir tout →
              </Link>
            </div>
          )}
        </aside>

        {/* Contenu principal */}
        <div className="min-w-0 flex-1">
          <nav className="text-xs text-[#888]">
            <Link href="/" className="hover:text-[#00b8d9]">
              Accueil
            </Link>
            <span className="mx-1">›</span>
            <span className="text-[#333]">{title}</span>
          </nav>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#333] md:text-3xl">{title}</h1>
              <p className="mt-1 text-sm text-[#888]">
                {loading ? "Chargement…" : `${products.length} produit(s) affiché(s)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-[#666]">Trier</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-xl border border-[#e8eaef] bg-white px-4 py-2 text-sm font-medium text-[#333]"
              >
                <option value="newest">Plus récents</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
              </select>
            </div>
          </div>

          {/* Mobile : liste catégories horizontale */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
            <button
              type="button"
              onClick={() => router.push("/categories")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                categorySlug === "all"
                  ? "bg-[#00d4ff] text-white"
                  : "bg-white text-[#555] ring-1 ring-[#e8eaef]"
              }`}
            >
              Tous
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  router.push(`/categories?slug=${encodeURIComponent(c.slug)}`)
                }
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                  categorySlug === c.slug
                    ? "bg-[#00d4ff] text-white"
                    : "bg-white text-[#555] ring-1 ring-[#e8eaef]"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p, i) => (
              <CatalogProductCard key={p.id} product={p} index={i} />
            ))}
          </div>

          {!loading && products.length === 0 && (
            <p className="py-20 text-center text-[#888]">Aucun produit pour ces critères.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoriesCatalogFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] text-sm text-[#888]">
      Chargement du catalogue…
    </div>
  );
}

/** Suspense côté client : requis pour `useSearchParams` pendant le prérendu (ex. Vercel). */
export function CategoriesCatalog() {
  return (
    <Suspense fallback={<CategoriesCatalogFallback />}>
      <CategoriesCatalogInner />
    </Suspense>
  );
}
