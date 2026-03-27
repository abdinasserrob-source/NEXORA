import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const transactions = await prisma.paymentTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      order: { select: { id: true, total: true, userId: true } },
    },
  });
  return NextResponse.json({
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      stripeRef: t.stripeRef,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
      orderId: t.orderId,
      orderTotal: t.order?.total ?? null,
    })),
  });
}
