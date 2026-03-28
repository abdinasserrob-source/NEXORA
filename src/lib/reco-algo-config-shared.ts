/** Types + valeurs par défaut utilisables côté client (sans Prisma / pg). */

export type RecoMode = "HYBRID" | "CONTENT" | "COLLAB";

export type RecoAlgoConfigPayload = {
  mode: RecoMode;
  enabled: {
    hybrid_fill: boolean;
    collab_filter: boolean;
    content_based: boolean;
  };
  weights: {
    hybrid_fill: number;
    collab_filter: number;
    content_based: number;
  };
  activationMin: {
    hybrid_fill: number;
    collab_filter: number;
    content_based: number;
  };
  thresholds: {
    collab_min_orders: number;
    content_min_tagged: number;
  };
};

export const RECO_ALGO_DEFAULTS: RecoAlgoConfigPayload = {
  mode: "HYBRID",
  enabled: { hybrid_fill: true, collab_filter: true, content_based: true },
  weights: { hybrid_fill: 34, collab_filter: 33, content_based: 33 },
  activationMin: { hybrid_fill: 5, collab_filter: 5, content_based: 5 },
  thresholds: { collab_min_orders: 50, content_min_tagged: 20 },
};
