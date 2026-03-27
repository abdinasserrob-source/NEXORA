import { AcquisitionSource } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { ANON_COOKIE } from "@/lib/cookies-anon";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function parseAcquisition(v: string | null): AcquisitionSource {
  if (!v) return "DIRECT";
  const u = v.toUpperCase();
  if (u === "GOOGLE") return "GOOGLE";
  if (u === "FACEBOOK") return "FACEBOOK";
  return "OTHER";
}

const anonCookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
  secure: process.env.NODE_ENV === "production",
};

/** Crée ou réutilise une session anonyme (étape 1 recommandation). */
export async function GET(req: Request) {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ANON_COOKIE)?.value;

  const url = new URL(req.url);
  const acquisition = parseAcquisition(url.searchParams.get("ref"));

  if (existing) {
    const row = await prisma.anonymousSession.findUnique({
      where: { id: existing },
    });
    if (row && !row.mergedUserId) {
      return NextResponse.json({ sessionId: existing, acquisition: row.acquisition });
    }
  }

  const session = await prisma.anonymousSession.create({
    data: { acquisition },
  });

  const res = NextResponse.json({
    sessionId: session.id,
    acquisition: session.acquisition,
  });
  res.cookies.set(ANON_COOKIE, session.id, anonCookieOpts);
  return res;
}
