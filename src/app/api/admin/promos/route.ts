import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ promos });
}

const postSchema = z.object({
  code: z.string().min(3),
  kind: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive(),
  minCart: z.number().optional(),
  maxUses: z.number().optional(),
});

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const p = await prisma.promoCode.create({
    data: {
      code: parsed.data.code.toUpperCase(),
      kind: parsed.data.kind,
      value: parsed.data.value,
      minCart: parsed.data.minCart,
      maxUses: parsed.data.maxUses,
    },
  });
  return NextResponse.json({ promo: p });
}
