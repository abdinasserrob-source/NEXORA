import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { Role } from "@/generated/prisma/enums";

const COOKIE = "nexora_token";

/** Extrait le JWT depuis l’en-tête brut `Cookie` (fiable dans les Route Handlers). */
export function readNexoraTokenFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const segment of cookieHeader.split(";")) {
    const part = segment.trim();
    const i = part.indexOf("=");
    if (i === -1) continue;
    const name = part.slice(0, i).trim();
    if (name !== COOKIE) continue;
    let value = part.slice(i + 1).trim();
    if (!value) return null;
    try {
      value = decodeURIComponent(value);
    } catch {
      /* valeur brute */
    }
    return value || null;
  }
  return null;
}

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
  const h = await headers();
  let token = readNexoraTokenFromCookieHeader(h.get("cookie"));
  if (!token) {
    const c = await cookies();
    token = c.get(COOKIE)?.value ?? null;
  }
  if (!token) return null;
  return verifyToken(token);
}
