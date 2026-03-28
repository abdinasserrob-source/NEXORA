/** Requête utilisateur : retire ponctuation parasite en fin de chaîne. */
export function normalizeSearchQuery(raw: string): string {
  return raw
    .trim()
    .replace(/[\s?！!。.]+$/u, "")
    .trim();
}

/**
 * Découpe une requête en mots significatifs (insensible à la casse).
 * Garde les chiffres courts (ex. « 15 » pour iPhone 15).
 */
export function searchTokens(raw: string): string[] {
  const q = normalizeSearchQuery(raw);
  if (!q) return [];
  return q
    .toLowerCase()
    .split(/[^a-z0-9àâçéèêëîïôûùüÿñæœ]+/gi)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 4);
}
