import type { BadgeCode } from "@/generated/prisma/enums";
import { prisma } from "./db";

async function grantBadge(userId: string, code: BadgeCode) {
  const exists = await prisma.userBadge.findFirst({
    where: { userId, code },
  });
  if (!exists) {
    await prisma.userBadge.create({ data: { userId, code } });
  }
}

export async function applyLoyaltyAndBadges(
  userId: string,
  orderTotal: number,
  orderId: string
) {
  const points = Math.floor(orderTotal * 10);
  await prisma.user.update({
    where: { id: userId },
    data: { loyaltyPoints: { increment: points } },
  });
  await prisma.loyaltyLedger.create({
    data: {
      userId,
      delta: points,
      reason: "ACHAT",
      orderId,
    },
  });

  const orderCount = await prisma.order.count({ where: { userId } });
  if (orderCount === 1) await grantBadge(userId, "FIRST_PURCHASE");
  if (orderCount >= 10) await grantBadge(userId, "LOYAL_10");

  const items = await prisma.orderItem.findMany({
    where: { order: { userId } },
    distinct: ["productId"],
    select: { productId: true },
  });
  if (items.length >= 5) await grantBadge(userId, "COLLECTOR");

  const spent = await prisma.order.aggregate({
    where: { userId, status: { not: "CANCELLED" } },
    _sum: { total: true },
  });
  if ((spent._sum.total ?? 0) >= 500) await grantBadge(userId, "VIP");
}
