import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const all = await prisma.category.findMany({
    include: { children: true, _count: { select: { products: true } } },
    where: { parentId: null },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories: all });
}
