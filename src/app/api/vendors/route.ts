import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

/** Liste des boutiques approuvées (pour suivre des vendeurs). */
export async function GET() {
  const profiles = await prisma.sellerProfile.findMany({
    where: { approved: true },
    include: {
      user: { select: { id: true, name: true, avatar: true, email: true } },
    },
    orderBy: { shopName: "asc" },
    take: 200,
  });
  return NextResponse.json({
    vendors: profiles.map((p) => ({
      sellerUserId: p.userId,
      shopName: p.shopName,
      description: p.description,
      rating: p.rating,
      salesCount: p.salesCount,
      seller: p.user,
    })),
  });
}
