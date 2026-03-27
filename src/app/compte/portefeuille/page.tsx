"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePreferences } from "@/components/PreferencesContext";
import { convertDisplayAmountToEur } from "@/lib/currency";

type Card = { id: string; brand: string; last4: string };
type LedgerRow = {
  id: string;
  amount: number;
  type: string;
  label: string | null;
  createdAt: string;
};

export default function PortefeuillePage() {
  const { formatPrice, currencyCode } = usePreferences();
  const [balance, setBalance] = useState(0);
  const [ref, setRef] = useState("");
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  /** Montant saisi dans la devise d’affichage (EUR / USD / DJF), pas toujours EUR. */
  const [amountCard, setAmountCard] = useState("");
  const [cardId, setCardId] = useState("");

  const load = useCallback(() => {
    void fetch("/api/me/wallet", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.wallet) {
          setBalance(d.wallet.balance);
          setRef(d.wallet.depositReference);
        }
        setLedger(Array.isArray(d.ledger) ? d.ledger : []);
      });
    void fetch("/api/me/payment-methods", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list = (d.cards ?? []) as Card[];
        setCards(list);
        setCardId((id) => id || list[0]?.id || "");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [load]);

  const inp =
    "w-full rounded-xl border border-shop-border bg-shop-bg px-3 py-2 text-sm outline-none focus:border-shop-cyan";

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Portefeuille NEXORA</h1>
      
      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <strong>Important :</strong> le solde ne diminue que si vous payez une commande avec{" "}
        <strong>Portefeuille NEXORA</strong> à l’étape paiement. Un paiement par carte ou PayPal enregistré ne débite pas
        le portefeuille. Actualisez cette page après un paiement wallet pour voir le nouveau solde.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-shop-border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-shop-muted">Solde</p>
          <p className="mt-2 text-3xl font-bold text-cyan-600">{formatPrice(balance)}</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-shop-border bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-shop-navy">Créditer depuis une carte enregistrée</h2>
            <p className="mt-1 text-xs text-shop-muted">
              Simulation : aucun vrai paiement. Ajoutez d’abord une carte dans{" "}
              <Link href="/compte/paiement" className="text-shop-cyan hover:underline">
                Paiement
              </Link>
              .
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-shop-muted">
                Carte
                <select className={`${inp} mt-1`} value={cardId} onChange={(e) => setCardId(e.target.value)}>
                  <option value="">—</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} •••• {c.last4}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-shop-muted">
                Montant ({currencyCode === "EUR" ? "EUR" : currencyCode === "USD" ? "USD" : "DJF"})
                <input
                  type="number"
                  min={currencyCode === "DJF" ? 1 : 0.01}
                  step={currencyCode === "DJF" ? 1 : 0.01}
                  className={`${inp} mt-1`}
                  value={amountCard}
                  onChange={(e) => setAmountCard(e.target.value)}
                  placeholder={
                    currencyCode === "DJF" ? "Ex. 12" : currencyCode === "USD" ? "Ex. 10" : "Ex. 10,00"
                  }
                />
              </label>
              <p className="text-[11px] text-shop-muted">
                Le portefeuille est crédité en euros en base : votre saisie est convertie automatiquement (
                {currencyCode === "DJF" ? "1 EUR = 204 DJF" : currencyCode === "USD" ? "1 EUR = 1,15 USD" : "sans conversion"}).
              </p>
              <button
                type="button"
                className="w-full rounded-xl bg-shop-cyan py-2.5 text-sm font-semibold text-white"
                onClick={async () => {
                  const raw = Number(amountCard);
                  if (!cardId || !Number.isFinite(raw) || raw <= 0) {
                    toast.error("Carte et montant requis");
                    return;
                  }
                  const amountEur = convertDisplayAmountToEur(raw, currencyCode);
                  if (amountEur <= 0 || amountEur > 50_000) {
                    toast.error("Montant invalide (max 50 000 € équivalent)");
                    return;
                  }
                  const r = await fetch("/api/me/wallet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ savedCardId: cardId, amount: amountEur }),
                  });
                  const d = await r.json().catch(() => ({}));
                  if (!r.ok) toast.error(d.error ?? "Erreur");
                  else {
                    toast.success(d.message ?? "Crédité");
                    setBalance(d.balance ?? balance);
                    load();
                  }
                }}
              >
                Créditer le portefeuille
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-shop-navy">Mouvements récents</h2>
        <ul className="mt-4 space-y-2">
          {ledger.length === 0 ?
            <li className="text-sm text-shop-muted">Aucun mouvement.</li>
          : ledger.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-shop-border bg-shop-bg px-4 py-3 text-sm"
              >
                <span className="text-shop-muted">{e.label ?? e.type}</span>
                <span className={e.amount >= 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                  {e.amount >= 0 ? "+" : ""}
                  {formatPrice(e.amount)}
                </span>
                <span className="w-full text-xs text-shop-muted md:w-auto">
                  {new Date(e.createdAt).toLocaleString("fr-FR")}
                </span>
              </li>
            ))
          }
        </ul>
      </div>
    </>
  );
}
