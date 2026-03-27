import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const products = await prisma.product.findMany({
    where: {
      isFlagged: false,
      stock: { gt: 0 },
      OR: [
        { name: { contains: q } },
        { slug: { contains: q } },
      ],
    },
    take: 10,
    select: { id: true, name: true, slug: true, price: true, images: true },
  });

  return NextResponse.json({
    suggestions: products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      thumb: (JSON.parse(p.images) as string[])[0] ?? null,
    })),
  });
}
