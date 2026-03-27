import type { Product } from "@/generated/prisma/client";
import { BrowseEventType } from "@/generated/prisma/enums";
import { prisma } from "./db";
import { recoUserTag } from "./reco-invalidate";
import {
  getCollaborativeRecommendations,
  getRecommendations,
  getSimilarToLatestWishlist,
  normalizeScores,
  type RecoItem,
} from "./recommendation";
import { unstable_cache } from "next/cache";

export type PersonalizedHomeBlock = {
  key: string;
  title: string;
  subtitle?: string;
  items: RecoItem[];
};

export type PersonalizedHomeData = {
  blocks: PersonalizedHomeBlock[];
  /** Nombre d’actions détectées (historique, favoris, achats, suivi vendeurs). */
  actionCount: number;
  /** True si aucune donnée de personnalisation. */
  hasHistory: boolean;
};

function excludeIdsFromItems(items: RecoItem[]): Set<string> {
  const s = new Set<string>();
  for (const it of items) s.add(it.product.id);
  return s;
}

async function followedVendorProducts(userId: string, limit: number): Promise<PersonalizedHomeBlock | null> {
  const favs = await prisma.vendorFavorite.findMany({
    where: { userId },
    select: { sellerUserId: true },
    take: 24,
  });
  if (!favs.length) return null;

  const sellerIds = favs.map((f) => f.sellerUserId);
  const products = await prisma.product.findMany({
    where: {
      sellerId: { in: sellerIds },
      stock: { gt: 0 },
      isFlagged: false,
      archived: false,
      seller: { banned: false },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 4,
    include: { seller: { include: { sellerProfile: true } }, category: true, brand: true },
  });

  const firstShop =
    products[0]?.seller?.sellerProfile?.shopName ??
    products[0]?.seller?.name ??
    "vos vendeurs suivis";

  const items = normalizeScores(
    products.slice(0, limit).map((p, i) => ({
      product: p as unknown as Product,
      score: limit - i,
      algorithm: "vendor_follow",
      reason: `Nouveautés et best-sellers de boutiques que vous suivez (${firstShop}).`,
    }))
  );

  return {
    key: "followed_vendors",
    title: `Parce que vous suivez ${firstShop}`,
    subtitle: "Produits récents de vos vendeurs favoris.",
    items,
  };
}

function normalizeHybridAlgo(
  v: string | null | undefined
): "HYBRID" | "CONTENT" | "COLLAB" {
  if (v === "CONTENT" || v === "COLLAB" || v === "HYBRID") return v;
  return "HYBRID";
}

async function computePersonalizedHome(userId: string): Promise<{
  blocks: PersonalizedHomeBlock[];
  hybridBadge: string;
  actionCount: number;
  hasHistory: boolean;
}> {
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, firstName: true, name: true },
  });
  const userCreatedAt = userRow?.createdAt ?? new Date(0);
  const displayName = userRow?.firstName ?? (userRow?.name ? userRow.name.split(" ")[0] : "!");

  // 1) Détection « nouveau membre » : aucune action utile.
  const [evCount, wishCount, vendorFavCount, paidOrdersCount, purchasedLineCount] = await Promise.all([
    prisma.browseEvent.count({
      where: {
        userId,
        createdAt: { gte: userCreatedAt },
        type: {
          in: [
            BrowseEventType.PRODUCT_VIEW,
            BrowseEventType.PRODUCT_CLICK,
            BrowseEventType.ADD_CART,
            BrowseEventType.WISHLIST_ADD,
            BrowseEventType.PRODUCT_LIKE,
            BrowseEventType.PURCHASE_COMPLETE,
            BrowseEventType.VENDOR_FOLLOW,
          ],
        },
      },
    }),
    prisma.wishlistItem.count({ where: { userId } }),
    prisma.vendorFavorite.count({ where: { userId } }),
    prisma.order.count({
      where: { userId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } },
    }),
    prisma.orderItem.count({
      where: { order: { userId, status: { in: ["PAID", "SHIPPED", "DELIVERED"] } } },
    }),
  ]);

  /** Les lignes d’achat comptent comme signal (même si peu d’événements browse). */
  const actionCount = evCount + wishCount + vendorFavCount + paidOrdersCount + Math.min(purchasedLineCount, 12);
  const hasHistory = actionCount > 0;

  const setting = await prisma.platformSetting.findUnique({
    where: { key: "reco_home_mode" },
    select: { value: true },
  });
  const algoMode = normalizeHybridAlgo(setting?.value);

  const blocks: PersonalizedHomeBlock[] = [];
  const globalExclude = new Set<string>();

  // 2) Nouveau compte : éviter une section vide (pas de getRecommendations).
  if (actionCount === 0) {
    const popularAgg = await prisma.browseEvent.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        type: { in: [BrowseEventType.PRODUCT_VIEW, BrowseEventType.ADD_CART, BrowseEventType.PURCHASE_COMPLETE] },
      },
      _count: { productId: true },
      orderBy: { _count: { productId: "desc" } },
      take: 30,
    });

    const popularIds = popularAgg.map((r) => r.productId).filter(Boolean) as string[];
    const popularProducts = popularIds.length
      ? await prisma.product.findMany({
          where: {
            id: { in: popularIds },
            stock: { gt: 0 },
            isFlagged: false,
            archived: false,
            seller: { banned: false },
          },
        })
      : [];

    const popularById = new Map(popularProducts.map((p) => [p.id, p]));
    const popular = popularIds.map((id) => popularById.get(id)).filter(Boolean).slice(0, 8) as Product[];

    const recent = await prisma.product.findMany({
      where: {
        stock: { gt: 0 },
        isFlagged: false,
        archived: false,
        seller: { banned: false },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    });

    blocks.push({
      key: "welcome_popular",
      title: `Bienvenue ${displayName} !`,
      subtitle:
        "Commencez à explorer pour obtenir des recommandations personnalisées. Plus vous interagissez, plus nos recommandations s'améliorent pour vous.",
      items: normalizeScores(
        popular.map((p, i) => ({
          product: p,
          score: popular.length - i,
          algorithm: "populaire",
          reason: "Produits populaires sur la plateforme (vues/ajouts panier/achats).",
        }))
      ),
    });

    blocks.push({
      key: "welcome_new",
      title: "Nouveautés",
      subtitle: "Derniers produits ajoutés au catalogue.",
      items: normalizeScores(
        recent.map((p, i) => ({
          product: p as unknown as Product,
          score: recent.length - i,
          algorithm: "nouveauté",
          reason: "Produits les plus récents — parfait pour démarrer votre profil.",
        }))
      ),
    });

    return { blocks, hybridBadge: "[starter]", actionCount, hasHistory: false };
  }

  // 2b) Acheteurs : bloc dédié en tête (hybride + graines achat côté getRecommendations)
  if (paidOrdersCount > 0) {
    const inspired = await getRecommendations({
      userId,
      placement: "HOME",
      limit: 8,
      excludeProductIds: [...globalExclude],
    });
    if (inspired.length) {
      blocks.push({
        key: "inspired_purchases",
        title: "Inspiré de vos achats",
        subtitle:
          "Suggestions à partir de vos articles achetés et des parcours d’autres clients sur les mêmes produits.",
        items: inspired,
      });
      for (const id of excludeIdsFromItems(inspired)) globalExclude.add(id);
    }
  }

  // 3) 1–5 actions : contenu uniquement (pas encore assez de signal pour collab/hybride complet)
  if (actionCount <= 5) {
    const contentOnly = await getRecommendations({
      userId,
      placement: "HOME",
      limit: 8,
      algoMode: "CONTENT",
    });
    if (contentOnly.length) {
      blocks.push({
        key: "content_only",
        title: "Basé sur votre navigation récente",
        subtitle: "Recommandations de contenu (catégories, marques, prix) — profil en construction.",
        items: contentOnly.map((r) => ({ ...r, algorithm: "content" })),
      });
      for (const id of excludeIdsFromItems(contentOnly)) globalExclude.add(id);
    }
  }

  const b1 = await followedVendorProducts(userId, 8);
  if (b1?.items.length) {
    blocks.push(b1);
    for (const id of excludeIdsFromItems(b1.items)) globalExclude.add(id);
  }

  const wish = await getSimilarToLatestWishlist({
    userId,
    excludeIds: globalExclude,
    limit: 8,
  });
  if (wish?.items.length) {
    blocks.push({
      key: "wishlist_similar",
      title: `Parce que vous avez aimé « ${wish.anchorName} »`,
      subtitle: "Produits proches de votre dernier favori.",
      items: wish.items,
    });
    for (const id of excludeIdsFromItems(wish.items)) globalExclude.add(id);
  }

  const collab = await getCollaborativeRecommendations({
    userId,
    excludeIds: globalExclude,
    limit: 8,
  });
  if (collab.length) {
    blocks.push({
      key: "collab",
      title: "Les clients comme vous ont aussi aimé",
      subtitle: "Filtrage collaboratif (parcours et achats proches).",
      items: collab,
    });
    for (const id of excludeIdsFromItems(collab)) globalExclude.add(id);
  }

  const hybrid = await getRecommendations({
    userId,
    placement: "HOME",
    limit: 12,
    algoMode,
    excludeProductIds: [...globalExclude],
  });
  const hybridFiltered = hybrid.slice(0, 8);
  const hybridBadge =
    algoMode === "HYBRID"
      ? "[hybrid·adaptatif]"
      : algoMode === "CONTENT"
        ? "[content·1.0]"
        : "[collab·1.0]";

  if (hybridFiltered.length) {
    blocks.push({
      key: "hybrid_home",
      title: `Recommandé pour vous ${hybridBadge}`,
      subtitle:
        algoMode === "HYBRID"
          ? "Combinaison profil personnel et affinités collectives (poids adaptés à votre activité)."
          : algoMode === "CONTENT"
            ? "Basé sur vos catégories, marques et budget habituels."
            : "Basé sur des utilisateurs aux comportements proches des vôtres.",
      items: hybridFiltered,
    });
    for (const id of excludeIdsFromItems(hybridFiltered)) globalExclude.add(id);
  }

  const recent = await prisma.browseEvent.findMany({
    where: { userId, createdAt: { gte: userCreatedAt }, productId: { not: null }, type: BrowseEventType.PRODUCT_VIEW },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { product: true },
  });
  const seen = new Set<string>();
  const resumeProducts: Product[] = [];
  for (const e of recent) {
    if (!e.product || e.product.stock <= 0 || e.product.isFlagged) continue;
    if (seen.has(e.product.id)) continue;
    seen.add(e.product.id);
    resumeProducts.push(e.product as Product);
    if (resumeProducts.length >= 4) break;
  }

  if (resumeProducts.length) {
    const items = normalizeScores(
      resumeProducts.map((p, i) => ({
        product: p,
        score: resumeProducts.length - i,
        algorithm: "resume",
        reason: "Reprise de votre navigation récente.",
      }))
    );
    blocks.push({
      key: "resume",
      title: "Reprendre votre navigation",
      subtitle: "Les dernières fiches que vous avez consultées.",
      items,
    });
  }

  return { blocks, hybridBadge, actionCount, hasHistory: true };
}

export function getCachedPersonalizedHome(userId: string) {
  return unstable_cache(
    async () => computePersonalizedHome(userId),
    ["personalized-home", userId],
    { revalidate: 120, tags: [recoUserTag(userId)] }
  )();
}
