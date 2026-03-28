import type { Order } from "@/generated/prisma/client";

export const RETURN_REASON_VALUES = [
  "DEFECTIVE",
  "NOT_AS_DESCRIBED",
  "WRONG_SIZE_OR_COLOR",
  "DAMAGED_ON_ARRIVAL",
  "CHANGE_OF_MIND",
] as const;

export type ReturnReasonValue = (typeof RETURN_REASON_VALUES)[number];

export const RETURN_REASON_LABELS: Record<ReturnReasonValue, string> = {
  DEFECTIVE: "Produit défectueux",
  NOT_AS_DESCRIBED: "Non conforme à la description",
  WRONG_SIZE_OR_COLOR: "Mauvaise taille / couleur",
  DAMAGED_ON_ARRIVAL: "Produit endommagé à la réception",
  CHANGE_OF_MIND: "Changement d'avis",
};

/** Valeur stockée côté API / BDD lorsque l’utilisateur choisit « Autre » : `Autre : …` (texte ≥ 10 car.). */
export const RETURN_REASON_CUSTOM_PREFIX = "Autre : ";

export function returnReasonLabel(value: string): string {
  if (value in RETURN_REASON_LABELS) {
    return RETURN_REASON_LABELS[value as ReturnReasonValue];
  }
  return value;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getDeliveryTimestamp(order: Pick<Order, "status" | "deliveredAt" | "updatedAt">): Date | null {
  if (order.status !== "DELIVERED") return null;
  if (order.deliveredAt) return order.deliveredAt;
  return order.updatedAt;
}

export function isWithinReturnWindow(order: Pick<Order, "status" | "deliveredAt" | "updatedAt">): boolean {
  const d = getDeliveryTimestamp(order);
  if (!d) return false;
  return Date.now() - d.getTime() <= THIRTY_DAYS_MS;
}

export function canOpenReturnRequest(
  order: Pick<Order, "status" | "deliveredAt" | "updatedAt">,
  existingReturn: { id: string } | null | undefined,
  disputeCount: number
): boolean {
  if (order.status !== "DELIVERED") return false;
  if (!isWithinReturnWindow(order)) return false;
  if (existingReturn) return false;
  if (disputeCount > 0) return false;
  return true;
}
