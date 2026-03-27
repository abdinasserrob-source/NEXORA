import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [categories, brands, sellers] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, parentId: true },
      take: 1000,
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
      take: 1000,
    }),
    prisma.user.findMany({
      where: { role: "SELLER", banned: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        sellerProfile: { select: { shopName: true, approved: true, operationalStatus: true } },
      },
      take: 500,
    }),
  ]);

  return NextResponse.json({ categories, brands, sellers });
}

