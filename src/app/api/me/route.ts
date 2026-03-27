import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { setAuthCookie, signToken } from "@/lib/jwt";
import { NextResponse } from "next/server";
import { z } from "zod";

const avatarField = z.union([
  z.string().url(),
  z.literal(""),
  z.string().regex(/^\/(uploads\/avatars\/|avatars\/preset-)\S+$/),
]);

const patchSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().max(32).optional().nullable(),
  avatar: avatarField.optional(),
  email: z.string().email().optional(),
  country: z.string().max(120).optional().nullable(),
  locale: z.enum(["en", "fr", "ar"]).optional(),
  currencyCode: z.enum(["EUR", "USD", "DJF"]).optional(),
  chatbotPremium: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  if (parsed.data.email !== undefined && parsed.data.email !== user.email) {
    const taken = await prisma.user.findFirst({
      where: { email: parsed.data.email, NOT: { id: user.id } },
    });
    if (taken) {
      return NextResponse.json({ error: "Cet e-mail est déjà utilisé." }, { status: 409 });
    }
  }

  const name =
    [parsed.data.firstName ?? user.firstName, parsed.data.lastName ?? user.lastName]
      .filter(Boolean)
      .join(" ") || user.name;
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName ?? user.firstName,
      lastName: parsed.data.lastName ?? user.lastName,
      phone:
        parsed.data.phone === null
          ? null
          : (parsed.data.phone !== undefined ? parsed.data.phone : user.phone),
      avatar:
        parsed.data.avatar === ""
          ? null
          : (parsed.data.avatar !== undefined ? parsed.data.avatar : user.avatar),
      name,
      ...(parsed.data.email !== undefined ? { email: parsed.data.email } : {}),
      ...(parsed.data.country === null
        ? { country: null }
        : parsed.data.country !== undefined
          ? { country: parsed.data.country }
          : {}),
      ...(parsed.data.locale !== undefined ? { locale: parsed.data.locale } : {}),
      ...(parsed.data.currencyCode !== undefined
        ? { currencyCode: parsed.data.currencyCode }
        : {}),
      ...(typeof parsed.data.chatbotPremium === "boolean"
        ? { chatbotPremium: parsed.data.chatbotPremium }
        : {}),
    },
  });

  if (parsed.data.email !== undefined && parsed.data.email !== user.email) {
    await setAuthCookie(
      await signToken({ sub: updated.id, email: updated.email, role: updated.role })
    );
  }

  const res = NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      phone: updated.phone,
      avatar: updated.avatar,
      name: updated.name,
      country: updated.country,
      locale: updated.locale,
      currencyCode: updated.currencyCode,
      chatbotPremium: updated.chatbotPremium,
    },
  });
  const maxAge = 60 * 60 * 24 * 365;
  res.cookies.set("nexora_locale", updated.locale, {
    path: "/",
    maxAge,
    sameSite: "lax",
  });
  res.cookies.set("nexora_currency", updated.currencyCode, {
    path: "/",
    maxAge,
    sameSite: "lax",
  });
  return res;
}
