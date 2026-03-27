import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { ensureUserWallet } from "@/lib/wallet";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const w = await ensureUserWallet(prisma, user.id);
  const recent = await prisma.walletLedgerEntry.findMany({
    where: { walletId: w.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  return NextResponse.json({
    wallet: {
      balance: w.balance,
      depositReference: w.depositReference,
    },
    ledger: recent.map((e) => ({
      id: e.id,
      amount: e.amount,
      type: e.type,
      label: e.label,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

const depositCardSchema = z.object({
  savedCardId: z.string().min(1),
  amount: z.number().positive().max(50_000),
});

/** Simulation : crédit du wallet depuis une carte enregistrée (pas de vrai prélèvement). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = depositCardSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Montant ou carte invalide" }, { status: 400 });
  }
  const { savedCardId, amount } = parsed.data;
  const card = await prisma.savedCard.findFirst({
    where: { id: savedCardId, userId: user.id },
  });
  if (!card) {
    return NextResponse.json({ error: "Carte introuvable" }, { status: 404 });
  }

  const w = await ensureUserWallet(prisma, user.id);
  const label = `Dépôt simulé — ${card.brand} •••• ${card.last4}`;

  await prisma.$transaction(async (tx) => {
    await tx.userWallet.update({
      where: { id: w.id },
      data: { balance: { increment: amount } },
    });
    await tx.walletLedgerEntry.create({
      data: {
        walletId: w.id,
        amount,
        type: "DEPOSIT_CARD",
        label,
        savedCardId: card.id,
      },
    });
  });

  const updated = await prisma.userWallet.findUniqueOrThrow({ where: { id: w.id } });
  return NextResponse.json({
    ok: true,
    balance: updated.balance,
    message: "Solde crédité (simulation bancaire)",
  });
}
