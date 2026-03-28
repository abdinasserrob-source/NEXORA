import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [users, orders, revenue, products, pendingApps] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { isFlagged: false } }),
    prisma.sellerApplication.count({ where: { status: "PENDING" } }),
  ]);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders30 = await prisma.order.count({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
  });
  const revenue30 = await prisma.order.aggregate({
    where: { createdAt: { gte: since }, status: { not: "CANCELLED" } },
    _sum: { total: true },
  });
  const newUsers30 = await prisma.user.count({
    where: { createdAt: { gte: since }, role: "CLIENT" },
  });

  const recentOrders = await prisma.order.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      items: { take: 1, include: { product: { select: { name: true } } } },
    },
  });

  return NextResponse.json({
    users,
    orders,
    revenue: revenue._sum.total ?? 0,
    products,
    pendingSellerApplications: pendingApps,
    last30Days: {
      orders: orders30,
      revenue: revenue30._sum.total ?? 0,
      newCustomers: newUsers30,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      customer:
        [o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || o.user.email,
      productSample: o.items[0]?.product?.name ?? "—",
    })),
  });
}
