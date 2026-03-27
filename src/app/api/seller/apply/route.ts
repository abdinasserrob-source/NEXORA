import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  shopName: z.string().min(2),
  description: z.string().min(10),
  shopEmail: z.string().email().optional(),
  shopPhone: z.string().min(3).optional(),
  shopAddress: z.string().min(5).optional(),
  documentNote: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CLIENT") {
    return NextResponse.json({ error: "Déjà vendeur ou admin" }, { status: 400 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const pending = await prisma.sellerApplication.findFirst({
    where: { userId: user.id, status: "PENDING" },
  });
  if (pending) {
    return NextResponse.json({ error: "Demande déjà en cours" }, { status: 409 });
  }

  await prisma.sellerApplication.create({
    data: {
      userId: user.id,
      shopName: parsed.data.shopName,
      description: parsed.data.description,
      shopEmail: parsed.data.shopEmail,
      shopPhone: parsed.data.shopPhone,
      shopAddress: parsed.data.shopAddress,
      documentNote: parsed.data.documentNote,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  for (const a of admins) {
    await sendEmail(
      a.email,
      `[NEXORA] Nouvelle demande vendeur — ${parsed.data.shopName}`,
      `<p><strong>${user.email}</strong> souhaite ouvrir la boutique « <strong>${parsed.data.shopName}</strong> ».</p>
       <p>${parsed.data.description.slice(0, 500)}${parsed.data.description.length > 500 ? "…" : ""}</p>
       <p><a href="${base}/admin">Ouvrir le tableau de bord admin</a> pour approuver ou refuser.</p>`
    );
  }

  await sendEmail(
    user.email,
    "NEXORA — demande vendeur bien reçue",
    `<p>Bonjour,</p>
     <p>Nous avons bien reçu votre demande pour la boutique « <strong>${parsed.data.shopName}</strong> ».</p>
     <p>Un administrateur va l’examiner. Vous recevrez un <strong>e-mail</strong> (et une notification sur le site) dès qu’elle sera <strong>approuvée</strong> ou <strong>refusée</strong>.</p>
     <p>Merci de votre confiance,<br/>L’équipe NEXORA</p>`
  );

  return NextResponse.json({ ok: true });
}
