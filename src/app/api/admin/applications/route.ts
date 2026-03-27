import { NotifType } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const applications = await prisma.sellerApplication.findMany({
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ applications });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const { id, status, adminNote } = parsed.data;
  const app = await prisma.sellerApplication.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.sellerApplication.update({
      where: { id },
      data: { status, adminNote },
    });
    if (status === "APPROVED") {
      await tx.user.update({
        where: { id: app.userId },
        data: { role: "SELLER" },
      });
      await tx.sellerProfile.upsert({
        where: { userId: app.userId },
        create: {
          userId: app.userId,
          shopName: app.shopName,
          description: app.description,
          shopEmail: app.shopEmail,
          shopPhone: app.shopPhone,
          shopAddress: app.shopAddress,
          approved: true,
          operationalStatus: "ACTIVE",
          approvedAt: new Date(),
        },
        update: {
          shopName: app.shopName,
          description: app.description,
          shopEmail: app.shopEmail ?? undefined,
          shopPhone: app.shopPhone ?? undefined,
          shopAddress: app.shopAddress ?? undefined,
          approved: true,
          operationalStatus: "ACTIVE",
          approvedAt: new Date(),
        },
      });
    }
  });

  const subject =
    status === "APPROVED"
      ? "NEXORA — votre boutique est approuvée"
      : "NEXORA — demande vendeur refusée";
  const body =
    status === "APPROVED"
      ? `<p>Félicitations ! Votre boutique « <strong>${app.shopName}</strong> » est approuvée.</p>
         <p>Vous pouvez dès maintenant accéder à l’espace <strong>Vendeur</strong> depuis votre compte.</p>`
      : `<p>Votre demande pour « <strong>${app.shopName}</strong> » n’a pas été retenue.</p>
         <p><strong>Motif :</strong> ${adminNote ?? "Non précisé."}</p>
         <p>Vous pouvez nous contacter via le support pour plus d’informations.</p>`;

  await sendEmail(app.user.email, subject, body);

  await prisma.notification.create({
    data: {
      userId: app.userId,
      type: NotifType.SELLER,
      title: status === "APPROVED" ? "Boutique approuvée" : "Demande vendeur refusée",
      body:
        status === "APPROVED"
          ? `« ${app.shopName} » est en ligne. Accédez à l’espace Vendeur.`
          : `Demande refusée. ${adminNote ?? ""}`.slice(0, 500),
      channels: "TOAST,PUSH",
    },
  });

  return NextResponse.json({ ok: true });
}
