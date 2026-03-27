import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/generated/prisma/enums";

const COOKIE = "nexora_token";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET manquant ou trop court");
  return new TextEncoder().encode(s);
}

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export async function signToken(payload: JwtPayload, maxAgeSec = 60 * 60 * 24 * 7) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(secret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    const sub = String(payload.sub ?? "");
    const email = String((payload as Record<string, unknown>).email ?? "");
    const role = (payload as Record<string, unknown>).role as Role;
    if (!sub || !email || !role) return null;
    return { sub, email, role };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAuthCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

export async function getAuthFromCookies(): Promise<JwtPayload | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
