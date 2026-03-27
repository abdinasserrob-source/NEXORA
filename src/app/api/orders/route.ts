import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { getAuthFromCookies } from "@/lib/jwt";
import { sellerAccessRevoked } from "@/lib/seller-guard";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const auth = await getAuthFromCookies();
  if (!auth) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  const url = new URL(req.url);
  const asSeller = url.searchParams.get("seller") === "1";

  const asSellerActor =
    asSeller ?
      await prisma.user.findUnique({
        where: { id: auth.sub },
        select: { id: true, role: true, banned: true },
      })
    : null;

  if (asSeller) {
    if (!asSellerActor || asSellerActor.banned) {
      return NextResponse.json({ error: "Non connecté" }, { status: 401 });
    }
    if (asSellerActor.role !== "SELLER" && asSellerActor.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (asSellerActor.role === "SELLER") {
      const profile = await prisma.sellerProfile.findUnique({ where: { userId: asSellerActor.id } });
      if (sellerAccessRevoked(profile)) {
        return NextResponse.json({ error: "Accès vendeur désactivé" }, { status: 403 });
      }
    }
    const sellerId = asSellerActor.id;
    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: { product: { sellerId: sellerId } },
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: { select: { email: true, firstName: true, lastName: true } },
        items: {
          select: {
            id: true,
            titleSnap: true,
            priceSnap: true,
            quantity: true,
            product: { select: { id: true, slug: true, name: true, sellerId: true, images: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const filtered = orders.map((o) => {
      const items = (o.items ?? []).filter((it) => it.product.sellerId === sellerId);
      const sellerSubtotal = items.reduce((acc, it) => acc + it.priceSnap * it.quantity, 0);
      return {
        id: o.id,
        status: o.status,
        createdAt: o.createdAt,
        customerLabel:
          [o.user.firstName, o.user.lastName].filter(Boolean).join(" ") || o.user.email,
        sellerSubtotal,
        items: items.map((it) => ({
          id: it.id,
          productId: it.product.id,
          titleSnap: it.titleSnap,
          priceSnap: it.priceSnap,
          quantity: it.quantity,
          product: {
            id: it.product.id,
            slug: it.product.slug,
            name: it.product.name,
            images: it.product.images,
          },
        })),
      };
    });

    return NextResponse.json({ orders: filtered });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              sellerId: true,
              seller: {
                select: {
                  id: true,
                  sellerProfile: {
                    select: { shopName: true, logoUrl: true, description: true },
                  },
                },
              },
            },
          },
        },
      },
      carrier: true,
      zone: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}
