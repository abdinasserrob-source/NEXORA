import { prisma } from "@/lib/db";
import {
  RECO_ALGO_DEFAULTS,
  type RecoAlgoConfigPayload,
} from "@/lib/reco-algo-config-shared";

export type { RecoAlgoConfigPayload, RecoMode } from "@/lib/reco-algo-config-shared";
export { RECO_ALGO_DEFAULTS } from "@/lib/reco-algo-config-shared";

/** Configuration fixe (plus de table admin / upsert Prisma). */
export async function getRecoAlgoConfigPayload(): Promise<RecoAlgoConfigPayload> {
  return {
    ...RECO_ALGO_DEFAULTS,
    enabled: { ...RECO_ALGO_DEFAULTS.enabled },
    weights: { ...RECO_ALGO_DEFAULTS.weights },
    activationMin: { ...RECO_ALGO_DEFAULTS.activationMin },
    thresholds: { ...RECO_ALGO_DEFAULTS.thresholds },
  };
}

export async function countOrdersForRecoThreshold(): Promise<number> {
  return prisma.order.count({
    where: { status: { not: "CANCELLED" } },
  });
}

export async function countProductsWithTags(): Promise<number> {
  const rows = await prisma.product.findMany({
    where: { archived: false },
    select: { tags: true },
  });
  let n = 0;
  for (const r of rows) {
    try {
      const t = JSON.parse(r.tags || "[]") as unknown;
      if (Array.isArray(t) && t.filter((x) => x != null && String(x).trim() !== "").length > 0) n++;
    } catch {
      /* ignore */
    }
  }
  return n;
}

/** Mode affichage accueil : `platformSetting.reco_home_mode` si présent, sinon `cfg.mode` (défauts). */
export async function getEffectiveRecoHomeMode(): Promise<"HYBRID" | "CONTENT" | "COLLAB"> {
  const cfg = await getRecoAlgoConfigPayload();
  const row = await prisma.platformSetting.findUnique({
    where: { key: "reco_home_mode" },
    select: { value: true },
  });
  const raw = row?.value ?? cfg.mode;
  if (raw === "CONTENT" || raw === "COLLAB" || raw === "HYBRID") return raw;
  return "HYBRID";
}
