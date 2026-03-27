import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRecommendations, getRecentViewed } from "@/lib/recommendation";
import { ReviewSection } from "@/components/reviews/ReviewSection";
import { getAuthFromCookies } from "@/lib/jwt";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { ProductDetailClient } from "@/components/shop/ProductDetailClient";

export const revalidate = 60;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const auth = await getAuthFromCookies();
  const anon = await getAnonSessionIdFromCookie();
  const userId = auth?.sub ?? null;

  const product = await prisma.product.findFirst({
    where: { slug, isFlagged: false, archived: false, seller: { banned: false } },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      price: true,
      comparePrice: true,
      stock: true,
      images: true,
      crossSellIds: true,
      badge: true,
      category: { select: { name: true, slug: true } },
      seller: {
        select: {
          id: true,
          name: true,
          avatar: true,
          sellerProfile: {
            select: {
              shopName: true,
              description: true,
              logoUrl: true,
              bannerUrl: true,
              approved: true,
              rating: true,
              salesCount: true,
            },
          },
        },
      },
      upsellTargets: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          stock: true,
          images: true,
        },
      },
      reviews: {
        take: 20,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          reported: true,
          reportCount: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      },
    },
  });
  if (!product) notFound();

  const crossIds = JSON.parse(product.crossSellIds || "[]") as string[];
  const crossProds =
    crossIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: crossIds }, stock: { gt: 0 }, isFlagged: false, archived: false },
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            stock: true,
            description: true,
            images: true,
          },
        })
      : [];

  const recoCross = await getRecommendations({
    userId,
    placement: "PRODUCT_CROSS",
    productId: product.id,
    limit: 6,
  });
  const crossCombined = [
    ...crossProds.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      stock: p.stock,
      description: p.description,
      images: JSON.parse(p.images) as string[],
    })),
    ...recoCross.map((r) => ({
      id: r.product.id,
      name: r.product.name,
      slug: r.product.slug,
      price: r.product.price,
      stock: r.product.stock,
      description: r.product.description,
      images: JSON.parse(r.product.images) as string[],
    })),
  ];
  const seen = new Set<string>();
  const cross = crossCombined.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

  const upsellReco = await getRecommendations({
    userId,
    placement: "PRODUCT_UPSELL",
    productId: product.id,
    limit: 4,
  });
  const upsell = upsellReco.map((r) => ({
    id: r.product.id,
    name: r.product.name,
    slug: r.product.slug,
    price: r.product.price,
    stock: r.product.stock,
    description: r.product.description,
    images: JSON.parse(r.product.images) as string[],
  }));

  const recent = await getRecentViewed(userId, userId ? null : anon ?? null, 4);
  const recentCards = recent
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      stock: p.stock,
      description: p.description,
      images: JSON.parse(p.images) as string[],
    }));

  const imgs = JSON.parse(product.images) as string[];
  const avg =
    product.reviews.length > 0 ?
      product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length
    : 0;

  return (
    <>
      <ProductDetailClient
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          stock: product.stock,
          images: imgs,
        }}
        seller={product.seller}
        category={product.category}
        comparePrice={product.comparePrice}
        badge={product.badge}
        avgRating={avg}
        reviewCount={product.reviews.length}
        cross={cross.slice(0, 6)}
        upsell={upsell}
        recent={recentCards}
      />
      <div id="avis" className="mx-auto max-w-7xl bg-[#f4f7fb] px-4 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <ReviewSection
            productId={product.id}
            initialReviews={product.reviews.map((r) => ({
              id: r.id,
              rating: r.rating,
              comment: r.comment,
              createdAt: r.createdAt,
              reported: r.reported,
              reportCount: r.reportCount,
              user: r.user,
            }))}
          />
        </div>
      </div>
    </>
  );
}
