import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  orderId: z.string(),
  message: z.string().min(10),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const order = await prisma.order.findFirst({
    where: { id: parsed.data.orderId, userId: user.id },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const d = await prisma.dispute.create({
    data: {
      orderId: order.id,
      openedBy: user.id,
      message: parsed.data.message,
    },
  });
  return NextResponse.json({ dispute: d });
}
