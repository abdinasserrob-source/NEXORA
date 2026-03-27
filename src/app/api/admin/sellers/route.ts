import { SellerOperationalStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";

const statusEnum = z.nativeEnum(SellerOperationalStatus);

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sellers = await prisma.user.findMany({
    where: { role: "SELLER" },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      sellerProfile: {
        select: {
          shopName: true,
          approved: true,
          operationalStatus: true,
        },
      },
    },
  });

  return NextResponse.json({ sellers });
}

const patchSchema = z.object({
  userId: z.string(),
  operationalStatus: statusEnum,
});

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const { userId, operationalStatus } = parsed.data;

  const prof = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (!prof) {
    return NextResponse.json({ error: "Profil vendeur introuvable" }, { status: 404 });
  }

  await prisma.sellerProfile.update({
    where: { userId },
    data: { operationalStatus },
  });

  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ userId: z.string() });

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { userId } = parsed.data;
  if (userId === auth.sub) {
    return NextResponse.json({ error: "Impossible sur soi-même" }, { status: 400 });
  }

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!u || u.role !== "SELLER") {
    return NextResponse.json({ error: "Vendeur introuvable" }, { status: 404 });
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/sellers]", e);
    return NextResponse.json(
      { error: "Suppression impossible (données liées). Utilisez plutôt 'Suspendu/Bloqué'." },
      { status: 409 }
    );
  }
}
