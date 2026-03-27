import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rewards = await prisma.rewardCatalog.findMany({ where: { active: true } });
  const ledger = await prisma.loyaltyLedger.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json({
    points: user.loyaltyPoints,
    rewards,
    ledger,
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { rewardId } = (await req.json().catch(() => ({}))) as { rewardId?: string };
  if (!rewardId) {
    return NextResponse.json({ error: "rewardId requis" }, { status: 400 });
  }
  const reward = await prisma.rewardCatalog.findFirst({
    where: { id: rewardId, active: true },
  });
  if (!reward || user.loyaltyPoints < reward.costPoints) {
    return NextResponse.json({ error: "Points insuffisants" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { loyaltyPoints: { decrement: reward.costPoints } },
    });
    await tx.loyaltyLedger.create({
      data: {
        userId: user.id,
        delta: -reward.costPoints,
        reason: `Échange : ${reward.title}`,
      },
    });
    await tx.rewardRedemption.create({
      data: { userId: user.id, rewardId: reward.id },
    });
  });

  return NextResponse.json({
    ok: true,
    message: reward.promoCodeId
      ? "Code promo attribué (voir e-mail simulé)"
      : "Récompense enregistrée",
  });
}
