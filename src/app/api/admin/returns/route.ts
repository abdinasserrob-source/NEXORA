import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

/** Liste simple (compat). Préférez GET /api/admin/return-requests + page /admin/retours. */
export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const returns = await prisma.returnRequest.findMany({
    include: {
      order: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ returns });
}
