import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

function newDepositReference(): string {
  const h = randomBytes(5).toString("hex").toUpperCase();
  return `NX-${h.slice(0, 4)}-${h.slice(4, 10)}`;
}

/** Client Prisma ou transaction (mêmes délégués). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export async function ensureUserWallet(
  db: Db,
  userId: string
): Promise<{ id: string; balance: number; depositReference: string }> {
  const existing = await db.userWallet.findUnique({ where: { userId } });
  if (existing) {
    return {
      id: existing.id,
      balance: existing.balance,
      depositReference: existing.depositReference,
    };
  }
  for (let i = 0; i < 8; i++) {
    const depositReference = newDepositReference();
    try {
      const w = await db.userWallet.create({
        data: { userId, depositReference, balance: 0 },
      });
      return { id: w.id, balance: w.balance, depositReference: w.depositReference };
    } catch {
      /* collision rare sur depositReference */
    }
  }
  throw new Error("Impossible de créer le portefeuille");
}
