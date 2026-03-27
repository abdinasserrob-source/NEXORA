import { prisma } from "./db";
import { getAuthFromCookies } from "./jwt";

export async function getCurrentUser() {
  const auth = await getAuthFromCookies();
  if (!auth) return null;
  const user = await prisma.user.findUnique({ where: { id: auth.sub } });
  if (!user || user.banned) return null;
  return user;
}

/** Rôle vendeur vérifié en BDD (le JWT peut encore dire CLIENT après approbation admin). */
export async function getVerifiedSeller() {
  const user = await getCurrentUser();
  if (!user || user.role !== "SELLER") return null;
  return user;
}
