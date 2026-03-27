import { BrowseEventType } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { getAnonSessionIdFromCookie } from "@/lib/cookies-anon";
import { mergeAnonymousCart } from "@/lib/cart-merge";
import { invalidateUserRecommendations } from "@/lib/reco-invalidate";
import { getCurrentUser } from "@/lib/session-user";
import { applyLoyaltyAndBadges } from "@/lib/gamification";
import { getRecommendations } from "@/lib/recommendation";
import { ensureUserWallet } from "@/lib/wallet";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  addressId: z.string(),
  carrierId: z.string(),
  zoneId: z.string(),
  promoCode: z.string().optional(),
});

/** Paiement simulé (Stripe test → log console uniquement). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const { addressId, carrierId, zoneId, promoCode } = parsed.data;

  const address = await prisma.address.findFirst({
    where: { id: addressId, userId: user.id },
  });
  const carrier = await prisma.carrier.findFirst({ where: { id: carrierId, active: true } });
  const zone = await prisma.shippingZone.findUnique({ where: { id: zoneId } });
  if (!address || !carrier || !zone) {
    return NextResponse.json({ error: "Adresse, transporteur ou zone invalide" }, { status: 400 });
  }

  // IMPORTANT: Si le panier a été constitué en session anonyme puis connexion,
  // il peut rester attaché à anonymousSessionId. On le fusionne ici en dernier recours.
  const sid = await getAnonSessionIdFromCookie();
  let cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: { items: { include: { product: true } } },
  });

  if (!cart?.items.length && sid) {
    await prisma.$transaction(async (tx) => {
      await mergeAnonymousCart(tx, user.id, sid);
    });
    cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
    });
  }

  if (!cart?.items.length) {
    return NextResponse.json({ error: "Panier vide" }, { status: 400 });
  }

  const purchasedProductIds = [...new Set(cart.items.map((it) => it.productId))];

  let subtotal = 0;
  for (const it of cart.items) {
    if (it.quantity > it.product.stock) {
      return NextResponse.json(
        { error: `Stock insuffisant pour ${it.product.name}` },
        { status: 400 }
      );
    }
    subtotal += it.product.price * it.quantity;
  }

  let discount = 0;
  let promoRow = null as Awaited<ReturnType<typeof prisma.promoCode.findFirst>>;
  if (promoCode?.trim()) {
    promoRow = await prisma.promoCode.findFirst({
      where: {
        code: promoCode.trim().toUpperCase(),
        active: true,
      },
    });
    const now = new Date();
    if (
      promoRow &&
      (!promoRow.startsAt || promoRow.startsAt <= now) &&
      (!promoRow.endsAt || promoRow.endsAt >= now) &&
      (!promoRow.maxUses || promoRow.uses < promoRow.maxUses) &&
      (!promoRow.minCart || subtotal >= promoRow.minCart)
    ) {
      if (promoRow.kind === "PERCENT") {
        discount = subtotal * (promoRow.value / 100);
      } else {
        discount = Math.min(promoRow.value, subtotal);
      }
    }
  }

  const shippingCost = zone.price;
  const total = Math.max(0, subtotal - discount + shippingCost);

  /** Paiement exclusivement par portefeuille NEXORA : le total est débité du solde. */
  const paymentNote = "Portefeuille NEXORA (solde débité — simulation)";
  {
    const w = await ensureUserWallet(prisma, user.id);
    if (w.balance < total) {
      const missing = Math.round((total - w.balance) * 100) / 100;
      return NextResponse.json(
        {
          error:
            `Solde portefeuille insuffisant : il vous manque ${missing.toFixed(2)} € pour cette commande (total ${total.toFixed(2)} €, solde ${w.balance.toFixed(2)} €). Créditez votre portefeuille depuis Mon compte → Portefeuille.`,
          code: "WALLET_INSUFFICIENT",
          balance: w.balance,
          total,
          missing,
        },
        { status: 400 }
      );
    }
  }

  console.log("[NEXORA checkout] Paiement portefeuille — montant EUR", total.toFixed(2));

  const addressSnap = JSON.stringify({
    recipientName: address.recipientName ?? null,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    postalCode: address.postalCode,
    region: address.region ?? null,
    country: address.country,
  });

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        userId: user.id,
        status: "PAID",
        subtotal,
        shippingCost,
        discount,
        total,
        promoCodeId: promoRow ? promoRow.id : undefined,
        addressSnap,
        carrierId: carrier.id,
        zoneId: zone.id,
        paymentStatus: "CAPTURED",
      },
    });

    for (const it of cart.items) {
      await tx.orderItem.create({
        data: {
          orderId: o.id,
          productId: it.productId,
          titleSnap: it.product.name,
          priceSnap: it.product.price,
          quantity: it.quantity,
        },
      });
      await tx.product.update({
        where: { id: it.productId },
        data: { stock: { decrement: it.quantity } },
      });
      await tx.browseEvent.create({
        data: {
          type: BrowseEventType.PURCHASE_COMPLETE,
          userId: user.id,
          productId: it.productId,
          meta: JSON.stringify({ orderId: o.id, qty: it.quantity }),
        },
      });
    }

    // Marque approximativement les feedbacks de recommandations comme "achetés"
    // pour alimenter les stats du vendeur (impressions/clics déjà trackés).
    if (purchasedProductIds.length) {
      await tx.recommendationFeedback.updateMany({
        where: {
          userId: user.id,
          productId: { in: purchasedProductIds },
          purchased: false,
        },
        data: { purchased: true },
      });
    }

    if (promoRow) {
      await tx.promoCode.update({
        where: { id: promoRow.id },
        data: { uses: { increment: 1 } },
      });
    }

    const walletRow = await tx.userWallet.findUnique({ where: { userId: user.id } });
    if (!walletRow || walletRow.balance < total) {
      throw new Error("WALLET_INSUFFICIENT");
    }
    await tx.userWallet.update({
      where: { id: walletRow.id },
      data: { balance: { decrement: total } },
    });
    await tx.walletLedgerEntry.create({
      data: {
        walletId: walletRow.id,
        amount: -total,
        type: "PAYMENT_ORDER",
        label: `Paiement commande ${o.id.slice(0, 8)}`,
        orderId: o.id,
      },
    });

    await tx.paymentTransaction.create({
      data: {
        orderId: o.id,
        userId: user.id,
        amount: total,
        status: "CAPTURED",
        stripeRef: `pi_sim_${o.id.slice(0, 8)}`,
        note: paymentNote,
      },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return o;
  });
  } catch (e) {
    if (e instanceof Error && e.message === "WALLET_INSUFFICIENT") {
      return NextResponse.json({ error: "Solde portefeuille insuffisant" }, { status: 400 });
    }
    throw e;
  }

  await applyLoyaltyAndBadges(user.id, order.total, order.id);

  await sendEmail(
    user.email,
    `Commande confirmée ${order.id.slice(0, 8)}`,
    `<p>Merci ! Total : ${order.total.toFixed(2)} €. Transporteur : ${carrier.name}.</p>`
  );

  const reco = await getRecommendations({
    userId: user.id,
    placement: "HOME",
    limit: 3,
  });
  if (reco.length) {
    const names = reco.map((r) => r.product.name).join(", ");
    await sendEmail(
      user.email,
      "Complétez votre expérience NEXORA",
      `<p>Suggestions après achat : ${names}</p>`
    );
  }

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "ORDER",
      title: "Commande payée",
      body: `Votre commande ${order.id.slice(0, 8)} est confirmée.`,
      channels: "TOAST,PUSH",
    },
  });

  // Notifie aussi les administrateurs.
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", banned: false },
    select: { id: true },
    take: 20,
  });
  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "SYSTEM",
        title: "Nouvelle commande payée",
        body: `Commande ${order.id.slice(0, 8)} payée par ${user.email} (total ${order.total.toFixed(2)} €).`,
        channels: "TOAST,PUSH",
      })),
    });
  }

  invalidateUserRecommendations(user.id);

  return NextResponse.json({
    orderId: order.id,
    total: order.total,
    message: "Paiement simulé réussi",
  });
}
