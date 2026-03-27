import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "month";
  const format = url.searchParams.get("format") ?? "json";

  const now = new Date();
  let from = new Date(now);
  if (range === "day") from.setDate(from.getDate() - 1);
  else if (range === "month") from.setMonth(from.getMonth() - 1);
  else if (range === "year") from.setFullYear(from.getFullYear() - 1);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: from }, status: { not: "CANCELLED" } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  if (format === "csv") {
    const lines = [["id", "date", "total", "items"].join(",")];
    for (const o of orders) {
      lines.push(
        [o.id, o.createdAt.toISOString(), o.total, o.items.length].join(",")
      );
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="nexora-rapport-${range}.csv"`,
      },
    });
  }

  const sum = orders.reduce((a, o) => a + o.total, 0);
  return NextResponse.json({ range, from, count: orders.length, revenue: sum, orders });
}
