import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { orderId } = await ctx.params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { carrier: true },
  });
  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({
    status: order.status,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier?.name,
  });
}
