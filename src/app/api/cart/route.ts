import { BrowseEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getOrCreateCart } from "@/lib/get-cart";
import { invalidateUserRecommendations } from "@/lib/reco-invalidate";
import { NextResponse } from "next/server";
import { z } from "zod";

function parseProductImages(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const { cart } = await getOrCreateCart();
    if (!cart) {
      return NextResponse.json({ items: [], requiresSession: true });
    }
    return NextResponse.json({
      items: cart.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        product: {
          id: i.product.id,
          name: i.product.name,
          slug: i.product.slug,
          price: i.product.price,
          stock: i.product.stock,
          images: parseProductImages(i.product.images),
        },
      })),
    });
  } catch (e) {
    console.error("[GET /api/cart]", e);
    return NextResponse.json({ items: [], error: "Erreur serveur" }, { status: 500 });
  }
}

const postSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1).max(99),
});

export async function POST(req: Request) {
  const { cart, userId: cartUserId } = await getOrCreateCart();
  if (!cart) {
    return NextResponse.json(
      { error: "Session anonyme requise — rechargez la page." },
      { status: 400 }
    );
  }
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { productId, quantity } = parsed.data;
  const product = await prisma.product.findFirst({
    where: { id: productId, isFlagged: false, stock: { gte: quantity } },
  });
  if (!product) {
    return NextResponse.json({ error: "Produit indisponible" }, { status: 400 });
  }

  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId },
    },
  });
  if (existing) {
    const nextQty = Math.min(existing.quantity + quantity, product.stock);
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty },
    });
  } else {
    await prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  if (cartUserId) {
    await prisma.browseEvent.create({
      data: {
        type: BrowseEventType.ADD_CART,
        userId: cartUserId,
        productId,
        meta: JSON.stringify({ quantity, source: "api_cart" }),
      },
    });
    invalidateUserRecommendations(cartUserId);
  }

  return NextResponse.json({ ok: true });
}

const patchSchema = z.object({
  itemId: z.string(),
  quantity: z.number().int().min(0),
});

export async function PATCH(req: Request) {
  const { cart } = await getOrCreateCart();
  if (!cart) return NextResponse.json({ error: "Panier introuvable" }, { status: 400 });
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const { itemId, quantity } = parsed.data;
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { product: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    const q = Math.min(quantity, item.product.stock);
    await prisma.cartItem.update({ where: { id: itemId }, data: { quantity: q } });
  }
  return NextResponse.json({ ok: true });
}
