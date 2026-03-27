import { unstable_cache } from "next/cache";
import { prisma } from "./db";

export type HomeShellData = {
  products: Awaited<ReturnType<typeof fetchNewProducts>>;
  cats: Awaited<ReturnType<typeof fetchRootCategories>>;
  flashRaw: Awaited<ReturnType<typeof fetchFlash>>;
  trendingRaw: Awaited<ReturnType<typeof fetchTrending>>;
  /** Objet sérialisable (pas de Map — compatible unstable_cache) */
  catThumbs: Record<string, string | null>;
};

async function fetchNewProducts() {
  return prisma.product.findMany({
    where: { isFlagged: false, stock: { gt: 0 }, seller: { banned: false } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      isPromo: true,
      comparePrice: true,
    },
  });
}

async function fetchRootCategories() {
  return prisma.category.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    take: 12,
    select: { id: true, name: true, slug: true },
  });
}

async function fetchFlash() {
  return prisma.product.findMany({
    where: {
      isFlagged: false,
      stock: { gt: 0 },
      OR: [{ isPromo: true }, { comparePrice: { not: null } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      isPromo: true,
      comparePrice: true,
    },
  });
}

async function fetchTrending() {
  return prisma.product.findMany({
    where: { isFlagged: false, stock: { gt: 0 }, seller: { banned: false } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      badge: true,
      category: { select: { name: true } },
      _count: { select: { reviews: true } },
    },
  });
}

async function buildShell(): Promise<HomeShellData> {
  try {
    const [products, cats, flashRaw, trendingRaw] = await Promise.all([
      fetchNewProducts(),
      fetchRootCategories(),
      fetchFlash(),
      fetchTrending(),
    ]);

    const catIds = cats.map((c) => c.id);
    const thumbRows =
      catIds.length > 0
        ? await prisma.product.findMany({
            where: { categoryId: { in: catIds }, isFlagged: false, stock: { gt: 0 } },
            distinct: ["categoryId"],
            orderBy: { createdAt: "desc" },
            select: { categoryId: true, images: true },
          })
        : [];

    const catThumbs: Record<string, string | null> = {};
    for (const r of thumbRows) {
      try {
        const imgs = JSON.parse(r.images) as string[];
        catThumbs[r.categoryId] = imgs[0] ?? null;
      } catch {
        catThumbs[r.categoryId] = null;
      }
    }

    return { products, cats, flashRaw, trendingRaw, catThumbs };
  } catch (e) {
    console.error("[home-shell] buildShell failed", e);
    return { products: [], cats: [], flashRaw: [], trendingRaw: [], catThumbs: {} };
  }
}

/** Données d’accueil partagées (hero / catégories / nouveautés / flash / tendance) — cache court. */
export function getHomeShellCached() {
  return unstable_cache(buildShell, ["home-shell-v2"], {
    revalidate: 300,
    tags: ["home-shell"],
  })();
}
