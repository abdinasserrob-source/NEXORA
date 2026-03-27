import { RecoPlacement } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getAuthFromCookies } from "@/lib/jwt";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  productId: z.string(),
  placement: z.enum([
    "HOME",
    "PRODUCT_CROSS",
    "CART_CROSS",
    "PRODUCT_UPSELL",
    "SIDEBAR_RECENT",
  ]),
  purchased: z.boolean().optional(),
});

/** Signal utilisateur sur recommandation (étape 7). */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const auth = await getAuthFromCookies();
  const anon = await getAnonSessionIdFromCookie();
  const { productId, placement, purchased } = parsed.data;

  await prisma.recommendationFeedback.create({
    data: {
      userId: auth?.sub,
      sessionKey: anon ?? null,
      productId,
      placement: placement as RecoPlacement,
      algorithm: "user_click",
      clicked: true,
      clickAt: new Date(),
      purchased: purchased ?? false,
      score: 5,
    },
  });

  return NextResponse.json({ ok: true });
}
