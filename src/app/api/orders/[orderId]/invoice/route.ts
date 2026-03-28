import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orderId } = await ctx.params;
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const pdfBytes = await buildInvoicePdf({
    orderId: order.id,
    customerName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
    lines: order.items.map((i) => ({
      title: i.titleSnap,
      qty: i.quantity,
      unit: i.priceSnap,
      total: i.priceSnap * i.quantity,
    })),
    subtotal: order.subtotal,
    shipping: order.shippingCost,
    discount: order.discount,
    total: order.total,
    createdAt: order.createdAt,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nexora-facture-${order.id.slice(0, 8)}.pdf"`,
    },
  });
}
