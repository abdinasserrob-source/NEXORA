import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { NextResponse } from "next/server";
import { z } from "zod";

const allowed = ["HYBRID", "CONTENT", "COLLAB"] as const;

export async function GET() {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const row = await prisma.platformSetting.findUnique({ where: { key: "reco_home_mode" } });
  return NextResponse.json({ mode: (row?.value as typeof allowed[number] | undefined) ?? "HYBRID" });
}

const postSchema = z.object({
  mode: z.enum(allowed),
});

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { mode } = parsed.data;

  const row = await prisma.platformSetting.upsert({
    where: { key: "reco_home_mode" },
    create: { key: "reco_home_mode", value: mode },
    update: { value: mode },
  });

  return NextResponse.json({ mode: row.value });
}

