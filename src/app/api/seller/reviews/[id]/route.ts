import { prisma } from "@/lib/db";
import { getVerifiedSeller } from "@/lib/session-user";
import { sellerCannotOperate } from "@/lib/seller-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  sellerReply: z.string().min(1).max(2000),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller.id } });
  if (sellerCannotOperate(profile)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const review = await prisma.review.findFirst({
    where: { id, product: { sellerId: seller.id } },
  });
  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      sellerReply: parsed.data.sellerReply,
      sellerRepliedAt: new Date(),
    },
  });

  return NextResponse.json({
    review: {
      id: updated.id,
      sellerReply: updated.sellerReply,
      sellerRepliedAt: updated.sellerRepliedAt?.toISOString() ?? null,
    },
  });
}
