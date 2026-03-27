import { BrowseEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { getAuthFromCookies } from "@/lib/jwt";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  type: z.enum([
    "PRODUCT_VIEW",
    "PRODUCT_CLICK",
    "ADD_CART",
    "SEARCH",
    "SCROLL_DEPTH",
    "PAGE_VIEW",
    "WISHLIST_ADD",
    "PRODUCT_LIKE",
    "VENDOR_FOLLOW",
    "PURCHASE_COMPLETE",
  ]),
  productId: z.string().optional(),
  vendorId: z.string().optional(),
  path: z.string().optional(),
  query: z.string().optional(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  meta: z.any().optional(),
});

/** Collecte silencieuse des signaux comportementaux (étape 2). */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }

  const auth = await getAuthFromCookies();
  const anon = await getAnonSessionIdFromCookie();
  const { type, productId, vendorId, path, query, durationMs, meta } = parsed.data;

  const metaVendor =
    vendorId ??
    (meta && typeof meta === "object" && "sellerUserId" in meta && typeof meta.sellerUserId === "string"
      ? meta.sellerUserId
      : undefined);

  try {
    await prisma.browseEvent.create({
      data: {
        type: type as BrowseEventType,
        userId: auth?.sub,
        anonymousSessionId: auth?.sub ? undefined : anon,
        productId,
        vendorId: metaVendor,
        path,
        query,
        durationMs,
        meta: meta ? JSON.stringify(meta) : undefined,
      },
    });
  } catch (e) {
    // collecte "best-effort" : ne doit pas casser l'app si la DB est indisponible
    console.error("[POST /api/track]", e);
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
