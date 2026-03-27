import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./db";

/** Fusionne le panier anonyme dans le panier utilisateur (quantités additionnées). */
export async function mergeAnonymousCart(
  tx: Prisma.TransactionClient,
  userId: string,
  anonymousSessionId: string
) {
  const anonCart = await tx.cart.findUnique({
    where: { anonymousSessionId },
    include: { items: true },
  });
  if (!anonCart) return;

  const userCart = await tx.cart.findUnique({
    where: { userId },
    include: { items: true },
  });

  if (!userCart) {
    await tx.cart.update({
      where: { id: anonCart.id },
      data: { userId, anonymousSessionId: null },
    });
    return;
  }

  for (const it of anonCart.items) {
    const ex = await tx.cartItem.findUnique({
      where: {
        cartId_productId: { cartId: userCart.id, productId: it.productId },
      },
    });
    if (ex) {
      await tx.cartItem.update({
        where: { id: ex.id },
        data: { quantity: ex.quantity + it.quantity },
      });
    } else {
      await tx.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: it.productId,
          quantity: it.quantity,
        },
      });
    }
  }
  await tx.cart.delete({ where: { id: anonCart.id } });
}

export async function mergeAnonymousSessionIntoUser(
  userId: string,
  anonymousSessionId: string | undefined
) {
  if (!anonymousSessionId) return;
  const anon = await prisma.anonymousSession.findUnique({
    where: { id: anonymousSessionId },
  });
  if (!anon || anon.mergedUserId) return;

  await prisma.$transaction(async (tx) => {
    await tx.browseEvent.updateMany({
      where: { anonymousSessionId },
      data: { userId, anonymousSessionId: null },
    });
    await mergeAnonymousCart(tx, userId, anonymousSessionId);
    await tx.chatConversation.updateMany({
      where: { anonymousSessionId },
      data: { userId, anonymousSessionId: null },
    });
    // Permet que les feedbacks de recommandations d'un invité soient attribués au compte après connexion.
    await tx.recommendationFeedback.updateMany({
      where: {
        sessionKey: anonymousSessionId,
        userId: null,
      },
      data: {
        userId,
        sessionKey: null,
      },
    });
    await tx.anonymousSession.update({
      where: { id: anonymousSessionId },
      data: { mergedUserId: userId },
    });
  });
}
