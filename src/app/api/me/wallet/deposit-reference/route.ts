import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { ensureUserWallet } from "@/lib/wallet";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  reference: z.string().min(6),
  amount: z.number().positive().max(50_000),
});

/**
 * Simulation d’un virement entrant : la référence doit correspondre à celle du portefeuille utilisateur.
 * (En production ce serait un webhook banque / reconcilation.)
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const w = await ensureUserWallet(prisma, user.id);
  const ref = parsed.data.reference.trim().toUpperCase().replace(/\s+/g, "");
  const expected = w.depositReference.toUpperCase().replace(/\s+/g, "");
  if (ref !== expected) {
    return NextResponse.json({ error: "Référence incorrecte pour ce compte" }, { status: 400 });
  }
  const amount = parsed.data.amount;

  await prisma.$transaction(async (tx) => {
    await tx.userWallet.update({
      where: { id: w.id },
      data: { balance: { increment: amount } },
    });
    await tx.walletLedgerEntry.create({
      data: {
        walletId: w.id,
        amount,
        type: "DEPOSIT_REFERENCE",
        label: `Virement simulé (réf. ${w.depositReference})`,
      },
    });
  });

  const updated = await prisma.userWallet.findUniqueOrThrow({ where: { id: w.id } });
  return NextResponse.json({ ok: true, balance: updated.balance });
}
