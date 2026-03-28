import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { returnReasonLabel } from "@/lib/return-request-shared";
import { ensureUserWallet } from "@/lib/wallet";
import { NextResponse } from "next/server";
import { z } from "zod";

function escHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNote: z.string().max(2000).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const rr = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      order: true,
      user: { select: { email: true, firstName: true } },
    },
  });

  if (!rr) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (rr.status !== "PENDING") {
    return NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 400 });
  }

  const note = parsed.data.adminNote?.trim() || null;

  if (parsed.data.action === "approve") {
    const orderTotal = rr.order.total;
    const buyerId = rr.order.userId;
    const fullOrderId = rr.order.id;
    const refundLabel = `Remboursement commande #${fullOrderId}`;
    const amountStr = orderTotal.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    await prisma.$transaction(async (tx) => {
      await tx.returnRequest.update({
        where: { id: rr.id },
        data: { status: "APPROVED", adminNote: note },
      });
      await tx.order.update({
        where: { id: rr.orderId },
        data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
      });
      const wallet = await ensureUserWallet(tx, buyerId);
      await tx.userWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: orderTotal } },
      });
      await tx.walletLedgerEntry.create({
        data: {
          walletId: wallet.id,
          amount: orderTotal,
          type: "REFUND",
          label: refundLabel,
          orderId: fullOrderId,
        },
      });
    });

    await sendEmail(
      rr.user.email,
      "NEXORA — votre demande a été approuvée",
      `<p>Bonjour${rr.user.firstName ? ` ${rr.user.firstName}` : ""},</p>
      <p>Votre demande (${rr.type}, motif : ${returnReasonLabel(rr.reason)}) concernant la commande <strong>${fullOrderId}</strong> a été <strong>approuvée</strong>.</p>
      ${note ? `<p><strong>Note de l’équipe :</strong> ${escHtml(note)}</p>` : ""}
      <p>Le statut de votre commande a été mis à jour en « remboursé ».</p>
      <p>Votre <strong>portefeuille NEXORA</strong> a été crédité de <strong>${escHtml(amountStr)}&nbsp;€</strong> (montant total de la commande). Vous le voyez dans <strong>Compte → Portefeuille</strong>.</p>
      <p>— NEXORA</p>`
    );

    return NextResponse.json({ ok: true });
  }

  await prisma.returnRequest.update({
    where: { id: rr.id },
    data: { status: "REJECTED", adminNote: note },
  });

  await sendEmail(
    rr.user.email,
    "NEXORA — suite à votre demande",
    `<p>Bonjour${rr.user.firstName ? ` ${rr.user.firstName}` : ""},</p>
    <p>Votre demande (${rr.type}, motif : ${returnReasonLabel(rr.reason)}) pour la commande <strong>${rr.orderId.slice(0, 14)}…</strong> a été <strong>refusée</strong>.</p>
    ${note ? `<p><strong>Motif :</strong> ${escHtml(note)}</p>` : ""}
    <p>Pour toute question, contactez le support.</p>
    <p>— NEXORA</p>`
  );

  return NextResponse.json({ ok: true });
}
