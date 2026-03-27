import { prisma } from "@/lib/db";
import { getVerifiedSeller } from "@/lib/session-user";
import { sellerAccessRevoked } from "@/lib/seller-guard";
import { NextResponse } from "next/server";

export async function GET() {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller.id } });
  if (sellerAccessRevoked(profile)) {
    return NextResponse.json({ error: "Accès vendeur désactivé" }, { status: 403 });
  }

  const sellerProducts = await prisma.product.findMany({
    where: { sellerId: seller.id },
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      comparePrice: true,
      stock: true,
      archived: true,
      isPromo: true,
      isFlagged: true,
      badge: true,
    },
  });

  const productIds = sellerProducts.map((p) => p.id);

  const products = sellerProducts.length;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const ordersToday = await prisma.order.count({
    where: {
      items: { some: { product: { sellerId: seller.id } } },
      status: { not: "CANCELLED" },
      createdAt: { gte: startOfDay },
    },
  });

  const lowStockProducts = sellerProducts
    .filter((p) => p.stock > 0 && p.stock <= 5)
    .slice(0, 10)
    .map((p) => ({ id: p.id, name: p.name, slug: p.slug, stock: p.stock }));

  const outOfStockCount = sellerProducts.filter((p) => p.stock === 0).length;

  const orders = await prisma.order.count({
    where: {
      items: { some: { product: { sellerId: seller.id } } },
      status: { not: "CANCELLED" },
    },
  });

  const approx = await prisma.orderItem.findMany({
    where: { product: { sellerId: seller.id } },
    select: { priceSnap: true, quantity: true },
  });
  let revenueApprox = 0;
  for (const i of approx) revenueApprox += i.priceSnap * i.quantity;

  // Stats recommandations (AI tracking)
  const now = new Date();
  const since = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 jours

  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekItems = await prisma.orderItem.findMany({
    where: {
      product: { sellerId: seller.id },
      order: { status: { not: "CANCELLED" }, createdAt: { gte: weekAgo } },
    },
    select: {
      priceSnap: true,
      quantity: true,
      order: { select: { createdAt: true } },
    },
  });
  const revenueByDay: Record<string, number> = {};
  for (const i of weekItems) {
    const day = i.order.createdAt.toISOString().slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] ?? 0) + i.priceSnap * i.quantity;
  }
  const revenueLast7Days = Object.entries(revenueByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  if (!productIds.length) {
    return NextResponse.json({
      products: 0,
      orders,
      ordersToday,
      outOfStockCount,
      lowStockProducts,
      revenueApprox: 0,
      revenueLast7Days,
      recommendationStats: {
        impressions: 0,
        clicks: 0,
        purchases: 0,
        ctr: 0,
        conversionReco: 0,
        bestPlacement: null,
      },
      placementBreakdown: [],
      topProducts: [],
      suggestions: [],
    });
  }

  const impressions = await prisma.recommendationFeedback.count({
    where: {
      productId: { in: productIds },
      clicked: false,
      purchased: false,
      impressionAt: { gte: since },
    },
  });

  const clicks = await prisma.recommendationFeedback.count({
    where: {
      productId: { in: productIds },
      clicked: true,
      impressionAt: { gte: since },
    },
  });

  const purchases = await prisma.recommendationFeedback.count({
    where: {
      productId: { in: productIds },
      purchased: true,
      impressionAt: { gte: since },
    },
  });

  const ctr = impressions ? clicks / impressions : 0;
  const conversionReco = clicks ? purchases / clicks : 0;

  const impressionsByProduct = await prisma.recommendationFeedback.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      clicked: false,
      purchased: false,
      impressionAt: { gte: since },
    },
    _count: { id: true },
  });

  const clicksByProduct = await prisma.recommendationFeedback.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      clicked: true,
      impressionAt: { gte: since },
    },
    _count: { id: true },
  });

  const purchasesByProduct = await prisma.recommendationFeedback.groupBy({
    by: ["productId"],
    where: {
      productId: { in: productIds },
      purchased: true,
      impressionAt: { gte: since },
    },
    _count: { id: true },
  });

  const pick = (gid: string) => sellerProducts.find((p) => p.id === gid);

  const sortByCountDesc = (
    rows: { productId: string; _count: { id: number } }[]
  ) => [...rows].sort((a, b) => b._count.id - a._count.id);

  const topImpressions = sortByCountDesc(impressionsByProduct).slice(0, 5);
  const topClicks = sortByCountDesc(clicksByProduct).slice(0, 5);
  const topPurchases = sortByCountDesc(purchasesByProduct).slice(0, 5);

  const topIds = new Set<string>([
    ...topImpressions.map((x) => x.productId),
    ...topClicks.map((x) => x.productId),
    ...topPurchases.map((x) => x.productId),
  ]);

  const perProduct = [];
  for (const id of topIds) {
    const p = pick(id);
    if (!p) continue;

    const [imp, clk, pur] = await Promise.all([
      prisma.recommendationFeedback.count({
        where: { productId: id, clicked: false, purchased: false, impressionAt: { gte: since } },
      }),
      prisma.recommendationFeedback.count({
        where: { productId: id, clicked: true, impressionAt: { gte: since } },
      }),
      prisma.recommendationFeedback.count({
        where: { productId: id, purchased: true, impressionAt: { gte: since } },
      }),
    ]);

    perProduct.push({
      productId: id,
      name: p.name,
      slug: p.slug,
      impressions: imp,
      clicks: clk,
      purchases: pur,
      ctr: imp ? clk / imp : 0,
      conversionReco: clk ? pur / clk : 0,
    });
  }

  const bestAlgoForSeller = await prisma.recommendationFeedback.groupBy({
    by: ["placement", "algorithm"],
    where: { productId: { in: productIds }, impressionAt: { gte: since } },
    _count: { id: true },
  });

  const bestRow = [...bestAlgoForSeller].sort((a, b) => b._count.id - a._count.id)[0];
  const bestPlacement =
    bestRow?.placement && bestRow?.algorithm ? `${bestRow.placement} (${bestRow.algorithm})` : null;

  const impPl = await prisma.recommendationFeedback.groupBy({
    by: ["placement"],
    where: {
      productId: { in: productIds },
      clicked: false,
      purchased: false,
      impressionAt: { gte: since },
    },
    _count: { id: true },
  });
  const clkPl = await prisma.recommendationFeedback.groupBy({
    by: ["placement"],
    where: { productId: { in: productIds }, clicked: true, impressionAt: { gte: since } },
    _count: { id: true },
  });
  const purPl = await prisma.recommendationFeedback.groupBy({
    by: ["placement"],
    where: { productId: { in: productIds }, purchased: true, impressionAt: { gte: since } },
    _count: { id: true },
  });
  const placements = new Set<string>([
    ...impPl.map((x) => x.placement),
    ...clkPl.map((x) => x.placement),
    ...purPl.map((x) => x.placement),
  ]);
  const placementBreakdown = [...placements].map((placement) => ({
    placement,
    impressions: impPl.find((x) => x.placement === placement)?._count.id ?? 0,
    clicks: clkPl.find((x) => x.placement === placement)?._count.id ?? 0,
    purchases: purPl.find((x) => x.placement === placement)?._count.id ?? 0,
  }));

  const suggestions: string[] = [];

  if (impressions > 50 && ctr < 0.05) {
    suggestions.push(
      "Beaucoup d’impressions mais peu de clics : améliore titre, images, badge et prix."
    );
  }

  if (clicks > 20 && conversionReco < 0.05) {
    suggestions.push("Taux clic → achat faible : vérifie description, prix barré/promo et stock.");
  }

  // Suggestion promo simple si un produit est surtout vu.
  const bestSeen = topImpressions[0]?.productId ? pick(topImpressions[0].productId) : null;
  if (bestSeen && !bestSeen.isPromo && bestSeen.stock > 0) {
    suggestions.push(`Ce produit est très vu. Testez une promotion pour le booster : ${bestSeen.name}.`);
  }

  return NextResponse.json({
    products,
    orders,
    ordersToday,
    outOfStockCount,
    lowStockProducts,
    revenueApprox,
    revenueLast7Days,
    recommendationStats: {
      impressions,
      clicks,
      purchases,
      ctr,
      conversionReco,
      bestPlacement,
    },
    placementBreakdown,
    topProducts: perProduct
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5),
    suggestions,
  });
}
