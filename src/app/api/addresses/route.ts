import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

function prismaErrorToMessage(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2003") {
      return "Compte introuvable ou session expirée. Déconnectez-vous et reconnectez-vous.";
    }
    if (e.code === "P2022") {
      return "La base de données n’a pas les dernières colonnes. Dans le dossier nexora : npx prisma migrate dev puis redémarrez npm run dev.";
    }
    return `Erreur base de données (${e.code}).`;
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    const m = e.message;
    if (m.includes("Unknown argument") || m.includes("Unknown arg")) {
      return "Client Prisma à jour requis : arrêtez « npm run dev », lancez « npx prisma generate » dans le dossier nexora, puis redémarrez.";
    }
    return "Données refusées par la base. Vérifiez les champs.";
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return "Impossible de joindre PostgreSQL. Vérifiez que le serveur tourne et que DATABASE_URL dans .env pointe vers la bonne base (même que pour prisma migrate).";
  }
  return e instanceof Error ? e.message : "Erreur serveur.";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const addresses = await prisma.address.findMany({ where: { userId: user.id } });
  return NextResponse.json({ addresses });
}

const postSchema = z.object({
  label: z.string().optional(),
  recipientName: z.string().min(2, "Nom du destinataire requis"),
  line1: z.string().min(2, "Rue et numéro requis"),
  line2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(3),
  region: z.string().optional(),
  country: z.string().min(2).max(120).trim(),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    const msg =
      parsed.error.issues[0]?.message ??
      "Vérifiez les champs obligatoires (destinataire, rue, code postal, ville, pays).";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const d = parsed.data;
  try {
    if (d.isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }
    const addr = await prisma.address.create({
      data: {
        userId: user.id,
        label: d.label?.trim() || null,
        recipientName: d.recipientName.trim(),
        line1: d.line1.trim(),
        line2: d.line2?.trim() || null,
        city: d.city.trim(),
        postalCode: d.postalCode.trim(),
        region: d.region?.trim() || null,
        country: d.country.trim(),
        isDefault: d.isDefault ?? false,
      },
    });
    return NextResponse.json({ address: addr });
  } catch (e) {
    console.error("[POST /api/addresses]", e);
    const msg = prismaErrorToMessage(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
