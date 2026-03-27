import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { slug, isFlagged: false, archived: false, seller: { banned: false } },
    include: {
      brand: true,
      category: true,
      reviews: { include: { user: { select: { firstName: true, lastName: true, name: true } } } },
      seller: {
        include: { sellerProfile: true },
      },
      upsellOf: true,
      upsellTargets: true,
    },
  });
  if (!product) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const avg = await prisma.review.aggregate({
    where: { productId: product.id },
    _avg: { rating: true },
  });

  return NextResponse.json({
    product: {
      ...product,
      images: JSON.parse(product.images) as string[],
      ratingAvg: avg._avg.rating ?? 0,
      crossSellIds: JSON.parse(product.crossSellIds || "[]") as string[],
    },
  });
}
