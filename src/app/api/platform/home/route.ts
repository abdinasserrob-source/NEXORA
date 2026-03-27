import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const [sections, settings] = await Promise.all([
    prisma.homeSection.findMany({ where: { visible: true }, orderBy: { sortOrder: "asc" } }),
    prisma.platformSetting.findMany(),
  ]);
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return NextResponse.json({ sections, settings: map });
}
