import { prisma } from "@/lib/db";
import { getVerifiedSeller } from "@/lib/session-user";
import { sellerAccessRevoked, sellerCannotOperate } from "@/lib/seller-guard";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  shopName: z.string().min(2).optional(),
  description: z.string().optional(),
  logoUrl: z.string().max(2000).nullable().optional(),
  bannerUrl: z.string().max(2000).nullable().optional(),
  shopEmail: z.string().email().nullable().optional(),
  shopPhone: z.string().min(3).nullable().optional(),
  shopAddress: z.string().min(3).nullable().optional(),
  shippingPolicy: z.string().nullable().optional(),
  returnPolicy: z.string().nullable().optional(),
});

export async function GET() {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: seller.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "Profil boutique introuvable" }, { status: 404 });
  }
  if (sellerAccessRevoked(profile)) {
    return NextResponse.json({ error: "Accès vendeur désactivé" }, { status: 403 });
  }
  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const seller = await getVerifiedSeller();
  if (!seller) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: seller.id },
  });
  if (sellerCannotOperate(profile)) {
    return NextResponse.json(
      { error: profile?.operationalStatus === "BLOCKED" ? "Accès vendeur désactivé" : "Boutique non approuvée" },
      { status: 403 }
    );
  }
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const d = parsed.data;
  const updated = await prisma.sellerProfile.update({
    where: { userId: seller.id },
    data: {
      ...("shopName" in d && d.shopName !== undefined ? { shopName: d.shopName } : {}),
      ...("description" in d && d.description !== undefined ? { description: d.description } : {}),
      ...("logoUrl" in d && d.logoUrl !== undefined ? { logoUrl: d.logoUrl } : {}),
      ...("bannerUrl" in d && d.bannerUrl !== undefined ? { bannerUrl: d.bannerUrl } : {}),
      ...("shopEmail" in d && d.shopEmail !== undefined ? { shopEmail: d.shopEmail } : {}),
      ...("shopPhone" in d && d.shopPhone !== undefined ? { shopPhone: d.shopPhone } : {}),
      ...("shopAddress" in d && d.shopAddress !== undefined ? { shopAddress: d.shopAddress } : {}),
      ...("shippingPolicy" in d && d.shippingPolicy !== undefined ? { shippingPolicy: d.shippingPolicy } : {}),
      ...("returnPolicy" in d && d.returnPolicy !== undefined ? { returnPolicy: d.returnPolicy } : {}),
    },
  });
  return NextResponse.json({ profile: updated });
}
