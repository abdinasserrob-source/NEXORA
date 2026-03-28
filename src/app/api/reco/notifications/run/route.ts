import { prisma } from "@/lib/db";
import { getEffectiveRecoHomeMode } from "@/lib/reco-algo-config";
import { NextResponse } from "next/server";
import { getRecommendations } from "@/lib/recommendation";
import { NotifType } from "@/generated/prisma/enums";
import { z } from "zod";

const bodySchema = z.object({
  slot: z.enum(["9", "14", "19"]).optional(),
  limitUsers: z.number().int().min(1).max(500).optional(),
});

function getSlotNow() {
  const h = new Date().getHours();
  if (h >= 8 && h <= 11) return "9";
  if (h >= 13 && h <= 16) return "14";
  if (h >= 18 && h <= 21) return "19";
  return null;
}

export async function POST(req: Request) {
  const secret = process.env.RECO_CRON_SECRET;
  if (secret) {
    const header = req.headers.get("x-cron-secret") ?? "";
    if (header !== secret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const slot = parsed.data.slot ?? getSlotNow();
  if (!slot) return NextResponse.json({ skipped: true, reason: "Hors fenêtre horaire" });

  const limitUsers = parsed.data.limitUsers ?? 200;

  const algoMode = await getEffectiveRecoHomeMode();

  const title = `Recommandations pour vous — ${slot}h`;
  const users = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: { id: true },
    take: limitUsers,
  });

  let created = 0;
  for (const u of users) {
    const already = await prisma.notification.findFirst({
      where: { userId: u.id, type: NotifType.SYSTEM, title },
      select: { id: true },
    });
    if (already) continue;

    const viewed = await prisma.browseEvent.findMany({
      where: { userId: u.id, productId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { productId: true },
    });

    const orders = await prisma.order.findMany({
      where: { userId: u.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { items: { select: { productId: true } } },
    });

    const purchased = orders.flatMap((o) => o.items.map((it) => it.productId));
    const viewedIds = viewed.map((v) => v.productId).filter(Boolean) as string[];

    const seedProductIds = [...purchased, ...viewedIds].filter(Boolean).slice(0, 12);

    if (seedProductIds.length === 0) continue;

    const recos = await getRecommendations({
      userId: u.id,
      placement: "HOME",
      limit: 3,
      algoMode,
      seedProductIds,
    });

    if (recos.length === 0) continue;

    const body = `Basé sur vos consultations/achats, voici ${recos.length} suggestions : ` +
      recos.map((r) => `“${r.product.name}” (/produit/${r.product.slug})`).join(" · ");

    await prisma.notification.create({
      data: {
        userId: u.id,
        type: NotifType.SYSTEM,
        title,
        body: body.slice(0, 1200),
        channels: "TOAST,PUSH",
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created, usersConsidered: users.length, slot });
}

