import { BrowseEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { invalidateUserRecommendations } from "@/lib/reco-invalidate";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const productId = new URL(req.url).searchParams.get("productId");
  if (productId) {
    const row = await prisma.wishlistItem.findFirst({
      where: { userId: user.id, productId },
      select: { id: true },
    });
    return NextResponse.json({ liked: !!row });
  }
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    include: { product: true },
  });
  return NextResponse.json({
    items: items.map((i) => ({
      id: i.id,
      product: {
        ...i.product,
        images: JSON.parse(i.product.images) as string[],
      },
    })),
  });
}

const postSchema = z.object({
  productId: z.string(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  try {
    await prisma.wishlistItem.create({
      data: { userId: user.id, productId: parsed.data.productId },
    });
    await prisma.browseEvent.create({
      data: {
        type: BrowseEventType.PRODUCT_LIKE,
        userId: user.id,
        productId: parsed.data.productId,
        path: `/produit`,
        meta: JSON.stringify({ source: "wishlist_add" }),
      },
    });
    invalidateUserRecommendations(user.id);
  } catch {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId" }, { status: 400 });
  }
  await prisma.wishlistItem.deleteMany({
    where: { userId: user.id, productId },
  });
  invalidateUserRecommendations(user.id);
  return NextResponse.json({ ok: true });
}
