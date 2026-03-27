import { prisma } from "@/lib/db";
import { getAuthFromCookies } from "@/lib/jwt";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) return NextResponse.json({ user: null });

    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      include: {
        addresses: true,
        sellerProfile: true,
        badges: true,
        newsletter: true,
      },
    });
    if (!user || user.banned) return NextResponse.json({ user: null });

    const pendingSeller = await prisma.sellerApplication.findFirst({
      where: { userId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    const wallet = await prisma.userWallet.findUnique({
      where: { userId: user.id },
      select: { balance: true, depositReference: true },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name,
        avatar: user.avatar,
        phone: user.phone,
        country: user.country,
        locale: user.locale,
        currencyCode: user.currencyCode,
        createdAt: user.createdAt.toISOString(),
        chatbotPremium: user.chatbotPremium,
        loyaltyPoints: user.loyaltyPoints,
        addresses: user.addresses,
        sellerProfile: user.sellerProfile,
        badges: user.badges,
        newsletterOptIn: !!user.newsletter?.active,
        pendingSellerApplication: pendingSeller
          ? { id: pendingSeller.id, shopName: pendingSeller.shopName, status: pendingSeller.status }
          : null,
        wallet: wallet ? { balance: wallet.balance, depositReference: wallet.depositReference } : null,
      },
    });
  } catch (e) {
    console.error("[GET /api/auth/me]", e);
    // On renvoie du JSON quoi qu'il arrive pour ne pas casser le client (Header).
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
