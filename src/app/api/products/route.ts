import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getCategoryBranchIdsBySlug } from "@/lib/category-tree";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const category = url.searchParams.get("category");
  const brandIds = url.searchParams.get("brands")?.split(",").filter(Boolean) ?? [];
  const min = url.searchParams.get("min");
  const max = url.searchParams.get("max");
  const minRating = url.searchParams.get("minRating");
  const promoOnly = url.searchParams.get("promo") === "1";
  const sort = url.searchParams.get("sort") ?? "newest";
  const take = Math.min(Number(url.searchParams.get("limit") ?? "48"), 96);
  const skip = Number(url.searchParams.get("skip") ?? "0");

  const where: Prisma.ProductWhereInput = {
    isFlagged: false,
    archived: false,
    stock: { gt: 0 },
    seller: { banned: false },
  };

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { description: { contains: q } },
      { slug: { contains: q } },
    ];
  }

  if (category && category !== "all") {
    const branchIds = await getCategoryBranchIdsBySlug(category);
    if (!branchIds || branchIds.length === 0) {
      return NextResponse.json({ products: [], count: 0, total: 0 });
    }
    where.categoryId = { in: branchIds };
  }

  if (brandIds.length) {
    where.brandId = { in: brandIds };
  }

  const price: { gte?: number; lte?: number } = {};
  if (min) price.gte = Number(min);
  if (max) price.lte = Number(max);
  if (Object.keys(price).length) where.price = price;
  if (promoOnly) where.isPromo = true;

  if (minRating) {
    const rmin = Number(minRating);
    if (!Number.isNaN(rmin) && rmin > 0) {
      const grouped = await prisma.review.groupBy({
        by: ["productId"],
        having: {
          rating: {
            _avg: {
              gte: rmin,
            },
          },
        },
      });
      const ratedIds = grouped.map((g) => g.productId);
      if (ratedIds.length === 0) {
        return NextResponse.json({ products: [], count: 0, total: 0 });
      }
      where.id = { in: ratedIds };
    }
  }

  const total = await prisma.product.count({ where });

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price-asc"
      ? { price: "asc" }
      : sort === "price-desc"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const products = await prisma.product.findMany({
    where,
    include: {
      brand: true,
      category: { include: { parent: true } },
      _count: { select: { reviews: true } },
    },
    orderBy,
    take,
    skip,
  });

  const ids = products.map((p) => p.id);
  const avgRows =
    ids.length > 0
      ? await prisma.review.groupBy({
          by: ["productId"],
          where: { productId: { in: ids } },
          _avg: { rating: true },
        })
      : [];
  const avgMap = new Map(
    avgRows.map((r) => [r.productId, r._avg.rating ?? 0])
  );

  const clipDesc = (s: string, n: number) => {
    const t = s.replace(/\s+/g, " ").trim();
    return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
  };

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: clipDesc(p.description, 140),
      price: p.price,
      comparePrice: p.comparePrice,
      isPromo: p.isPromo,
      promoPercent: p.promoPercent,
      badge: p.badge ?? null,
      images: JSON.parse(p.images) as string[],
      brand: p.brand,
      category: p.category,
      reviewCount: p._count.reviews,
      ratingAvg: Math.round((avgMap.get(p.id) ?? 0) * 10) / 10,
    })),
    count: products.length,
    total,
  });
}
