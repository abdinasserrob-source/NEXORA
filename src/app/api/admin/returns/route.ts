import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const returns = await prisma.returnRequest.findMany({
    include: {
      order: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ returns });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const r = await prisma.returnRequest.findUnique({
    where: { id: parsed.data.id },
    include: { order: { include: { user: true } } },
  });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const line = await prisma.orderItem.findFirst({
    where: { orderId: r.orderId, productId: r.productId },
  });
  const amount = line ? line.priceSnap * line.quantity : 0;

  const newStatus =
    parsed.data.status === "APPROVED" ? ("REFUNDED" as const) : ("REJECTED" as const);

  await prisma.returnRequest.update({
    where: { id: parsed.data.id },
    data: { status: newStatus },
  });

  if (parsed.data.status === "APPROVED") {
    await prisma.paymentTransaction.create({
      data: {
        orderId: r.orderId,
        userId: r.userId,
        amount: -amount,
        status: "REFUNDED",
        note: "Remboursement retour approuvé (simulation)",
      },
    });
    await sendEmail(
      r.order.user.email,
      "Retour approuvé",
      `<p>Remboursement simulé de ${amount.toFixed(2)} €.</p>`
    );
  }

  return NextResponse.json({ ok: true });
}
