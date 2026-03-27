import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { ensureUserWallet } from "@/lib/wallet";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cards = await prisma.savedCard.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ cards });
}

const postSchema = z.object({
  brand: z.string().min(1),
  last4: z.string().length(4),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2025).max(2040),
});

/** Carte enregistrée en mode démo (pas de token Stripe réel). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données carte invalides" }, { status: 400 });
  }
  const card = await prisma.savedCard.create({
    data: {
      userId: user.id,
      brand: parsed.data.brand,
      last4: parsed.data.last4,
      expMonth: parsed.data.expMonth,
      expYear: parsed.data.expYear,
      stripeMock: `mock_${Date.now()}`,
    },
  });
  const wallet = await ensureUserWallet(prisma, user.id);
  return NextResponse.json({
    card,
    wallet: {
      balance: wallet.balance,
      depositReference: wallet.depositReference,
    },
  });
}
