import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session-user";
import { sendEmail } from "@/lib/email";
import {
  canOpenReturnRequest,
  RETURN_REASON_CUSTOM_PREFIX,
  RETURN_REASON_VALUES,
} from "@/lib/return-request-shared";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const MAX_PHOTO_BYTES = 1_500_000;

const standardReasons = RETURN_REASON_VALUES as readonly string[];

const returnReasonSchema = z
  .string()
  .trim()
  .max(2000, { message: "Motif trop long." })
  .superRefine((val, ctx) => {
    if (standardReasons.includes(val)) return;
    const p = RETURN_REASON_CUSTOM_PREFIX;
    if (val.startsWith(p)) {
      const rest = val.slice(p.length).trim();
      if (rest.length >= 10) return;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le motif « Autre » doit être précisé (au moins 10 caractères).",
      });
      return;
    }
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Motif invalide." });
  });

const bodySchema = z.object({
  type: z.enum(["RETURN", "REFUND", "DISPUTE"]),
  reason: returnReasonSchema,
  description: z.string().trim().min(20, { message: "La description doit contenir au moins 20 caractères." }),
  /** Image en data URL ou base64 brute (alias historique). */
  photoBase64: z.string().max(2_200_000).optional(),
  /** Même usage que photoBase64 ; préféré par le client JSON du modal. */
  photoUrl: z.string().max(2_200_000).optional(),
});

function prismaToApiError(e: unknown): { error: string; status: number } {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2002") {
      return { error: "Une demande existe déjà pour cette commande.", status: 409 };
    }
    if (e.code === "P2022") {
      return {
        error:
          "Base de données désynchronisée : exécutez « npx prisma migrate deploy » puis redémarrez le serveur.",
        status: 503,
      };
    }
    return { error: `Erreur base de données (${e.code}).`, status: 500 };
  }
  if (e instanceof Prisma.PrismaClientValidationError) {
    return { error: "Données refusées par la base. Relancez « npx prisma generate » si vous venez de mettre à jour le schéma.", status: 400 };
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return {
      error:
        "Impossible de joindre PostgreSQL. Vérifiez DATABASE_URL et que la base est joignable (même que pour prisma migrate).",
      status: 503,
    };
  }
  const msg = e instanceof Error ? e.message : "Erreur serveur.";
  return { error: msg, status: 500 };
}

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

    const { orderId } = await ctx.params;

    let reqType: z.infer<typeof bodySchema>["type"];
    let reason: string;
    let description: string;
    let photoUrl: string | null = null;

    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData().catch(() => null);
      if (!fd) return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });
      const parsed = bodySchema.safeParse({
        type: fd.get("type"),
        reason: fd.get("reason"),
        description: fd.get("description"),
      });
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? "Données invalides";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      reqType = parsed.data.type;
      reason = parsed.data.reason;
      description = parsed.data.description;
      const file = fd.get("photo");
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_PHOTO_BYTES) {
          return NextResponse.json({ error: "Photo trop volumineuse (max 1,5 Mo)." }, { status: 400 });
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const mime = file.type && /^image\//.test(file.type) ? file.type : "image/jpeg";
        photoUrl = `data:${mime};base64,${buf.toString("base64")}`;
      }
    } else {
      const json = await req.json().catch(() => null);
      const parsed = bodySchema.safeParse(json);
      if (!parsed.success) {
        const msg = parsed.error.issues[0]?.message ?? "Données invalides";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      reqType = parsed.data.type;
      reason = parsed.data.reason;
      description = parsed.data.description;
      const rawPhoto = (parsed.data.photoUrl ?? parsed.data.photoBase64)?.trim();
      if (rawPhoto) {
        if (rawPhoto.length > 2_200_000) {
          return NextResponse.json({ error: "Photo trop volumineuse." }, { status: 400 });
        }
        photoUrl = rawPhoto.startsWith("data:") ? rawPhoto : `data:image/jpeg;base64,${rawPhoto}`;
      }
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        returnReqs: { take: 1 },
        _count: { select: { disputes: true } },
      },
    });

    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }

    if (
      !canOpenReturnRequest(order, order.returnReqs[0] ?? null, order._count.disputes)
    ) {
      return NextResponse.json(
        {
          error:
            "Demande impossible : commande non livrée, délai de 30 jours dépassé, ou demande / litige déjà ouvert.",
        },
        { status: 400 }
      );
    }

    const created = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: user.id,
        type: reqType,
        reason,
        description,
        photoUrl,
        status: "PENDING",
      },
    });

    await sendEmail(
      user.email,
      "NEXORA — demande de retour / remboursement / litige reçue",
      `<p>Bonjour,</p>
      <p>Nous avons bien reçu votre demande (réf. interne <strong>${created.id.slice(0, 8)}…</strong>) pour la commande <strong>${order.id.slice(0, 12)}…</strong>.</p>
      <p>Notre équipe l’examinera et vous répondra par e-mail.</p>
      <p>— L’équipe NEXORA</p>`
    );

    return NextResponse.json({
      ok: true,
      returnRequest: {
        id: created.id,
        status: created.status,
        type: created.type,
        reason: created.reason,
        createdAt: created.createdAt,
      },
    });
  } catch (e) {
    console.error("[return-request]", e);
    const { error, status } = prismaToApiError(e);
    return NextResponse.json({ error }, { status });
  }
}
