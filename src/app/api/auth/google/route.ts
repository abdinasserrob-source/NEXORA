import { Role } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { mergeAnonymousSessionIntoUser } from "@/lib/cart-merge";
import { signToken } from "@/lib/jwt";
import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ idToken: z.string() });

export async function POST(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error:
          "Google OAuth non configuré. Ajoutez GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.",
      },
      { status: 503 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "idToken requis" }, { status: 400 });
  }

  const client = new OAuth2Client(clientId);
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    return NextResponse.json({ error: "Token Google invalide" }, { status: 401 });
  }
  if (!payload?.email) {
    return NextResponse.json({ error: "Email manquant" }, { status: 400 });
  }

  const email = payload.email.toLowerCase();
  const googleId = payload.sub;

  let user = await prisma.user.findFirst({
    where: { OR: [{ email }, { googleId }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        emailVerified: true,
        firstName: payload.given_name,
        lastName: payload.family_name,
        name: payload.name ?? email.split("@")[0],
        avatar: payload.picture,
        role: "CLIENT",
      },
    });
    await sendEmail(
      email,
      "Bienvenue sur NEXORA",
      `<p>Votre compte Google a été relié à NEXORA.</p>`
    );
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId, emailVerified: true, avatar: user.avatar ?? payload.picture },
    });
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
}
