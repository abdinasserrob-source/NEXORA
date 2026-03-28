import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { mergeAnonymousSessionIntoUser } from "@/lib/cart-merge";
import { signToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().transform((s) => s.trim().toLowerCase()).pipe(z.email({ error: "Email invalide" })),
  password: z.string(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Données invalides";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Aucun compte pour cet e-mail. Créez un compte ou vérifiez l’orthographe.",
        },
        { status: 401 }
      );
    }
    if (user.banned) {
      return NextResponse.json({ error: "Compte suspendu" }, { status: 403 });
    }
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Ce compte n’a pas de mot de passe. Utilisez « Continuer avec Google » ou « Mot de passe oublié » pour en définir un.",
        },
        { status: 401 }
      );
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
    }

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
    console.error("[POST /api/auth/login]", e);
    return NextResponse.json(
      {
        error:
          "Impossible de joindre la base de données. Vérifiez que PostgreSQL est démarré et que DATABASE_URL dans .env est correct.",
      },
      { status: 503 }
    );
  }
}
