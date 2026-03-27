import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reviews = await prisma.review.findMany({
    where: { reported: true },
    orderBy: { reportedAt: "desc" },
    take: 200,
    include: {
      product: { select: { id: true, name: true, slug: true } },
      user: { select: { id: true, email: true, name: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      reported: r.reported,
      reportCount: r.reportCount,
      product: r.product,
      user: r.user,
    })),
  });
}

