import { prisma } from "@/lib/db";
import { getVerifiedSeller } from "@/lib/session-user";
import { patchTouchesCatalogPublish, sellerCannotOperate, sellerIsSuspended } from "@/lib/seller-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  images: z.array(z.string()).optional(),
  isPromo: z.boolean().optional(),
  comparePrice: z.number().min(0).nullable().optional(),
  promoPercent: z.number().min(0).nullable().optional(),
  promoAmount: z.number().min(0).nullable().optional(),
  badge: z.string().nullable().optional(),
  isFlagged: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  archived: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const existing = await prisma.product.findFirst({
    where: { id, sellerId: seller.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller.id } });
  if (sellerCannotOperate(profile)) {
    return NextResponse.json(
      { error: profile?.operationalStatus === "BLOCKED" ? "Accès vendeur désactivé" : "Boutique non approuvée" },
      { status: 403 }
    );
  }
  const d = parsed.data;
  if (
    profile &&
    sellerIsSuspended(profile) &&
    patchTouchesCatalogPublish({ ...d } as Record<string, unknown>, {
      wasArchived: existing.archived,
      archivedInPatch: d.archived,
    })
  ) {
    return NextResponse.json(
      { error: "Boutique suspendue : vous ne pouvez pas modifier le catalogue (prix/stock autorisés)." },
      { status: 403 }
    );
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...("name" in d && d.name !== undefined ? { name: d.name } : {}),
      ...("description" in d && d.description !== undefined
        ? { description: d.description }
        : {}),
      ...("price" in d && d.price !== undefined ? { price: d.price } : {}),
      ...("stock" in d && d.stock !== undefined ? { stock: d.stock } : {}),
      ...("images" in d && d.images !== undefined ? { images: JSON.stringify(d.images) } : {}),
      ...("isPromo" in d && d.isPromo !== undefined ? { isPromo: d.isPromo } : {}),
      ...("comparePrice" in d && d.comparePrice !== undefined ? { comparePrice: d.comparePrice } : {}),
      ...("promoPercent" in d && d.promoPercent !== undefined ? { promoPercent: d.promoPercent } : {}),
      ...("promoAmount" in d && d.promoAmount !== undefined ? { promoAmount: d.promoAmount } : {}),
      ...("badge" in d && d.badge !== undefined ? { badge: d.badge } : {}),
      ...("isFlagged" in d && d.isFlagged !== undefined ? { isFlagged: d.isFlagged } : {}),
      ...("tags" in d && d.tags !== undefined ? { tags: JSON.stringify(d.tags) } : {}),
      ...("attributes" in d && d.attributes !== undefined ? { attributes: JSON.stringify(d.attributes) } : {}),
      ...("archived" in d && d.archived !== undefined ? { archived: d.archived } : {}),
    },
  });
  return NextResponse.json({ product: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const existing = await prisma.product.findFirst({
    where: { id, sellerId: seller.id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller.id } });
  if (sellerCannotOperate(profile)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
