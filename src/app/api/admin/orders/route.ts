import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, email: true, name: true, firstName: true, lastName: true } },
      items: { take: 3, select: { id: true, titleSnap: true, quantity: true, priceSnap: true } },
    },
  });
  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      customerEmail: o.user.email,
      customerLabel:
        [o.user.firstName, o.user.lastName].filter(Boolean).join(" ") ||
        o.user.name ||
        o.user.email,
      items: o.items,
    })),
  });
}
