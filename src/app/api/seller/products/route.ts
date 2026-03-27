import { prisma } from "@/lib/db";
import { getVerifiedSeller } from "@/lib/session-user";
import { sellerAccessRevoked, sellerCannotOperate, sellerIsSuspended } from "@/lib/seller-guard";
import { isProductCoherentWithCategory } from "@/lib/category-coherence";
import { NextResponse } from "next/server";
import { z } from "zod";
import { NotifType } from "@/generated/prisma/enums";

export async function GET() {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller.id } });
  if (sellerAccessRevoked(profile)) {
    return NextResponse.json({ error: "Accès vendeur désactivé" }, { status: 403 });
  }
  const products = await prisma.product.findMany({
    where: { sellerId: seller.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({
    products: products.map((p) => ({
      ...p,
      images: JSON.parse(p.images) as string[],
      crossSellIds: JSON.parse(p.crossSellIds || "[]") as string[],
      tags: JSON.parse(p.tags || "[]") as string[],
      attributes: JSON.parse(p.attributes || "{}") as Record<string, string | number | boolean>,
    })),
  });
}

const postSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().min(10),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  categoryId: z.string(),
  brandId: z.string().optional(),
  images: z.array(z.string()).min(1),
  isPromo: z.boolean().optional(),
  crossSellIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(req: Request) {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: seller.id },
  });
  if (sellerCannotOperate(profile)) {
    return NextResponse.json(
      { error: profile?.operationalStatus === "BLOCKED" ? "Accès vendeur désactivé" : "Boutique non approuvée" },
      { status: 403 }
    );
  }
  if (profile && sellerIsSuspended(profile)) {
    return NextResponse.json(
      { error: "Boutique suspendue : publication de nouveaux produits impossible." },
      { status: 403 }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const d = parsed.data;
  try {
    const category = await prisma.category.findUnique({
      where: { id: d.categoryId },
      select: { slug: true, parent: { select: { slug: true } } },
    });
    if (!category) {
      return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
    }
    const coherent = isProductCoherentWithCategory({
      categorySlug: category.slug,
      parentCategorySlug: category.parent?.slug ?? null,
      name: d.name,
      description: d.description,
      tags: d.tags ?? [],
    });
    if (!coherent) {
      return NextResponse.json(
        { error: "Le produit ne semble pas correspondre à la catégorie choisie." },
        { status: 400 }
      );
    }

    const moderationMeta: Record<string, string | number | boolean> = {
      ...(d.attributes ?? {}),
      __moderationStatus: "PENDING",
      __submittedBySeller: true,
    };

    const p = await prisma.product.create({
      data: {
        sellerId: seller.id,
        name: d.name,
        slug: d.slug,
        description: d.description,
        price: d.price,
        stock: d.stock,
        categoryId: d.categoryId,
        brandId: d.brandId,
        images: JSON.stringify(d.images),
        isPromo: d.isPromo ?? false,
        archived: true,
        crossSellIds: JSON.stringify(d.crossSellIds ?? []),
        tags: JSON.stringify(d.tags ?? []),
        attributes: JSON.stringify(moderationMeta),
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", banned: false },
      select: { id: true },
      take: 200,
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: NotifType.SYSTEM,
          title: "Validation produit vendeur",
          body: `Produit en attente: ${p.name} | sellerId=${seller.id} | productId=${p.id}`,
        })),
      });
    }

    return NextResponse.json({ product: p, pendingApproval: true });
  } catch {
    return NextResponse.json({ error: "Slug ou données invalides" }, { status: 400 });
  }
}
