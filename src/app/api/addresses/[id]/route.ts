import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  label: z.string().optional(),
  recipientName: z.string().min(2).optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  region: z.string().optional().nullable(),
  country: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const addr = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!addr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (parsed.data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
  }
  const payload = { ...parsed.data };
  if (payload.region !== undefined) {
    payload.region = payload.region?.trim() || null;
  }
  const updated = await prisma.address.update({
    where: { id },
    data: payload,
  });
  return NextResponse.json({ address: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const addr = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!addr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
