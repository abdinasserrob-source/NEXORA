import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(4),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const { productId, rating, comment } = parsed.data;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
  }

  const order = await prisma.order.findFirst({
    where: {
      userId: user.id,
      status: { in: ["PAID", "SHIPPED", "DELIVERED"] },
      items: {
        some: {
          product: { slug: product.slug },
        },
      },
    },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json(
      {
        error:
          "Avis réservé aux acheteurs de ce produit : une commande payée et livrée (ou en cours) avec cet article est requise.",
        code: "NOT_PURCHASER",
      },
      { status: 403 }
    );
  }
  try {
    const rev = await prisma.review.create({
      data: { userId: user.id, productId, rating, comment },
      include: {
        user: { select: { id: true, email: true, name: true, firstName: true, lastName: true, avatar: true } },
        product: { select: { id: true, slug: true, name: true } },
      },
    });
    return NextResponse.json({ review: rev });
  } catch {
    return NextResponse.json({ error: "Avis déjà publié" }, { status: 409 });
  }
}
