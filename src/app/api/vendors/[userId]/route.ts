import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ userId: string }> }
) {
  const { userId } = await ctx.params;
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });
  if (!profile?.approved) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  const products = await prisma.product.findMany({
    where: { sellerId: userId, isFlagged: false, archived: false, stock: { gt: 0 } },
    include: { category: { select: { name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 96,
  });
  return NextResponse.json({
    profile: {
      shopName: profile.shopName,
      description: profile.description,
      logoUrl: profile.logoUrl,
      bannerUrl: profile.bannerUrl,
      shopEmail: profile.shopEmail,
      shopPhone: profile.shopPhone,
      shopAddress: profile.shopAddress,
      rating: profile.rating,
      salesCount: profile.salesCount,
      seller: profile.user,
    },
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      images: JSON.parse(p.images) as string[],
      category: p.category,
    })),
  });
}
