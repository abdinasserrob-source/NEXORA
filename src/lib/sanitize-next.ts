/**
 * Évite les boucles du type /connexion?next=/connexion?next=… et les redirections ouvertes.
 */
export function sanitizeRedirectPath(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "/";
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return "/";
  }
  if (!path.startsWith("/")) return "/";
  if (path.startsWith("//")) return "/";
  const pathOnly = path.split("?")[0] ?? path;
  if (pathOnly.startsWith("/connexion") || pathOnly.startsWith("/inscription")) return "/";
  if (path.length > 512) return "/";
  return path;
}
