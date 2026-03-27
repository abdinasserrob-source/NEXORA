import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code à 6 chiffres"),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  const code = parsed.data.code;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.banned) {
    return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
  }

  const row = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      otpCode: code,
      expiresAt: { gt: new Date() },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Code invalide ou expiré" }, { status: 400 });
  }

  // On conserve le token validé (utilisé ensuite sur /reinitialiser-mot-de-passe).
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, NOT: { id: row.id } },
  });

  return NextResponse.json({
    ok: true,
    token: row.token,
  });
}
