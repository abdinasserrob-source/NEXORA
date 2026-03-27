import { prisma } from "@/lib/db";
import { getAuthFromCookies } from "@/lib/jwt";
import { openaiChatReply } from "@/lib/openai-chat";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

export async function GET() {
  const auth = await getAuthFromCookies();
  if (!auth?.sub) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { banned: true },
  });
  if (!user || user.banned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const convo = await prisma.chatConversation.findFirst({
    where: { userId: auth.sub },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, select: { role: true, content: true } },
    },
  });

  if (!convo) {
    return NextResponse.json({ conversationId: null, messages: [] });
  }

  return NextResponse.json({
    conversationId: convo.id,
    messages: convo.messages.map((m) => ({ role: m.role, text: m.content })),
  });
}

async function standardRuleReply(msg: string) {
  const m = msg.toLowerCase();

  if (/livraison|colis|suivi|tracking/.test(m)) {
    return {
      intent: "shipping",
      reply:
        "Vous pouvez suivre une commande depuis Compte → Mes commandes, ou la page Suivi avec le numéro fourni par e-mail.",
    };
  }

  if (/retour|rembours/.test(m)) {
    return {
      intent: "returns",
      reply:
        "Les retours sont possibles sous 14 jours : Compte → Retours (après validation de votre commande).",
    };
  }

  if (/compte|mot de passe/.test(m)) {
    return {
      intent: "account",
      reply:
        "Créez un compte ou connectez-vous ; réinitialisation du mot de passe via « Mot de passe oublié ».",
    };
  }

  // Promos : liste quelques produits en base (stock > 0).
  if (/promo|réduction|code promo|code/.test(m)) {
    const promos = await prisma.product.findMany({
      where: {
        isFlagged: false,
        isPromo: true,
        stock: { gt: 0 },
        seller: { banned: false },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        price: true,
        comparePrice: true,
        stock: true,
      },
    });

    if (!promos.length) {
      return {
        intent: "promo",
        reply: "Pour le moment, aucun produit en promotion n’est disponible.",
      };
    }

    const lines = promos.map((p) => {
      const before = p.comparePrice && p.comparePrice > p.price ? ` (avant ${p.comparePrice.toFixed(2)} €)` : "";
      return `- ${p.name} : ${p.price.toFixed(2)} € • stock: ${p.stock}${before}`;
    });

    return {
      intent: "promo",
      reply: `Voici quelques produits en promotion :\n${lines.join("\n")}\n\nVous pouvez aussi entrer un code promo au paiement.`,
    };
  }

  // Produit : tentative de matching simple sur le catalogue.
  const tokens = m
    .split(/[^a-z0-9àâçéèêëîïôûùüÿñæœ]+/gi)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .slice(0, 3);

  if (tokens.length) {
    const p = await prisma.product.findFirst({
      where: {
        isFlagged: false,
        stock: { gt: 0 },
        seller: { banned: false },
        OR: [
          ...tokens.flatMap((t) => [
            { name: { contains: t, mode: "insensitive" as const } },
            { slug: { contains: t, mode: "insensitive" as const } },
            { description: { contains: t, mode: "insensitive" as const } },
          ]),
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        comparePrice: true,
        stock: true,
        isPromo: true,
      },
    });

    if (p) {
      const desc =
        p.description.trim().length > 160
          ? `${p.description.trim().slice(0, 160)}…`
          : p.description.trim();
      const promoLine =
        p.isPromo && p.comparePrice && p.comparePrice > p.price
          ? `Prix barré : ${p.comparePrice.toFixed(2)} €`
          : "";
      return {
        intent: "product_info",
        reply: `Voici "${p.name}" : ${desc}\nPrix : ${p.price.toFixed(2)} € • stock: ${p.stock}${
          promoLine ? `\n${promoLine}` : ""
        }`,
      };
    }
  }

  return {
    intent: "fallback",
    reply:
      "Je n’ai pas assez de contexte. Dites-moi le nom d’un produit, ou consultez la FAQ / ouvrez un ticket support depuis ce widget.",
  };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const auth = await getAuthFromCookies();

  if (!auth?.sub) {
    return NextResponse.json(
      {
        error: "AUTH_REQUIRED",
        message: "Connectez-vous pour poser vos questions à l’assistant NEXORA.",
      },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: { chatbotPremium: true, banned: true },
  });

  if (!user || user.banned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Limite standard : exécuter un cooldown quand l'utilisateur atteint son quota.
  const STANDARD_LIMIT = 20; // nombre de messages avant cooldown
  const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h

  if (!user.chatbotPremium) {
    const usage = await prisma.chatbotUsage.upsert({
      where: { userId: auth.sub },
      create: { userId: auth.sub, usedCount: 0, cooldownUntil: null },
      update: {},
    });

    const now = new Date();
    if (usage.cooldownUntil && usage.cooldownUntil.getTime() > now.getTime()) {
      const waitMs = usage.cooldownUntil.getTime() - now.getTime();
      return NextResponse.json(
        {
          error: "CHATBOT_COOLDOWN",
          message: "Limite atteinte. Revenez dans 2h.",
          waitMs,
          cooldownUntil: usage.cooldownUntil.toISOString(),
        },
        { status: 429 }
      );
    }

    if (usage.usedCount >= STANDARD_LIMIT) {
      const cooldownUntil = new Date(now.getTime() + COOLDOWN_MS);
      await prisma.chatbotUsage.update({
        where: { userId: auth.sub },
        data: { usedCount: 0, cooldownUntil },
      });
      return NextResponse.json(
        {
          error: "CHATBOT_COOLDOWN",
          message: "Limite atteinte. Revenez dans 2h.",
          waitMs: COOLDOWN_MS,
          cooldownUntil: cooldownUntil.toISOString(),
        },
        { status: 429 }
      );
    }

    await prisma.chatbotUsage.update({
      where: { userId: auth.sub },
      data: { usedCount: usage.usedCount + 1 },
    });
  }

  let convoId = parsed.data.conversationId;
  let convo = convoId ? await prisma.chatConversation.findUnique({ where: { id: convoId } }) : null;

  if (convo && convo.userId !== auth.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!convo) {
    convo = await prisma.chatConversation.findFirst({
      where: { userId: auth.sub },
      orderBy: { createdAt: "desc" },
    });
    if (!convo) {
      convo = await prisma.chatConversation.create({
        data: { userId: auth.sub, anonymousSessionId: null },
      });
    }
    convoId = convo.id;
  } else {
    convoId = convo.id;
  }

  await prisma.chatMessage.create({
    data: {
      conversationId: convoId!,
      role: "user",
      content: parsed.data.message,
    },
  });

  let intent = "fallback";
  let reply = "";

  if (user.chatbotPremium) {
    const ai = await openaiChatReply(parsed.data.message);
    if (ai) {
      intent = "openai";
      reply = ai;
    }
  }

  if (!reply) {
    const ir = await standardRuleReply(parsed.data.message);
    intent = ir.intent;
    reply = ir.reply;
  }

  await prisma.chatMessage.create({
    data: {
      conversationId: convoId!,
      role: "assistant",
      content: reply,
      intent,
    },
  });

  return NextResponse.json({ conversationId: convoId, intent, reply });
}
