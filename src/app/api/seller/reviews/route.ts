import { prisma } from "@/lib/db";
import { getVerifiedSeller } from "@/lib/session-user";
import { sellerAccessRevoked } from "@/lib/seller-guard";
import { NextResponse } from "next/server";

export async function GET() {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller.id } });
  if (sellerAccessRevoked(profile)) {
    return NextResponse.json({ error: "Accès vendeur désactivé" }, { status: 403 });
  }

  const reviews = await prisma.review.findMany({
    where: { product: { sellerId: seller.id } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      product: { select: { id: true, name: true, slug: true } },
      user: { select: { firstName: true, lastName: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      sellerReply: r.sellerReply,
      sellerRepliedAt: r.sellerRepliedAt?.toISOString() ?? null,
      product: r.product,
      customerLabel:
        [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") ||
        r.user.name ||
        r.user.email.replace(/@.*/, "…"),
    })),
  });
}
