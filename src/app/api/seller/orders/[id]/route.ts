import { prisma } from "@/lib/db";
import { getVerifiedSeller } from "@/lib/session-user";
import { sellerCannotOperate } from "@/lib/seller-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller.id } });
  if (sellerCannotOperate(profile)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const allItemsBelongToSeller = order.items.every((it) => it.product.sellerId === seller.id);
  if (!allItemsBelongToSeller) {
    return NextResponse.json(
      {
        error: "Order mixte",
        message: "Vous ne pouvez pas modifier le statut d'une commande contenant des produits d'autres vendeurs.",
      },
      { status: 403 }
    );
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ ok: true, order: { id: updated.id, status: updated.status } });
}

