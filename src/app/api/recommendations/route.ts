import { getAuthFromCookies } from "@/lib/jwt";
import {
  getRecommendations,
  getRecentViewed,
  type RecoPlacement,
} from "@/lib/recommendation";
import { prisma } from "@/lib/db";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { NextResponse } from "next/server";

function parseProductImages(raw: string): string[] {
  try {
    const j = JSON.parse(raw) as unknown;
    return Array.isArray(j) ? (j as string[]).filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const placement = (url.searchParams.get("placement") ?? "HOME") as RecoPlacement;
    const productId = url.searchParams.get("productId");
    const record = url.searchParams.get("record") === "1";
    const auth = await getAuthFromCookies();
    const anon = await getAnonSessionIdFromCookie();

    const cart = url.searchParams.get("cart");
    const cartProductIds = cart ? cart.split(",").filter(Boolean) : undefined;

    const list = await getRecommendations({
      userId: auth?.sub ?? null,
      placement,
      productId,
      cartProductIds,
      limit: 12,
    });

    if (record && list.length) {
      for (const r of list) {
        try {
          await prisma.recommendationFeedback.create({
            data: {
              userId: auth?.sub,
              sessionKey: anon ?? null,
              productId: r.product.id,
              placement,
              algorithm: r.algorithm,
              score: r.score,
            },
          });
        } catch {
          // best-effort (contrainte unique / DB)
        }
      }
    }

    const recent = await getRecentViewed(auth?.sub ?? null, anon ?? null, 8);

    return NextResponse.json({
      recommendations: list.map((r) => ({
        id: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        price: r.product.price,
        images: parseProductImages(r.product.images),
        score: r.score,
        score01: r.score01,
        algorithm: r.algorithm,
        reason: r.reason,
      })),
      recent: recent.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        images: parseProductImages(p.images),
      })),
    });
  } catch (e) {
    console.error("[GET /api/recommendations]", e);
    return NextResponse.json({ recommendations: [], recent: [] });
  }
}
