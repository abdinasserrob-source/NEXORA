import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await prisma.faqCategory.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json({ categories });
}
