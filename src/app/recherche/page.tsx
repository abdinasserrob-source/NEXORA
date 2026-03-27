"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Camera, Mic, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import toast from "react-hot-toast";

type Brand = { id: string; name: string; _count?: { products: number } };
type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number | null;
  description?: string;
  images: string[];
  isPromo?: boolean;
  ratingAvg?: number;
};

function hashMatch(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return 82 + (Math.abs(h) % 17);
}

function SearchInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const spKey = sp.toString();

  const qUrl = sp.get("q") ?? "";
  const minUrl = sp.get("min") ?? "";
  const maxUrl = sp.get("max") ?? "";
  const brandsUrl = sp.get("brands") ?? "";
  const sortUrl = sp.get("sort") ?? "newest";
  const ratingUrl = sp.get("minRating") ?? "";

  const [draftQ, setDraftQ] = useState(qUrl);
  const [draftMin, setDraftMin] = useState(minUrl);
  const [draftMax, setDraftMax] = useState(maxUrl);
  const [draftRating, setDraftRating] = useState(ratingUrl);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    brandsUrl ? brandsUrl.split(",").filter(Boolean) : []
  );
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isImageSearching, setIsImageSearching] = useState(false);

  useEffect(() => {
    setDraftQ(qUrl);
    setDraftMin(minUrl);
    setDraftMax(maxUrl);
    setDraftRating(ratingUrl);
    setSelectedBrands(brandsUrl ? brandsUrl.split(",").filter(Boolean) : []);
    setImageMessage(null);
  }, [qUrl, minUrl, maxUrl, sortUrl, ratingUrl, brandsUrl]);

  useEffect(() => {
    void fetch("/api/brands")
      .then((r) => r.json())
      .then((d) => setBrands((d.brands ?? []) as Brand[]));
  }, []);

  const applyToUrl = useCallback(() => {
    const p = new URLSearchParams(sp.toString());
    if (draftQ.trim().length >= 2) p.set("q", draftQ.trim());
    else p.delete("q");
    if (draftMin.trim()) p.set("min", draftMin.trim());
    else p.delete("min");
    if (draftMax.trim()) p.set("max", draftMax.trim());
    else p.delete("max");
    if (selectedBrands.length) p.set("brands", selectedBrands.join(","));
    else p.delete("brands");
    if (draftRating) p.set("minRating", draftRating);
    else p.delete("minRating");
    router.replace(`/recherche?${p.toString()}`, { scroll: false });
  }, [sp, draftQ, draftMin, draftMax, draftRating, selectedBrands, router]);

  useEffect(() => {
    if (qUrl.trim().length < 2) {
      setProducts([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    const p = new URLSearchParams();
    p.set("q", qUrl.trim());
    p.set("limit", "48");
    if (minUrl) p.set("min", minUrl);
    if (maxUrl) p.set("max", maxUrl);
    if (brandsUrl) p.set("brands", brandsUrl);
    if (sortUrl) p.set("sort", sortUrl);
    if (ratingUrl) p.set("minRating", ratingUrl);
    void fetch(`/api/products?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts((d.products ?? []) as ProductRow[]);
        setTotal(typeof d.total === "number" ? d.total : (d.products ?? []).length);
      })
      .finally(() => setLoading(false));
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "SEARCH", query: qUrl, path: "/recherche" }),
    });
  }, [spKey, qUrl, minUrl, maxUrl, brandsUrl, sortUrl, ratingUrl]);

  const brandsWithStock = useMemo(
    () => brands.filter((b) => (b._count?.products ?? 1) > 0),
    [brands]
  );

  const toggleBrand = (id: string) => {
    setSelectedBrands((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const inp =
    "w-full rounded-xl border border-shop-border bg-white px-3 py-2 text-sm text-shop-text outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20";
  const hasVisualSearchState = isImageSearching || imageMessage !== null;

  const startVoiceSearch = () => {
    const SR =
      typeof window !== "undefined"
        ? ((window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
            (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition)
        : null;
    if (!SR) {
      toast.error("Recherche vocale non supportée par ce navigateur.");
      return;
    }
    const rec = new SR();
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => {
      setIsListening(false);
      toast.error("Erreur microphone");
    };
    rec.onresult = (ev: any) => {
      const transcript = String(ev?.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!transcript) return;
      setDraftQ(transcript);
      const p = new URLSearchParams(sp.toString());
      p.set("q", transcript);
      router.replace(`/recherche?${p.toString()}`, { scroll: false });
    };
    rec.start();
  };

  const onPickImage = async (file: File) => {
    setIsImageSearching(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/search/image", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(typeof d.error === "string" ? d.error : "Analyse image impossible");
        return;
      }
      const q = typeof d.query === "string" ? d.query : "";
      const prods = (d.products ?? []) as ProductRow[];
      setImageMessage(typeof d.message === "string" ? d.message : null);
      setProducts(prods);
      setTotal(prods.length);
      if (q) setDraftQ(q);
    } finally {
      setIsImageSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-shop-bg pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-col gap-4 border-b border-shop-border pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-shop-navy md:text-4xl">
              {qUrl.trim().length >= 2 ? qUrl.trim() : "Recherche"}
            </h1>
            {qUrl.trim().length >= 2 && (
              <p className="mt-2 text-sm italic text-shop-muted">
                {loading ? "Chargement…" : `${total} résultat${total > 1 ? "s" : ""} trouvé${total > 1 ? "s" : ""}`}
              </p>
            )}
          </div>
          <form
            className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              applyToUrl();
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-shop-muted" />
              <input
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                placeholder="Rechercher gadgets, mode, maison…"
                className={`${inp} pl-10`}
              />
            </div>
            <button
              type="submit"
              className="rounded-xl bg-shop-cyan px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95"
            >
              Rechercher
            </button>
            <label
              className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-shop-border bg-white px-3 py-2.5 text-shop-muted hover:bg-shop-bg"
              title="Rechercher par image"
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void onPickImage(f);
                }}
              />
              <Camera className="size-4" />
            </label>
            <button
              type="button"
              onClick={startVoiceSearch}
              className={`inline-flex items-center justify-center rounded-xl border border-shop-border bg-white px-3 py-2.5 text-shop-muted hover:bg-shop-bg ${isListening ? "ring-2 ring-shop-cyan/40" : ""}`}
              title="Recherche vocale"
            >
              <Mic className="size-4" />
            </button>
          </form>
        </div>

        {(isImageSearching || imageMessage) && (
          <div className="mb-4 rounded-xl border border-shop-border bg-white px-4 py-3 text-sm text-shop-muted">
            {isImageSearching ? "Analyse de l'image en cours..." : imageMessage}
          </div>
        )}

        {qUrl.trim().length < 2 && !hasVisualSearchState ?
          <div className="rounded-2xl border border-dashed border-shop-border bg-white py-20 text-center shadow-sm">
            <SlidersHorizontal className="mx-auto size-10 text-shop-muted" />
            <p className="mt-4 text-shop-muted">Saisissez au moins 2 caractères puis lancez la recherche.</p>
            <p className="mt-2 text-sm text-shop-muted">
              Astuce : utilisez les filtres à gauche une fois une recherche lancée.
            </p>
          </div>
        : <div className="grid gap-10 lg:grid-cols-[280px_1fr]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="flex items-center gap-2 text-sm font-semibold text-shop-navy">
                <SlidersHorizontal className="size-4 text-shop-cyan" />
                Filtres
              </div>

              <div className="mt-6 space-y-6 rounded-2xl border border-shop-border bg-white p-5 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-shop-muted">Fourchette de prix (€)</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-xs text-shop-muted">
                      Min
                      <input
                        type="number"
                        min={0}
                        className={`${inp} mt-1`}
                        value={draftMin}
                        onChange={(e) => setDraftMin(e.target.value)}
                      />
                    </label>
                    <label className="text-xs text-shop-muted">
                      Max
                      <input
                        type="number"
                        min={0}
                        className={`${inp} mt-1`}
                        value={draftMax}
                        onChange={(e) => setDraftMax(e.target.value)}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-shop-muted">Marque</p>
                  <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                    {brandsWithStock.map((b) => (
                      <li key={b.id}>
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-shop-text">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(b.id)}
                            onChange={() => toggleBrand(b.id)}
                            className="size-4 rounded border-shop-border text-shop-cyan focus:ring-shop-cyan"
                          />
                          {b.name}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-shop-muted">Note mini</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      { v: "", l: "Toutes" },
                      { v: "4", l: "4+" },
                      { v: "4.5", l: "4,5+" },
                    ].map((x) => (
                      <button
                        key={x.l}
                        type="button"
                        onClick={() => setDraftRating(x.v)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          draftRating === x.v ?
                            "border-shop-cyan bg-cyan-50 text-cyan-800"
                          : "border-shop-border bg-shop-bg text-shop-muted hover:border-shop-cyan/40"
                        }`}
                      >
                        {x.l}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={applyToUrl}
                  className="w-full rounded-xl bg-shop-navy py-2.5 text-sm font-semibold text-white hover:bg-shop-navy/90"
                >
                  Appliquer les filtres
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-shop-navy">
                  <Sparkles className="size-5 text-shop-cyan" />
                  <p className="text-sm font-bold">NEXORA+</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-shop-muted">
                  Conseiller IA, livraisons prioritaires et avantages exclusifs.
                </p>
                <Link
                  href="/compte"
                  className="mt-4 inline-block rounded-lg bg-shop-navy px-4 py-2 text-xs font-bold text-white"
                >
                  Découvrir
                </Link>
              </div>
            </aside>

            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-shop-muted">
                  Tri et grille inspirés du catalogue NEXORA — prix en surbrillance cyan.
                </p>
                <label className="flex items-center gap-2 text-sm text-shop-muted">
                  <span className="whitespace-nowrap">Trier par</span>
                  <select
                    className={`${inp} w-auto min-w-[160px]`}
                    value={sortUrl || "newest"}
                    onChange={(e) => {
                      const p = new URLSearchParams(sp.toString());
                      const v = e.target.value;
                      if (v === "newest") p.delete("sort");
                      else p.set("sort", v);
                      router.replace(`/recherche?${p.toString()}`, { scroll: false });
                    }}
                  >
                    <option value="newest">Nouveautés</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                  </select>
                </label>
              </div>

              {loading ?
                <p className="py-20 text-center text-shop-muted">Chargement des résultats…</p>
              : products.length === 0 ?
                <p className="rounded-2xl border border-shop-border bg-white py-16 text-center text-shop-muted shadow-sm">
                  Aucun produit ne correspond à ces critères.{" "}
                  <button type="button" className="text-shop-cyan underline" onClick={() => router.replace("/recherche")}>
                    Réinitialiser
                  </button>
                </p>
              : <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((p) => (
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
                        discountPct: null,
                      }}
                      variant="search"
                      aiMatchPercent={hashMatch(p.id)}
                      showLimited={!!p.isPromo}
                    />
                  ))}
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center bg-shop-bg text-shop-muted">
          Chargement…
        </div>
      }
    >
      <SearchInner />
    </Suspense>
  );
}
