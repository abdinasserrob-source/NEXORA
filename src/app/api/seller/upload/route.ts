import { getVerifiedSeller } from "@/lib/session-user";
import { sellerAccessRevoked, sellerCannotOperate, sellerIsSuspended } from "@/lib/seller-guard";
import { NextResponse } from "next/server";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

function safeBaseName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/(^[._-]+|[._-]+$)/g, "");
  return base || "image";
}

export async function POST(req: Request) {
  const seller = await getVerifiedSeller();
  if (!seller) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profile = await prisma.sellerProfile.findUnique({ where: { userId: seller.id } });
  if (!profile || sellerAccessRevoked(profile) || sellerCannotOperate(profile) || sellerIsSuspended(profile)) {
    return NextResponse.json({ error: "Publication vendeur indisponible" }, { status: 403 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json({ error: "FormData requis" }, { status: 400 });
  }

  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  const f = fd.get("file");
  if (!(f instanceof File)) return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  if (!ALLOWED.has(f.type)) return NextResponse.json({ error: "Format non supporté" }, { status: 400 });
  if (f.size <= 0 || f.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 6MB)" }, { status: 400 });
  }

  const buf = Buffer.from(await f.arrayBuffer());
  const ext = path.extname(f.name) || "";
  const base = safeBaseName(path.basename(f.name, ext));
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}-${base}${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buf);

  return NextResponse.json({ ok: true, url: `/uploads/${filename}` });
}

