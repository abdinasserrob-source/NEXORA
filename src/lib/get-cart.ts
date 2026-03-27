import { prisma } from "./db";
import { getAnonSessionIdFromCookie } from "./cookies-anon";
import { getAuthFromCookies } from "./jwt";

export async function getOrCreateCart() {
  const auth = await getAuthFromCookies();
  const anon = await getAnonSessionIdFromCookie();

  if (auth?.sub) {
    let cart = await prisma.cart.findUnique({
      where: { userId: auth.sub },
      include: { items: { include: { product: true } } },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: auth.sub },
        include: { items: { include: { product: true } } },
      });
    }
    return { cart, userId: auth.sub, anonymousSessionId: null as string | null };
  }

  if (!anon) return { cart: null, userId: null, anonymousSessionId: null };

  let cart = await prisma.cart.findUnique({
    where: { anonymousSessionId: anon },
    include: { items: { include: { product: true } } },
  });
  if (!cart) {
    cart = await prisma.cart.create({
      data: { anonymousSessionId: anon },
      include: { items: { include: { product: true } } },
    });
  }
  return { cart, userId: null, anonymousSessionId: anon };
}
