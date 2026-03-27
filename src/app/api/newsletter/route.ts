import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

const postSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const user = await getCurrentUser();
  const email = parsed.data.email.toLowerCase();

  await prisma.newsletterSub.upsert({
    where: { email },
    create: { email, userId: user?.id, active: true },
    update: { active: true, userId: user?.id ?? undefined },
  });

  await sendEmail(
    email,
    "Newsletter NEXORA",
    "<p>Merci pour votre inscription à la newsletter NEXORA.</p>"
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sub = await prisma.newsletterSub.findFirst({ where: { userId: user.id } });
  if (sub) {
    await prisma.newsletterSub.update({
      where: { id: sub.id },
      data: { active: false },
    });
  }
  return NextResponse.json({ ok: true });
}
