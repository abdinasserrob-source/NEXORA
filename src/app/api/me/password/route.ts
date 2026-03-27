import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const full = await prisma.user.findUnique({ where: { id: user.id } });
  if (!full?.passwordHash) {
    return NextResponse.json(
      { error: "Compte sans mot de passe (Google). Utilisez la réinitialisation si besoin." },
      { status: 400 }
    );
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const ok = await bcrypt.compare(parsed.data.currentPassword, full.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
  return NextResponse.json({ ok: true });
}
