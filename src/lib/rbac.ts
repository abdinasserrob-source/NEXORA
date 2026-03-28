import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  getAuthFromCookies,
  readNexoraTokenFromCookieHeader,
  verifyToken,
  type JwtPayload,
} from "./jwt";

/** Autorisation sur le rôle réel en base (le JWT peut être obsolète après changement de rôle). */
export async function requireRole(allowed: Role[], request?: Request) {
  let auth: JwtPayload | null = null;
  if (request) {
    const t = readNexoraTokenFromCookieHeader(request.headers.get("cookie"));
    if (t) auth = await verifyToken(t);
  }
  if (!auth) auth = await getAuthFromCookies();
  if (!auth) return null;
  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { role: true, banned: true },
  });
  if (!user || user.banned || !allowed.includes(user.role)) return null;
  return { ...auth, role: user.role };
}
