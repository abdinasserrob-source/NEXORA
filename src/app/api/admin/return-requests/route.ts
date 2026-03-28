import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.returnRequest.findMany({
    include: {
      order: { select: { id: true, total: true, status: true, createdAt: true } },
      user: { select: { email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  rows.sort((a, b) => {
    const rank = (s: string) => (s === "PENDING" ? 0 : 1);
    const c = rank(a.status) - rank(b.status);
    if (c !== 0) return c;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return NextResponse.json({ requests: rows });
}
