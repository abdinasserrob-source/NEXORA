import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const returns = await prisma.returnRequest.findMany({
    where: { userId: user.id },
    include: {
      order: { select: { id: true, total: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    returns: returns.map((r) => ({
      id: r.id,
      orderId: r.order.id,
      orderTotal: r.order.total,
      orderStatus: r.order.status,
      type: r.type,
      reason: r.reason,
      description: r.description,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
}
