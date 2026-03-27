import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";

const badgeSchema = z.enum(["bestseller", "new"]).nullable();
const patchSchema = z
  .object({
    price: z.number().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    isFlagged: z.boolean().optional(),
    badge: badgeSchema.optional(),
    isPromo: z.boolean().optional(),
    comparePrice: z.number().min(0).nullable().optional(),
    promoPercent: z.number().min(0).nullable().optional(),
    promoAmount: z.number().min(0).nullable().optional(),
  })
  .strict();

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const p = await prisma.product.findUnique({
    where: { id },
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

  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    product: {
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
    },
  });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;
  await prisma.product.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  const json = await req.json().catch(() => null);
  if (!json) return NextResponse.json({ error: "Body invalide" }, { status: 400 });

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides", details: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.product.update({
    where: { id },
    data: {
      ...(parsed.data.price !== undefined ? { price: parsed.data.price } : {}),
      ...(parsed.data.stock !== undefined ? { stock: parsed.data.stock } : {}),
      ...(parsed.data.isFlagged !== undefined ? { isFlagged: parsed.data.isFlagged } : {}),
      ...(parsed.data.badge !== undefined ? { badge: parsed.data.badge } : {}),
      ...(parsed.data.isPromo !== undefined ? { isPromo: parsed.data.isPromo } : {}),
      ...(parsed.data.comparePrice !== undefined ? { comparePrice: parsed.data.comparePrice } : {}),
      ...(parsed.data.promoPercent !== undefined ? { promoPercent: parsed.data.promoPercent } : {}),
      ...(parsed.data.promoAmount !== undefined ? { promoAmount: parsed.data.promoAmount } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
