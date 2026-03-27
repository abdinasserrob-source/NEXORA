function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KEYWORDS: Record<string, string[]> = {
  "agriculture-aliment": [
    "riz",
    "huile",
    "miel",
    "cafe",
    "the",
    "engrais",
    "semence",
    "agriculture",
    "aliment",
    "boisson",
    "arrosoir",
    "tomate",
  ],
  "vehicule-transport": [
    "voiture",
    "moto",
    "velo",
    "trottinette",
    "casque",
    "gps",
    "dashcam",
    "auto",
    "transport",
    "ferrari",
    "pneu",
  ],
  electronique: [
    "iphone",
    "samsung",
    "ecouteur",
    "airpods",
    "ssd",
    "usb",
    "clavier",
    "souris",
    "chargeur",
    "batterie",
    "tablette",
  ],
  maison: ["aspirateur", "cafetiere", "fer", "rideau", "coussin", "bougie", "tapis", "cadre", "maison", "cuisine"],
  chaussure: ["basket", "chaussure", "botte", "sandale", "mocassin", "escarpin", "tong"],
};

export function isProductCoherentWithCategory(input: {
  categorySlug: string;
  parentCategorySlug?: string | null;
  name: string;
  description?: string | null;
  tags?: string[] | null;
}) {
  const slug = input.parentCategorySlug || input.categorySlug;
  const words = KEYWORDS[slug];
  if (!words || words.length === 0) return true;

  const hay = normalizeText(
    [input.name, input.description ?? "", ...(input.tags ?? [])].filter(Boolean).join(" ")
  );
  return words.some((w) => hay.includes(w));
}

