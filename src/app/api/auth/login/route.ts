import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { mergeAnonymousSessionIntoUser } from "@/lib/cart-merge";
import { signToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user?.passwordHash || user.banned) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
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
