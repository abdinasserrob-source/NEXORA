import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/ProductCard";
import { HomeFlashSection } from "@/components/HomeFlashSection";
import { HomeNewsletter } from "@/components/HomeNewsletter";
import { HomeHeroSection } from "@/components/HomeHeroSection";
import {
  HomePersonalizedFallback,
  HomePersonalizedSections,
} from "@/components/home/HomePersonalizedSections";
import { getHomeShellCached } from "@/lib/home-cached";

export const revalidate = 300;

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1920&q=85";

function parseProductImages(raw: string): string[] {
  try {
    const j = JSON.parse(raw) as unknown;
    return Array.isArray(j) ? j.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function buildGuestRecoSample(
  trending: { id: string; name: string; slug: string; price: number; images: string[] }[],
  nouveautes: { id: string; name: string; slug: string; price: number; images: string[] }[]
) {
  const seen = new Set<string>();
  const out: { id: string; name: string; slug: string; price: number; images: string[] }[] = [];
  for (const p of [...trending, ...nouveautes]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= 8) break;
  }
  return out;
}

export default async function HomePage() {
  const heroSrc = process.env.NEXT_PUBLIC_HERO_IMAGE || DEFAULT_HERO;
  const hero2 =
    process.env.NEXT_PUBLIC_HERO_IMAGE_2 ||
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1920&q=85";
  const hero3 =
    process.env.NEXT_PUBLIC_HERO_IMAGE_3 ||
    "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=1920&q=85";
  const heroImages = [heroSrc, hero2, hero3];

  const shell = await getHomeShellCached();
  const { products, cats, flashRaw, trendingRaw, catThumbs } = shell;

  const catsWithThumb = cats.map((c) => ({
    ...c,
    thumb: catThumbs[c.id] ?? null,
  }));

  const flashList =
    flashRaw.length >= 4
      ? flashRaw
      : [...flashRaw, ...products.filter((p) => !flashRaw.find((f) => f.id === p.id))].slice(0, 8);

  const flashProducts = flashList.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice ?? (p.isPromo ? p.price * 1.2 : null),
    images: parseProductImages(p.images),
  }));

  const productCards = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.price,
    images: parseProductImages(p.images),
  }));

  const trendingCards = trendingRaw.map((p) => {
    const n = p._count.reviews;
    const soldHint = `${(1.2 + n * 0.31).toFixed(1)}k expédiés`;
    const badge = p.badge ?? p.category?.name?.slice(0, 14) ?? "Best-seller";
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      images: parseProductImages(p.images),
      badge,
      soldHint,
    };
  });

  const guestRecoSample = buildGuestRecoSample(
    trendingRaw.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      images: parseProductImages(p.images),
    })),
    products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      images: parseProductImages(p.images),
    }))
  );

  return (
    <div className="bg-shop-bg">
      <HomeHeroSection images={heroImages} />

      <div className="mx-auto max-w-7xl px-4 py-12">
        <section id="categories">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-shop-text">Parcourir par catégorie</h2>
            <Link href="/categories" className="text-sm font-semibold text-shop-cyan hover:underline">
              Toutes les catégories
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {catsWithThumb.map((c) => (
              <Link
                key={c.id}
                href={`/categories?slug=${c.slug}`}
                className="group overflow-hidden rounded-2xl border border-shop-border bg-shop-surface shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-square bg-shop-bg">
                  {c.thumb ?
                    <Image
                      src={c.thumb}
                      alt=""
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="150px"
                      unoptimized
                    />
                  : <div className="flex h-full items-center justify-center text-3xl text-shop-border">◇</div>}
                </div>
                <p className="p-3 text-center text-sm font-medium text-shop-text">{c.name}</p>
              </Link>
            ))}
          </div>
        </section>

        <HomeFlashSection products={flashProducts} />

        <section className="mt-16">
          <h2 className="text-2xl font-bold text-shop-text">Nouveautés</h2>
          <p className="mt-1 text-sm text-shop-muted">Sélection fraîche du catalogue.</p>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {productCards.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </section>

        <Suspense fallback={<HomePersonalizedFallback />}>
          <HomePersonalizedSections guestRecoSample={guestRecoSample} />
        </Suspense>

        <section id="tendance" className="mt-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-shop-text md:text-3xl">Tendance en ce moment</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-shop-muted">
              Ce qui fait le buzz dans la communauté tech NEXORA.
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {trendingCards.map((p) => (
              <ProductCard key={p.id} variant="trend" p={p} />
            ))}
          </div>
        </section>
      </div>

      <HomeNewsletter />
    </div>
  );
}
