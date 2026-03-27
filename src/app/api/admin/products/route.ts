import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { isProductCoherentWithCategory } from "@/lib/category-coherence";
import { NextResponse } from "next/server";
import { z } from "zod";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    take: 300,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      stock: true,
      isFlagged: true,
      isPromo: true,
      comparePrice: true,
      promoPercent: true,
      promoAmount: true,
      badge: true,
      seller: { select: { id: true, email: true, name: true, firstName: true, lastName: true } },
    },
  });
  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      stock: p.stock,
      isFlagged: p.isFlagged,
      isPromo: p.isPromo,
      comparePrice: p.comparePrice,
      promoPercent: p.promoPercent,
      promoAmount: p.promoAmount,
      badge: p.badge,
      sellerEmail: p.seller?.email ?? "—",
      sellerLabel:
        p.seller != null
          ? [p.seller.firstName, p.seller.lastName].filter(Boolean).join(" ") ||
            p.seller.name ||
            p.seller.email
          : "—",
    })),
  });
}

const createSchema = z
  .object({
    name: z.string().min(2),
    slug: z.string().min(2).optional(),
    description: z.string().min(10),
    price: z.number().min(0),
    stock: z.number().int().min(0),
    categoryId: z.string().min(1),
    sellerId: z.string().min(1),
    brandId: z.string().min(1).nullable().optional(),
    imageUrl: z.string().min(1),
  })
  .strict();

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, price, stock, categoryId, sellerId, brandId, imageUrl } = parsed.data;

  const seller = await prisma.user.findUnique({ where: { id: sellerId }, select: { role: true, banned: true } });
  if (!seller || seller.banned || seller.role !== "SELLER") {
    return NextResponse.json({ error: "Vendeur invalide" }, { status: 400 });
  }

  const categoryFull = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, slug: true, parent: { select: { slug: true } } },
  });
  if (!categoryFull) return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });

  const coherent = isProductCoherentWithCategory({
    categorySlug: categoryFull.slug,
    parentCategorySlug: categoryFull.parent?.slug ?? null,
    name,
    description,
    tags: [],
  });
  if (!coherent) {
    return NextResponse.json(
      { error: "Le produit ne semble pas correspondre à la catégorie choisie." },
      { status: 400 }
    );
  }

  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { id: true } });
    if (!brand) return NextResponse.json({ error: "Marque invalide" }, { status: 400 });
  }

  const baseSlug = slugify(parsed.data.slug?.trim() ? parsed.data.slug : name);
  if (!baseSlug) return NextResponse.json({ error: "Slug invalide" }, { status: 400 });

  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const exists = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) break;
    slug = `${baseSlug}-${i}`;
  }
  const stillExists = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
  if (stillExists) return NextResponse.json({ error: "Slug déjà utilisé" }, { status: 409 });

  const images = JSON.stringify([imageUrl]);

  const created = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      price,
      stock,
      categoryId,
      sellerId,
      brandId: brandId ?? null,
      images,
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json({ ok: true, product: created });
}
