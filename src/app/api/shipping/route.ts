import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const [zones, carriers] = await Promise.all([
    prisma.shippingZone.findMany({ orderBy: { name: "asc" } }),
    prisma.carrier.findMany({ where: { active: true } }),
  ]);
  return NextResponse.json({ zones, carriers });
}
