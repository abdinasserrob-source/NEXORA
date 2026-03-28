/**
 * pg ≥ 8.x : `sslmode=require|prefer|verify-ca` sans `uselibpqcompat=true` déclenche un warning
 * (comportement transitoire avant pg v9 / pg-connection-string v3).
 * - Hôtes managés : `uselibpqcompat=true` + `sslmode=require` → sémantique libpq, plus d’avertissement.
 * - Autres : `sslmode=verify-full` → comportement historique Node/pg actuel.
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
/** Hôtes managés où `verify-full` avec `pg` (Node) échoue souvent sous Windows / Node, alors que `require` suffit. */
function shouldKeepRelaxedSsl(hostname: string) {
  const h = hostname.toLowerCase();
  return (
    h.endsWith(".prisma.io") ||
    h.includes("neon.tech") ||
    h.endsWith(".supabase.co") ||
    h.endsWith(".pooler.supabase.com")
  );
}

export function normalizeDatabaseUrlForPgSsl(url: string | undefined): string | undefined {
  if (!url?.trim()) return url;
  try {
    const u = new URL(url);
    if (u.searchParams.get("uselibpqcompat") === "true") return url;
    const mode = u.searchParams.get("sslmode");
    if (!mode) return url;
    const m = mode.toLowerCase();
    if (m === "require" || m === "prefer" || m === "verify-ca") {
      if (shouldKeepRelaxedSsl(u.hostname)) {
        u.searchParams.set("uselibpqcompat", "true");
        if (m !== "require") u.searchParams.set("sslmode", "require");
        return u.toString();
      }
      u.searchParams.set("sslmode", "verify-full");
    }
    return u.toString();
  } catch {
    return url;
  }
}
