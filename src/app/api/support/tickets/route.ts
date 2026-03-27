import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(3),
  body: z.string().min(10),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const user = await getCurrentUser();
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user?.id,
      email: parsed.data.email,
      subject: parsed.data.subject,
      body: parsed.data.body,
    },
  });
  return NextResponse.json({ ticketId: ticket.id });
}
