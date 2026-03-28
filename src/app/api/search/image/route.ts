import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { searchTokens } from "@/lib/search-tokens";
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

async function analyzeImageWithOpenAI(
  dataUrl: string
): Promise<{ ok: true; data: VisionResult } | { ok: false; reason: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) {
    return { ok: false, reason: "no_key" };
  }

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

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = (await res.json()) as { error?: { message?: string } };
      if (errBody?.error?.message) detail = errBody.error.message;
    } catch {
      /* ignore */
    }
    return { ok: false, reason: `openai_http_${detail}` };
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return { ok: false, reason: "openai_empty" };
  }

  const jsonText = raw.startsWith("{") ? raw : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!jsonText) {
    return { ok: false, reason: "openai_parse" };
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<VisionResult>;
    const vision: VisionResult = {
      objectLabel: String(parsed.objectLabel ?? "").trim(),
      query: String(parsed.query ?? "").trim(),
      categoryHint: String(parsed.categoryHint ?? "").trim(),
    };
    return { ok: true, data: vision };
  } catch {
    return { ok: false, reason: "openai_json" };
  }
}

function tokensFromFileName(name: string): string[] {
  const base = name.replace(/\.[^.]+$/i, "").replace(/[-_]+/g, " ");
  return searchTokens(base);
}

async function findProductsByTokens(tokens: string[], fullFallback: string) {
  const base: Prisma.ProductWhereInput = {
    isFlagged: false,
    stock: { gt: 0 },
    archived: false,
    seller: { banned: false },
  };

  if (tokens.length > 0) {
    const orClauses = tokens.flatMap((t) => [
      { name: { contains: t, mode: "insensitive" as const } },
      { slug: { contains: t, mode: "insensitive" as const } },
      { description: { contains: t, mode: "insensitive" as const } },
    ]);
    return prisma.product.findMany({
      where: { ...base, OR: orClauses },
      orderBy: { updatedAt: "desc" },
      take: 18,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        description: true,
        images: true,
        isPromo: true,
      },
    });
  }

  const phrase = fullFallback.trim();
  if (phrase.length < 2) return [];

  return prisma.product.findMany({
    where: {
      ...base,
      OR: [
        { name: { contains: phrase, mode: "insensitive" as const } },
        { slug: { contains: phrase, mode: "insensitive" as const } },
        { description: { contains: phrase, mode: "insensitive" as const } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 18,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      comparePrice: true,
      description: true,
      images: true,
      isPromo: true,
    },
  });
}

async function runCategoryFallback(vision: VisionResult, q: string) {
  let direct: Awaited<ReturnType<typeof findProductsByTokens>> = [];
  let mode: "direct" | "category" | "none" | "filename" = "direct";
  let message = `Recherche image: "${vision.objectLabel || q}".`;

  const tokens = searchTokens(vision.query || vision.objectLabel || q);
  direct = await findProductsByTokens(tokens, q);

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
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          comparePrice: true,
          description: true,
          images: true,
          isPromo: true,
        },
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

  return { direct, mode, message };
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
  const analyzed = await analyzeImageWithOpenAI(dataUrl);

  if (analyzed.ok) {
    const vision = analyzed.data;
    const q = vision.query || vision.objectLabel;
    const { direct, mode, message } = await runCategoryFallback(vision, q);

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

  /* Repli sans vision IA : mots-clés tirés du nom du fichier (ex. iphone-15.jpg) */
  const fnTokens = tokensFromFileName(f.name);
  if (fnTokens.length > 0) {
    const direct = await findProductsByTokens(fnTokens, fnTokens.join(" "));
    const q = fnTokens.join(" ");
    return NextResponse.json({
      mode: "filename" as const,
      objectLabel: q,
      query: q,
      message:
        direct.length > 0
          ? `Analyse IA indisponible — recherche d’après le nom du fichier (« ${f.name} »).`
          : `Analyse IA indisponible. Aucun résultat pour « ${q} » (essayez de renommer l’image ou configurez OPENAI_API_KEY).`,
      products: direct.map((p) => ({
        ...p,
        images: parseImages(p.images),
      })),
    });
  }

  const hint =
    analyzed.reason === "no_key"
      ? "Clé OpenAI absente : ajoutez OPENAI_API_KEY dans .env (ou renommez l’image, ex. smartphone-samsung.jpg)."
      : "Analyse image indisponible. Vérifiez OPENAI_API_KEY et le crédit API, ou renommez le fichier avec des mots-clés.";

  return NextResponse.json({ error: hint }, { status: 503 });
}
