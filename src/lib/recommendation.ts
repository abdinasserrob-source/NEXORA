import type { Product } from "@/generated/prisma/client";
import { BrowseEventType } from "@/generated/prisma/enums";
import { prisma } from "./db";

function parseCrossSell(p: Product): string[] {
  try {
    const j = JSON.parse(p.crossSellIds || "[]");
    return Array.isArray(j) ? j.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Valeurs enum Prisma explicites (évite PrismaClientValidationError sur `type: { in: [...] }`). */
const STRONG_TYPES: BrowseEventType[] = [
  BrowseEventType.PRODUCT_VIEW,
  BrowseEventType.PRODUCT_CLICK,
  BrowseEventType.ADD_CART,
  BrowseEventType.WISHLIST_ADD,
  BrowseEventType.PRODUCT_LIKE,
  BrowseEventType.PURCHASE_COMPLETE,
  BrowseEventType.VENDOR_FOLLOW,
];

/** Produits issus de commandes payées — graines pour co-visitation / collab (on exclut ces IDs du résultat). */
export async function getPurchasedProductSeedIds(userId: string, max = 14): Promise<string[]> {
  const orders = await prisma.order.findMany({
    where: { userId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      items: { select: { productId: true } },
    },
  });
  const ids: string[] = [];
  for (const o of orders) {
    for (const it of o.items) ids.push(it.productId);
  }
  return [...new Set(ids)].slice(0, max);
}

function eventBaseWeight(type: string): number {
  switch (type) {
    case "PURCHASE_COMPLETE":
      return 5;
    case "WISHLIST_ADD":
    case "PRODUCT_LIKE":
    case "ADD_CART":
      return 4;
    case "PRODUCT_CLICK":
      return 2;
    case "PRODUCT_VIEW":
      return 1;
    case "VENDOR_FOLLOW":
      return 1.5;
    default:
      return 0.25;
  }
}

export async function buildUserPreferenceVector(userId: string | null) {
  if (!userId) {
    return {
      categoryWeights: new Map<string, number>(),
      brandWeights: new Map<string, number>(),
      avgPrice: 50,
      eventCount: 0,
      signalStrength: 0,
    };
  }

  const userRow = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  const userCreatedAt = userRow?.createdAt ?? new Date(0);

  const [events, wishlistRows, orderItems] = await Promise.all([
    prisma.browseEvent.findMany({
      // Important : ignore les events issus d’une session anonyme fusionnée avant inscription
      where: { userId, createdAt: { gte: userCreatedAt } },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { product: true },
    }),
    prisma.wishlistItem.findMany({
      where: { userId },
      take: 80,
      include: { product: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: {
          userId,
          status: { in: ["PAID", "SHIPPED", "DELIVERED"] },
        },
      },
      take: 120,
      include: { product: true },
    }),
  ]);

  const categoryWeights = new Map<string, number>();
  const brandWeights = new Map<string, number>();
  let priceSum = 0;
  let priceN = 0;

  for (const e of events) {
    let w = eventBaseWeight(e.type);
    if (e.type === "PRODUCT_VIEW" && e.durationMs && e.durationMs > 0) {
      w *= 1 + Math.min(2, e.durationMs / 45_000);
    }
    if (!e.product) continue;
    categoryWeights.set(e.product.categoryId, (categoryWeights.get(e.product.categoryId) ?? 0) + w);
    if (e.product.brandId) {
      brandWeights.set(e.product.brandId, (brandWeights.get(e.product.brandId) ?? 0) + w);
    }
    priceSum += e.product.price;
    priceN++;
  }

  for (const row of wishlistRows) {
    const p = row.product;
    if (!p || p.stock <= 0) continue;
    const w = 3.5;
    categoryWeights.set(p.categoryId, (categoryWeights.get(p.categoryId) ?? 0) + w);
    if (p.brandId) brandWeights.set(p.brandId, (brandWeights.get(p.brandId) ?? 0) + w * 0.85);
    priceSum += p.price;
    priceN++;
  }

  for (const oi of orderItems) {
    const p = oi.product;
    if (!p) continue;
    const w = 4.5;
    categoryWeights.set(p.categoryId, (categoryWeights.get(p.categoryId) ?? 0) + w);
    if (p.brandId) brandWeights.set(p.brandId, (brandWeights.get(p.brandId) ?? 0) + w * 0.85);
    priceSum += p.price;
    priceN++;
  }

  const avgPrice = priceN ? priceSum / priceN : 50;
  const signalStrength = events.length + wishlistRows.length * 3 + orderItems.length * 4;

  return {
    categoryWeights,
    brandWeights,
    avgPrice,
    eventCount: events.length,
    signalStrength,
  };
}

/**
 * Co-visitation : événements forts + **wishlist** (souvent absent des browse) + pondération par
 * affinité sur les mêmes graines (favoris / vues communes), pour favoriser les articles co-aimés
 * par des clients proches plutôt que les seuls best-sellers globaux.
 */
async function collaborativeScoresDetailed(
  productIds: string[],
  excludeIds: Set<string>,
  viewerUserId?: string | null
): Promise<Map<string, { score: number; peers: number }>> {
  const out = new Map<string, { score: number; peers: number }>();
  if (!productIds.length) return out;

  const related = await prisma.browseEvent.findMany({
    where: {
      productId: { in: productIds },
      type: { in: STRONG_TYPES },
    },
    select: {
      anonymousSessionId: true,
      userId: true,
      productId: true,
    },
    take: 2500,
  });

  /** Utilisateurs qui ont mis en favori une des graines — indispensable pour relier les comptes « j’aime ». */
  const wishOnSeeds = await prisma.wishlistItem.findMany({
    where: { productId: { in: productIds } },
    select: { userId: true },
    take: 4000,
  });

  const sessions = new Set<string>();
  const users = new Set<string>();
  for (const r of related) {
    if (r.anonymousSessionId) sessions.add(r.anonymousSessionId);
    if (r.userId) users.add(r.userId);
  }
  for (const w of wishOnSeeds) {
    users.add(w.userId);
  }

  const orClause: Array<Record<string, unknown>> = [];
  if (sessions.size) orClause.push({ anonymousSessionId: { in: [...sessions] } });
  if (users.size) orClause.push({ userId: { in: [...users] } });
  if (!orClause.length) return out;

  const peerByProduct = new Map<string, Set<string>>();

  function addPeer(productId: string, peerKey: string) {
    if (!productId || excludeIds.has(productId)) return;
    if (viewerUserId && peerKey === viewerUserId) return;
    if (!peerByProduct.has(productId)) peerByProduct.set(productId, new Set());
    peerByProduct.get(productId)!.add(peerKey);
  }

  const others = await prisma.browseEvent.findMany({
    where: {
      OR: orClause,
      productId: { not: null },
      type: { in: STRONG_TYPES },
    },
    select: { productId: true, userId: true, anonymousSessionId: true },
    take: 8000,
  });

  for (const o of others) {
    if (!o.productId) continue;
    const peerKey =
      o.userId ?? (o.anonymousSessionId ? `anon:${o.anonymousSessionId}` : "");
    if (!peerKey) continue;
    addPeer(o.productId, peerKey);
  }

  const peerUserIds = [...users].filter((id) => id !== viewerUserId).slice(0, 800);
  if (peerUserIds.length) {
    const wishFromPeers = await prisma.wishlistItem.findMany({
      where: { userId: { in: peerUserIds } },
      select: { userId: true, productId: true },
      take: 15000,
    });
    for (const w of wishFromPeers) {
      addPeer(w.productId, w.userId);
    }
  }

  /** Affinité d’un pair sur les graines : favoris forts + signaux browse sur les mêmes produits. */
  const affinity = new Map<string, number>();
  if (peerUserIds.length) {
    const [wishAgg, browseAgg] = await Promise.all([
      prisma.wishlistItem.groupBy({
        by: ["userId"],
        where: { userId: { in: peerUserIds }, productId: { in: productIds } },
        _count: { productId: true },
      }),
      prisma.browseEvent.groupBy({
        by: ["userId"],
        where: {
          userId: { in: peerUserIds },
          productId: { in: productIds },
          type: { in: STRONG_TYPES },
        },
        _count: { id: true },
      }),
    ]);
    for (const row of wishAgg) {
      if (!row.userId) continue;
      const uid = row.userId;
      const c = row._count.productId;
      affinity.set(uid, (affinity.get(uid) ?? 0) + c * 2.4);
    }
    for (const row of browseAgg) {
      if (!row.userId) continue;
      const uid = row.userId;
      const c = row._count.id;
      affinity.set(uid, (affinity.get(uid) ?? 0) + c * 0.32);
    }
  }

  for (const [pid, peers] of peerByProduct) {
    let score = 0;
    let n = 0;
    for (const k of peers) {
      if (viewerUserId && k === viewerUserId) continue;
      n++;
      if (k.startsWith("anon:")) {
        score += 0.12;
      } else {
        score += Math.min(12, affinity.get(k) ?? 0.42);
      }
    }
    score += Math.log1p(n) * 0.28;
    out.set(pid, { score, peers: n });
  }
  return out;
}

function contentScore(
  p: Product,
  catW: Map<string, number>,
  brandW: Map<string, number>,
  avgPrice: number
): number {
  let s = 0;
  s += (catW.get(p.categoryId) ?? 0) * 1.2;
  if (p.brandId) s += (brandW.get(p.brandId) ?? 0) * 0.9;
  const priceDist = Math.abs(p.price - avgPrice) / (avgPrice || 1);
  s += Math.max(0, 2 - priceDist) * 0.4;
  return s;
}

export function normalizeScores<T extends { score: number }>(rows: T[]): (T & { score01: number })[] {
  const max = Math.max(...rows.map((r) => r.score), 1e-6);
  return rows.map((r) => ({ ...r, score01: Math.min(1, r.score / max) }));
}

export type RecoPlacement =
  | "HOME"
  | "PRODUCT_CROSS"
  | "CART_CROSS"
  | "PRODUCT_UPSELL"
  | "SIDEBAR_RECENT";

export type RecoItem = {
  product: Product;
  score: number;
  score01: number;
  algorithm: string;
  reason: string;
  similarUserCount?: number;
  anchorProductName?: string;
};

export async function getRecommendations(opts: {
  userId: string | null;
  placement: RecoPlacement;
  productId?: string | null;
  cartProductIds?: string[];
  limit?: number;
  algoMode?: "HYBRID" | "CONTENT" | "COLLAB";
  seedProductIds?: string[];
  /** IDs à exclure du résultat (déduplication inter-blocs). */
  excludeProductIds?: string[];
  /** Surcharge pondération hybride (accueil). */
  hybridWeights?: { content: number; collab: number };
}): Promise<RecoItem[]> {
  const limit = opts.limit ?? 8;
  const exclude = new Set<string>();
  if (opts.productId) exclude.add(opts.productId);
  for (const id of opts.cartProductIds ?? []) exclude.add(id);
  for (const id of opts.seedProductIds ?? []) exclude.add(id);
  for (const id of opts.excludeProductIds ?? []) exclude.add(id);

  const { categoryWeights, brandWeights, avgPrice, eventCount, signalStrength } =
    await buildUserPreferenceVector(opts.userId);

  const recentProductIds: string[] = [];
  const purchasedProductIds =
    opts.userId ? await getPurchasedProductSeedIds(opts.userId, 14) : [];
  const wishlistSeedIds: string[] = [];
  if (opts.userId) {
    const userRow = await prisma.user.findUnique({ where: { id: opts.userId }, select: { createdAt: true } });
    const userCreatedAt = userRow?.createdAt ?? new Date(0);
    const recent = await prisma.browseEvent.findMany({
      where: { userId: opts.userId, createdAt: { gte: userCreatedAt }, productId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { productId: true },
    });
    for (const r of recent) if (r.productId) recentProductIds.push(r.productId);
    const wishRows = await prisma.wishlistItem.findMany({
      where: { userId: opts.userId },
      orderBy: { id: "desc" },
      take: 16,
      select: { productId: true },
    });
    for (const w of wishRows) wishlistSeedIds.push(w.productId);
  }

  for (const id of purchasedProductIds) exclude.add(id);
  for (const id of wishlistSeedIds) exclude.add(id);

  const externalSeeds = (opts.seedProductIds ?? []).filter(Boolean);
  let seedIds = [...externalSeeds, ...purchasedProductIds, ...wishlistSeedIds, ...recentProductIds];
  if (opts.productId) seedIds.unshift(opts.productId);
  seedIds = [...new Set(seedIds)].slice(0, 14);

  const collabMap = await collaborativeScoresDetailed(seedIds, exclude, opts.userId ?? undefined);

  const allProducts = await prisma.product.findMany({
    where: {
      stock: { gt: 0 },
      isFlagged: false,
      archived: false,
      id: { notIn: [...exclude] },
    },
    include: { category: true, brand: true, seller: { select: { banned: true } } },
  });

  const eligible = allProducts.filter((p) => !p.seller.banned);

  if (opts.placement === "PRODUCT_UPSELL" && opts.productId) {
    const cur = await prisma.product.findUnique({
      where: { id: opts.productId },
      include: { upsellTargets: true, upsellOf: { include: { upsellTargets: true } } },
    });
    const ups: Product[] = [];
    if (cur?.upsellTargets?.length) ups.push(...cur.upsellTargets);
    if (cur?.upsellOf?.upsellTargets?.length)
      ups.push(...cur.upsellOf.upsellTargets.filter((x) => x.id !== cur.id));
    const byHigherPrice = eligible.filter(
      (p) =>
        p.categoryId === cur?.categoryId &&
        p.price > (cur?.price ?? 0) &&
        p.id !== opts.productId
    );
    const merged = [...ups, ...byHigherPrice];
    const seen = new Set<string>();
    const out: RecoItem[] = [];
    for (const p of merged) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push({
        product: p,
        score: ups.some((u) => u.id === p.id) ? 10 : 6,
        score01: ups.some((u) => u.id === p.id) ? 1 : 0.6,
        algorithm: "hybrid_upsell",
        reason: "Variante ou gamme supérieure proposée pour ce produit.",
      });
      if (out.length >= limit) break;
    }
    return out;
  }

  if (
    (opts.placement === "PRODUCT_CROSS" || opts.placement === "CART_CROSS") &&
    (opts.productId || opts.cartProductIds?.length)
  ) {
    const ids =
      opts.placement === "CART_CROSS"
        ? opts.cartProductIds ?? []
        : opts.productId
          ? [opts.productId]
          : [];
    const extras = new Map<string, number>();
    for (const pid of ids) {
      const pr = await prisma.product.findUnique({ where: { id: pid } });
      if (!pr) continue;
      for (const cid of parseCrossSell(pr)) {
        extras.set(cid, (extras.get(cid) ?? 0) + 3);
      }
      const others = eligible.filter(
        (p) => p.id !== pid && p.categoryId !== pr.categoryId && p.price <= pr.price * 1.5
      );
      for (const p of others.slice(0, 5)) extras.set(p.id, (extras.get(p.id) ?? 0) + 1);
    }
    const sorted = [...extras.entries()].sort((a, b) => b[1] - a[1]);
    const out: RecoItem[] = [];
    for (const [id, sc] of sorted) {
      const pr = eligible.find((p) => p.id === id);
      if (pr)
        out.push({
          product: pr,
          score: sc,
          score01: 0.8,
          algorithm: "cross_sell",
          reason: "Souvent acheté avec les articles de votre sélection.",
        });
      if (out.length >= limit) break;
    }
    if (out.length < limit) {
      for (const p of eligible) {
        if (out.some((x) => x.product.id === p.id)) continue;
        const cs = contentScore(p, categoryWeights, brandWeights, avgPrice) * 0.5;
        const col = collabMap.get(p.id)?.score ?? 0;
        const hyb = cs * 0.6 + col * 0.4;
        if (hyb > 0)
          out.push({
            product: p,
            score: hyb,
            score01: 0.5,
            algorithm: "hybrid_fill",
            reason: "Complément suggéré d’après votre profil.",
          });
        if (out.length >= limit) break;
      }
    }
    return normalizeScores(out);
  }

  if (opts.placement === "HOME") {
    const hasSeeds = seedIds.length > 0;
    if (!opts.userId || (eventCount === 0 && !hasSeeds)) {
      const sorted = [...eligible].sort((a, b) => {
        if (a.isPromo !== b.isPromo) return a.isPromo ? -1 : 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
      return sorted.slice(0, limit).map((p) => ({
        product: p,
        score: 1,
        score01: 0.5,
        algorithm: "guest_new_deterministic",
        reason: "Sélection tendance et nouveautés du catalogue.",
      }));
    }

    const mode = opts.algoMode ?? "HYBRID";
    const w =
      opts.hybridWeights ??
      (signalStrength < 18 ? { content: 0.8, collab: 0.2 } : { content: 0.4, collab: 0.6 });

    const scored = eligible.map((p) => {
      const cs = contentScore(p, categoryWeights, brandWeights, avgPrice);
      const cd = collabMap.get(p.id);
      const col = cd?.score ?? 0;
      const peers = cd?.peers ?? 0;
      let score: number;
      let algorithm: string;
      let reason: string;
      let similarUserCount: number | undefined;

      if (mode === "CONTENT") {
        score = cs;
        algorithm = "content";
        reason = "Aligné sur les catégories, marques et prix que vous consultez.";
      } else if (mode === "COLLAB") {
        score = col;
        algorithm = "collab";
        similarUserCount = peers;
        reason =
          peers > 0
            ? `${peers} utilisateur${peers > 1 ? "s" : ""} au profil proche ${peers > 1 ? "ont aussi consulté" : "a aussi consulté"} cet article.`
            : "Recommandation basée sur des parcours similaires.";
      } else {
        score = cs * w.content + col * w.collab;
        algorithm = "hybrid";
        similarUserCount = peers;
        reason =
          peers > 0
            ? `Mix profil (${Math.round(w.content * 100)} %) et utilisateurs similaires (${Math.round(w.collab * 100)} %) · ${peers} pair${peers > 1 ? "s" : ""}.`
            : `Recommandé pour vous · profil ${Math.round(w.content * 100)} % / affinité collective ${Math.round(w.collab * 100)} %.`;
      }
      return { product: p, score, algorithm, reason, similarUserCount };
    });

    scored.sort((a, b) => b.score - a.score);
    return normalizeScores(scored.slice(0, limit));
  }

  const scored = eligible.map((p) => ({
    product: p,
    score: contentScore(p, categoryWeights, brandWeights, avgPrice),
    algorithm: "content_fallback",
    reason: "Basé sur votre historique de navigation.",
  }));
  scored.sort((a, b) => b.score - a.score);
  return normalizeScores(scored.slice(0, limit));
}

/** Recommandations 100 % collaboratives (voisins comportementaux). */
export async function getCollaborativeRecommendations(opts: {
  userId: string;
  excludeIds: Set<string>;
  limit: number;
}): Promise<RecoItem[]> {
  const userRow = await prisma.user.findUnique({ where: { id: opts.userId }, select: { createdAt: true } });
  const userCreatedAt = userRow?.createdAt ?? new Date(0);

  const [browseSeeds, purchaseSeeds, wishSeeds] = await Promise.all([
    prisma.browseEvent.findMany({
      where: {
        userId: opts.userId,
        createdAt: { gte: userCreatedAt },
        productId: { not: null },
        type: { in: STRONG_TYPES },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { productId: true },
    }),
    getPurchasedProductSeedIds(opts.userId, 20),
    prisma.wishlistItem.findMany({
      where: { userId: opts.userId },
      orderBy: { id: "desc" },
      take: 30,
      select: { productId: true },
    }),
  ]);
  const seedIds = [
    ...new Set([
      ...purchaseSeeds,
      ...browseSeeds.map((s) => s.productId!).filter(Boolean),
      ...wishSeeds.map((w) => w.productId),
    ]),
  ].slice(0, 30);
  if (!seedIds.length) return [];

  const collab = await collaborativeScoresDetailed(seedIds, opts.excludeIds, opts.userId);
  const ids = [...collab.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, opts.limit * 2)
    .map(([id]) => id);

  const products = await prisma.product.findMany({
    where: {
      id: { in: ids },
      stock: { gt: 0 },
      isFlagged: false,
      archived: false,
      seller: { banned: false },
    },
    include: { category: true, brand: true, seller: { select: { banned: true } } },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const out: RecoItem[] = [];
  for (const pid of ids) {
    const p = byId.get(pid);
    if (!p || p.seller.banned) continue;
    const meta = collab.get(pid)!;
    out.push({
      product: p,
      score: meta.score,
      score01: 0,
      algorithm: "collab",
      reason: `${meta.peers} utilisateur${meta.peers > 1 ? "s" : ""} au comportement proche du vôtre ${meta.peers > 1 ? "ont" : "a"} montré de l’intérêt pour cet article.`,
      similarUserCount: meta.peers,
    });
    if (out.length >= opts.limit) break;
  }
  return normalizeScores(out);
}

/** Produits similaires au dernier favori (contenu). */
export async function getSimilarToLatestWishlist(opts: {
  userId: string;
  excludeIds: Set<string>;
  limit: number;
}): Promise<{ anchorName: string; items: RecoItem[] } | null> {
  const last = await prisma.wishlistItem.findFirst({
    where: { userId: opts.userId },
    orderBy: { id: "desc" },
    include: { product: true },
  });
  const anchor = last?.product;
  if (!anchor || anchor.stock <= 0) return null;

  const { categoryWeights, brandWeights, avgPrice } = await buildUserPreferenceVector(opts.userId);
  // Renforcer l’ancre
  categoryWeights.set(anchor.categoryId, (categoryWeights.get(anchor.categoryId) ?? 0) + 6);
  if (anchor.brandId) brandWeights.set(anchor.brandId, (brandWeights.get(anchor.brandId) ?? 0) + 5);

  const all = await prisma.product.findMany({
    where: {
      stock: { gt: 0 },
      isFlagged: false,
      archived: false,
      id: { not: anchor.id, notIn: [...opts.excludeIds] },
      seller: { banned: false },
    },
    include: { category: true, brand: true, seller: { select: { banned: true } } },
  });

  const eligible = all.filter((p) => !p.seller.banned);
  const scored = eligible
    .map((p) => {
      const score = contentScore(p, categoryWeights, brandWeights, avgPrice);
      return {
        product: p,
        score,
        algorithm: "content",
        reason: `Parce que vous avez aimé « ${anchor.name} ».`,
        anchorProductName: anchor.name,
      };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.limit);

  if (!scored.length) return { anchorName: anchor.name, items: [] };
  return {
    anchorName: anchor.name,
    items: normalizeScores(scored),
  };
}

export async function getRecentViewed(
  userId: string | null,
  anonymousSessionId: string | null,
  limit: number
) {
  const where = userId
    ? { userId, productId: { not: null } as const }
    : anonymousSessionId
      ? { anonymousSessionId, productId: { not: null } as const }
      : null;
  if (!where) return [];
  const evs = await prisma.browseEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { product: true },
  });
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const e of evs) {
    if (!e.product || e.product.stock <= 0 || e.product.isFlagged) continue;
    if (seen.has(e.product.id)) continue;
    seen.add(e.product.id);
    out.push(e.product);
    if (out.length >= limit) break;
  }
  return out;
}
