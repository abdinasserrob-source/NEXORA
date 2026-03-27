import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  orderId: z.string(),
  productId: z.string(),
  reason: z.string().min(5),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, userId: user.id },
  });
  if (!order || order.status === "CANCELLED") {
    return NextResponse.json({ error: "Commande invalide" }, { status: 400 });
  }
  const days =
    (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days > 14) {
    return NextResponse.json({ error: "Délai de 14 jours dépassé" }, { status: 400 });
  }
  const item = await prisma.orderItem.findFirst({
    where: { orderId: order.id, productId: parsed.data.productId },
  });
  if (!item) {
    return NextResponse.json({ error: "Produit absent de la commande" }, { status: 400 });
  }
  const r = await prisma.returnRequest.create({
    data: {
      orderId: order.id,
      userId: user.id,
      productId: parsed.data.productId,
      reason: parsed.data.reason,
    },
  });
  return NextResponse.json({ returnRequest: r });
}
