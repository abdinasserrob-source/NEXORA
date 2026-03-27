import { getCurrentUser } from "@/lib/session-user";
import { invalidateUserRecommendations } from "@/lib/reco-invalidate";
import { NextResponse } from "next/server";

/** Invalide le cache `unstable_cache` des recommandations pour l’utilisateur connecté. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  invalidateUserRecommendations(user.id);
  return NextResponse.json({ ok: true });
}
