import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      role: true,
      banned: true,
      firstName: true,
      lastName: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ users });
}

const patchSchema = z.object({
  userId: z.string(),
  banned: z.boolean().optional(),
  role: z.enum(["CLIENT", "SELLER", "ADMIN"]).optional(),
});

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const { userId, banned, role } = parsed.data;
  if (userId === auth.sub) {
    return NextResponse.json({ error: "Impossible sur soi-même" }, { status: 400 });
  }
  const data: { banned?: boolean; role?: Role } = {};
  if (typeof banned === "boolean") data.banned = banned;
  if (role) data.role = role as Role;
  await prisma.user.update({ where: { id: userId }, data });
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

  try {
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/admin/users]", e);
    return NextResponse.json(
      { error: "Suppression impossible (données liées). Utilisez plutôt 'Bannir'." },
      { status: 409 }
    );
  }
}
