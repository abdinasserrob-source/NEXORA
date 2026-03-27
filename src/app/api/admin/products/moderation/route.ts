import { NotifType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  productId: z.string(),
  action: z.enum(["APPROVE", "REJECT"]),
  notificationId: z.string().optional(),
});

function parseAttributes(raw: string | null | undefined): Record<string, string | number | boolean> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, string | number | boolean>) : {};
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { productId, action, notificationId } = parsed.data;

  const p = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, sellerId: true, attributes: true },
  });
  if (!p) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });

  if (action === "APPROVE") {
    const attrs = parseAttributes(p.attributes);
    attrs.__moderationStatus = "APPROVED";

    await prisma.product.update({
      where: { id: p.id },
      data: { archived: false, attributes: JSON.stringify(attrs) },
    });

    await prisma.notification.create({
      data: {
        userId: p.sellerId,
        type: NotifType.SELLER,
        title: "Produit approuvé",
        body: `Votre produit "${p.name}" a été approuvé par l'administration et est maintenant publié.`,
      },
    });

    const followers = await prisma.vendorFavorite.findMany({
      where: { sellerUserId: p.sellerId },
      select: { userId: true },
      take: 5000,
    });
    const notifData = followers
      .filter((f) => f.userId !== p.sellerId)
      .slice(0, 5000)
      .map((f) => ({
        userId: f.userId,
        type: NotifType.SELLER,
        title: "Nouveau produit disponible",
        body: `Votre boutique suivie vient de publier : ${p.name}`,
      }));
    if (notifData.length > 0) await prisma.notification.createMany({ data: notifData });
  } else {
    await prisma.product.delete({ where: { id: p.id } });
    await prisma.notification.create({
      data: {
        userId: p.sellerId,
        type: NotifType.SELLER,
        title: "Produit refusé",
        body: `Votre produit "${p.name}" a été refusé par l'administration et n'a pas été ajouté au catalogue.`,
      },
    });
  }

  if (notificationId) {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: auth.sub },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}

