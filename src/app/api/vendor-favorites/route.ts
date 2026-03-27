import { BrowseEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { invalidateUserRecommendations } from "@/lib/reco-invalidate";
import { getCurrentUser } from "@/lib/session-user";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const rows = await prisma.vendorFavorite.findMany({
      where: { userId: user.id },
      include: {
        seller: {
          include: { sellerProfile: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      favorites: rows.map((r) => ({
        id: r.id,
        sellerUserId: r.sellerUserId,
        shopName: r.seller.sellerProfile?.shopName ?? r.seller.name ?? r.seller.email,
        seller: {
          id: r.seller.id,
          name: r.seller.name,
          avatar: r.seller.avatar,
        },
      })),
    });
  } catch (e) {
    console.error("[vendor-favorites GET]", e);
    return NextResponse.json(
      { error: "Erreur serveur", favorites: [] },
      { status: 500 }
    );
  }
}

const postSchema = z.object({ sellerUserId: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const json = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId: parsed.data.sellerUserId },
    });
    if (!seller?.approved) {
      return NextResponse.json({ error: "Boutique introuvable" }, { status: 400 });
    }
    if (parsed.data.sellerUserId === user.id) {
      return NextResponse.json({ error: "Impossible" }, { status: 400 });
    }
    await prisma.vendorFavorite.upsert({
      where: {
        userId_sellerUserId: { userId: user.id, sellerUserId: parsed.data.sellerUserId },
      },
      create: {
        userId: user.id,
        sellerUserId: parsed.data.sellerUserId,
      },
      update: {},
    });
    await prisma.browseEvent.create({
      data: {
        type: BrowseEventType.VENDOR_FOLLOW,
        userId: user.id,
        vendorId: parsed.data.sellerUserId,
      },
    });
    invalidateUserRecommendations(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[vendor-favorites POST]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const sellerUserId = url.searchParams.get("sellerUserId");
  if (!sellerUserId) {
    return NextResponse.json({ error: "sellerUserId requis" }, { status: 400 });
  }
  await prisma.vendorFavorite.deleteMany({
    where: { userId: user.id, sellerUserId },
  });
  invalidateUserRecommendations(user.id);
  return NextResponse.json({ ok: true });
}
