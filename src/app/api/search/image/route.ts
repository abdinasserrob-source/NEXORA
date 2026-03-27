import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VisionResult = {
  objectLabel: string;
  query: string;
  categoryHint: string;
};

function parseImages(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9àâçéèêëîïôûùüÿñæœ]+/gi)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 4);
}

async function analyzeImageWithOpenAI(dataUrl: string): Promise<VisionResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) return null;

  const model = process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  const prompt =
    "Analyse cette image produit. Retourne STRICTEMENT un JSON compact avec: objectLabel (nom objet), query (requête e-commerce brève en français), categoryHint (catégorie probable parmi: electronique, vetements, maison, sport-loisirs, vehicule-transport, beaute, medical-sante, bagages, chaussures, bijoux-lunettes-montre, meubles, parent-enfant-jouet, pieces-detachees, agriculture-aliment, hygiene-perso, machine-industrielle).";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  const jsonText = raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!jsonText) return null;

  try {
    const parsed = JSON.parse(jsonText) as Partial<VisionResult>;
    return {
      objectLabel: String(parsed.objectLabel ?? "").trim(),
      query: String(parsed.query ?? "").trim(),
      categoryHint: String(parsed.categoryHint ?? "").trim(),
    };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  const f = fd.get("file");
  if (!(f instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });

  const mime = f.type || "image/jpeg";
  const bytes = Buffer.from(await f.arrayBuffer());
  if (!bytes.length) return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  if (bytes.length > 8 * 1024 * 1024) return NextResponse.json({ error: "Image trop grande (max 8MB)" }, { status: 400 });

  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
  const vision = await analyzeImageWithOpenAI(dataUrl);
  if (!vision) {
    return NextResponse.json(
      { error: "Analyse image indisponible. Vérifiez OPENAI_API_KEY." },
      { status: 503 }
    );
  }

  const q = vision.query || vision.objectLabel;
  const tokens = tokenize(q);

  let direct = await prisma.product.findMany({
    where: {
      isFlagged: false,
      stock: { gt: 0 },
      archived: false,
      seller: { banned: false },
      OR: tokens.length
        ? tokens.flatMap((t) => [
            { name: { contains: t, mode: "insensitive" as const } },
            { slug: { contains: t, mode: "insensitive" as const } },
            { description: { contains: t, mode: "insensitive" as const } },
          ])
        : [{ name: { contains: q, mode: "insensitive" as const } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 18,
    select: { id: true, name: true, slug: true, price: true, comparePrice: true, description: true, images: true, isPromo: true },
  });

  let mode: "direct" | "category" | "none" = "direct";
  let message = `Recherche image: "${vision.objectLabel || q}".`;

  if (direct.length === 0) {
    const cat = await prisma.category.findFirst({
      where: {
        OR: [
          { slug: { contains: vision.categoryHint, mode: "insensitive" } },
          { name: { contains: vision.categoryHint, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true },
    });

    if (cat) {
      const sameCategory = await prisma.product.findMany({
        where: {
          isFlagged: false,
          stock: { gt: 0 },
          archived: false,
          seller: { banned: false },
          categoryId: cat.id,
        },
        orderBy: { updatedAt: "desc" },
        take: 18,
        select: { id: true, name: true, slug: true, price: true, comparePrice: true, description: true, images: true, isPromo: true },
      });
      if (sameCategory.length > 0) {
        direct = sameCategory;
        mode = "category";
        message = `Produit "${vision.objectLabel || q}" introuvable. Voici des produits de même catégorie (${cat.name}).`;
      } else {
        mode = "none";
        message = `Produit "${vision.objectLabel || q}" introuvable actuellement.`;
      }
    } else {
      mode = "none";
      message = `Produit "${vision.objectLabel || q}" introuvable actuellement.`;
    }
  }

  return NextResponse.json({
    mode,
    objectLabel: vision.objectLabel || q,
    query: q,
    message,
    products: direct.map((p) => ({
      ...p,
      images: parseImages(p.images),
    })),
  });
}

