import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";

/** Indique si l’utilisateur peut publier un avis (achat confirmé du produit). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ eligible: false, reason: "login", message: "Connectez-vous pour laisser un avis." });
  }

  const url = new URL(req.url);
  const productId = url.searchParams.get("productId")?.trim();
  if (!productId) {
    return NextResponse.json({ eligible: false, reason: "invalid", message: "Produit manquant." }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true },
  });
  if (!product) {
    return NextResponse.json({ eligible: false, reason: "not_found", message: "Produit introuvable." }, { status: 404 });
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
    return NextResponse.json({
      eligible: false,
      reason: "not_purchased",
      message:
        "Les avis sont réservés aux clients ayant acheté ce produit (commande payée, non annulée). Après achat, votre avis sera accepté.",
    });
  }

  return NextResponse.json({ eligible: true, orderId: order.id });
}
