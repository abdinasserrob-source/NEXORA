import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const returns = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    include: { order: true },
    orderBy: { createdAt: "desc" },
  });
  const productIds = [...new Set(returns.map((r) => r.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true },
  });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  return NextResponse.json({
    returns: returns.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      createdAt: r.createdAt,
      orderId: r.orderId,
      orderTotal: r.order.total,
      product: byId[r.productId] ?? { id: r.productId, name: "Produit", slug: "" },
    })),
  });
}
