import { Role } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { mergeAnonymousSessionIntoUser } from "@/lib/cart-merge";
import { signToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().transform((s) => s.trim().toLowerCase()).pipe(z.email({ error: "Email invalide" })),
  password: z.string().min(6, { error: "Mot de passe : 6 caractères minimum" }),
  /** Le formulaire envoie souvent "" : ne pas exiger min(1) sous peine de bloquer l’inscription. */
  firstName: z.string().max(80).optional().default(""),
  lastName: z.string().max(80).optional().default(""),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { email, password, firstName: fnRaw, lastName: lnRaw } = parsed.data;
  const firstName = fnRaw.trim() ? fnRaw.trim() : undefined;
  const lastName = lnRaw.trim() ? lnRaw.trim() : undefined;

  try {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email déjà utilisé" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        name: [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0],
        role: "CLIENT",
      },
    });

    await sendEmail(
      user.email,
      "Bienvenue sur NEXORA",
      `<p>Bonjour ${user.firstName ?? ""}, merci de nous avoir rejoints.</p>`
    );

    const sid = await getAnonSessionIdFromCookie();
    await mergeAnonymousSessionIntoUser(user.id, sid);

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as Role,
    });
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
    res.cookies.set("nexora_token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    console.error("[POST /api/auth/register]", e);
    return NextResponse.json(
      {
        error:
          "Impossible de créer le compte (base de données indisponible). Réessayez dans un instant.",
      },
      { status: 503 }
    );
  }
}
