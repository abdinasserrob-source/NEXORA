import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { randomInt } from "node:crypto";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ email: z.string().email() });

function sixDigitCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ ok: true });
    }
    const token = nanoid(48);
    const otpCode = sixDigitCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: { token, otpCode, userId: user.id, expiresAt },
    });

    const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#1a1d26;">
      <p style="font-size:18px;font-weight:600;">NEXORA — code de vérification</p>
      <p>Bonjour,</p>
      <p>Voici votre code à saisir sur le site (valide 15 minutes) :</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:0.25em;color:#00b8d9;">${otpCode}</p>
      <p style="color:#5c6578;font-size:14px;">Si vous n’avez pas demandé cette réinitialisation, ignorez ce message.</p>
    </div>
  `;

    const sent = await sendEmail(
      user.email,
      "NEXORA — votre code de vérification (6 chiffres)",
      html
    );

    const mailed = sent.ok && sent.mode === "smtp";
    return NextResponse.json({
      ok: true,
      mailed,
      mailError: !mailed && sent.error ? sent.error : undefined,
    });
  } catch (e) {
    console.error("[forgot-password]", e);
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
