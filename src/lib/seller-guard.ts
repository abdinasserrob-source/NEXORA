import type { SellerProfile } from "@/generated/prisma/client";

/** Champs dont la modification équivaut à « publier / enrichir le catalogue » (interdit si suspendu). */
const CATALOG_PUBLISH_KEYS = new Set([
  "name",
  "description",
  "images",
  "categoryId",
  "brandId",
  "slug",
  "tags",
  "attributes",
]);

/** Accès vendeur révoqué par l’admin (aucune API « lecture » du dashboard). */
export function sellerAccessRevoked(profile: SellerProfile | null): boolean {
  return profile?.operationalStatus === "BLOCKED";
}

/** Pas de vente / pas de mutations catalogue (boutique non approuvée ou bloquée). */
export function sellerCannotOperate(profile: SellerProfile | null): boolean {
  return !profile?.approved || profile?.operationalStatus === "BLOCKED";
}

/** @deprecated Utiliser sellerAccessRevoked (lecture) ou sellerCannotOperate (écriture). */
export function sellerIsBlocked(profile: SellerProfile | null): boolean {
  return sellerCannotOperate(profile);
}

export function sellerIsSuspended(profile: SellerProfile): boolean {
  return profile.operationalStatus === "SUSPENDED";
}

export function patchTouchesCatalogPublish(
  patch: Record<string, unknown>,
  opts?: { wasArchived?: boolean; archivedInPatch?: boolean | undefined }
): boolean {
  for (const k of Object.keys(patch)) {
    if (patch[k] === undefined) continue;
    if (CATALOG_PUBLISH_KEYS.has(k)) return true;
  }
  if (opts?.wasArchived && opts.archivedInPatch === false) return true;
  return false;
}
