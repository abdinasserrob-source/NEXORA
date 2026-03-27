import { dictionaries, isLocale, type Locale } from "./dictionaries";

function getNested(obj: Record<string, unknown>, parts: string[]): unknown {
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Remplace `{name}` dans la chaîne. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

export function translate(locale: string | undefined, key: string, vars?: Record<string, string | number>): string {
  const loc: Locale = isLocale(locale) ? locale : "fr";
  const parts = key.split(".");
  const raw = getNested(dictionaries[loc] as unknown as Record<string, unknown>, parts);
  if (typeof raw === "string") return interpolate(raw, vars);
  const fallback = getNested(dictionaries.fr as unknown as Record<string, unknown>, parts);
  if (typeof fallback === "string") return interpolate(fallback, vars);
  return key;
}
