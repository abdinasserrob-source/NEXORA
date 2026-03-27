/**
 * Prix en base de données : **EUR**.
 * Taux fixes (cahier des charges) :
 * - 1 EUR = 1,15 USD
 * - 1 EUR = 204 DJF
 * (cohérent avec 1 USD ≈ 177 DJF, 1 USD ≈ 0,87 EUR, etc.)
 */
export const RATES_FROM_EUR: Record<string, number> = {
  EUR: 1,
  USD: 1.15,
  DJF: 204,
};

export function convertFromEur(amountEur: number, currencyCode: string): number {
  const r = RATES_FROM_EUR[currencyCode] ?? 1;
  return amountEur * r;
}

/**
 * Saisie utilisateur dans la **devise d’affichage** → montant **EUR** stocké en base (portefeuille, prix).
 * Ex. 12 DJF → 12/204 EUR ; 11,50 USD → 11,50/1,15 EUR.
 */
export function convertDisplayAmountToEur(amount: number, currencyCode: string): number {
  const r = RATES_FROM_EUR[currencyCode] ?? 1;
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const eur = amount / r;
  return Math.round(eur * 100) / 100;
}

/** Affichage courant (portefeuille, catalogue, panier, checkout) selon la devise choisie. */
export function formatDisplayPrice(amountEur: number, currencyCode: string, locale: string): string {
  const v = convertFromEur(amountEur, currencyCode);
  const loc =
    locale === "ar" ? "ar-DJ" : locale === "en" ? "en-US" : "fr-FR";
  try {
    return new Intl.NumberFormat(loc, {
      style: "currency",
      currency: currencyCode === "DJF" ? "DJF" : currencyCode === "USD" ? "USD" : "EUR",
      maximumFractionDigits: currencyCode === "DJF" ? 0 : 2,
    }).format(v);
  } catch {
    return `${v.toFixed(currencyCode === "DJF" ? 0 : 2)} ${currencyCode}`;
  }
}

/**
 * Montants des commandes **déjà passées** : toujours affichés en **EUR** (montant contractuel en base),
 * sans conversion vers DJF/USD — l’utilisateur voit le même référentiel que la facture.
 */
export function formatOrderAmountEur(amountEur: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountEur);
}
