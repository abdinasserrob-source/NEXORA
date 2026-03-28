/**
 * pg ≥ 8.x avertit si sslmode est require/prefer/verify-ca sans précision :
 * aujourd’hui ils sont traités comme verify-full ; ce ne sera plus le cas en v9.
 * Forcer verify-full garde le comportement actuel et supprime le warning.
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizeDatabaseUrlForPgSsl(url: string | undefined): string | undefined {
  if (!url?.trim()) return url;
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode");
    if (!mode) return url;
    if (u.searchParams.get("uselibpqcompat") === "true") return url;
    const m = mode.toLowerCase();
    if (m === "require" || m === "prefer" || m === "verify-ca") {
      u.searchParams.set("sslmode", "verify-full");
    }
    return u.toString();
  } catch {
    return url;
  }
}
