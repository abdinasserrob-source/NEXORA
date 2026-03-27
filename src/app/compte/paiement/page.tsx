"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Card = { id: string; brand: string; last4: string; expMonth: number; expYear: number };

export default function PaiementPage() {
  const [tab, setTab] = useState<"cartes" | "remboursements">("cartes");
  const [cards, setCards] = useState<Card[]>([]);
  const [returns, setReturns] = useState<
    { id: string; status: string; reason: string; createdAt: string; product: { name: string } }[]
  >([]);
  const [brand, setBrand] = useState<"Visa" | "Mastercard" | "PayPal">("Visa");
  const [last4, setLast4] = useState("");
  const [expM, setExpM] = useState(12);
  const [expY, setExpY] = useState(new Date().getFullYear() + 1);

  const loadCards = () => {
    void fetch("/api/me/payment-methods", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []));
  };
  const loadReturns = () => {
    void fetch("/api/me/returns", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setReturns(d.returns ?? []));
  };

  useEffect(() => {
    loadCards();
    loadReturns();
  }, []);

  const inp =
    "w-full rounded-xl border border-shop-border bg-shop-bg px-3 py-2 text-sm outline-none focus:border-shop-cyan";

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Paiement</h1>
      <div className="mt-6 flex gap-2 border-b border-shop-border">
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "cartes" ? "border-shop-cyan text-shop-cyan" : "border-transparent text-shop-muted"
          }`}
          onClick={() => setTab("cartes")}
        >
          Cartes enregistrées
        </button>
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            tab === "remboursements" ? "border-shop-cyan text-shop-cyan" : "border-transparent text-shop-muted"
          }`}
          onClick={() => setTab("remboursements")}
        >
          Remboursements / retours
        </button>
      </div>

      {tab === "cartes" && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-shop-navy">Ajouter une carte</h2>
          <form
            className="mt-4 grid max-w-md gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!/^\d{4}$/.test(last4)) {
                toast.error("4 derniers chiffres requis");
                return;
              }
              const r = await fetch("/api/me/payment-methods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ brand, last4, expMonth: expM, expYear: expY }),
              });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) toast.error((d as { error?: string }).error ?? "Erreur");
              else {
                toast.success(
                  d.wallet?.depositReference ?
                    `Carte enregistrée — réf. portefeuille : ${d.wallet.depositReference}`
                  : "Carte enregistrée"
                );
                setLast4("");
                loadCards();
              }
            }}
          >
            <label className="sm:col-span-2">
              <div className="text-xs font-medium text-shop-muted">Type de carte</div>
              <select className={`${inp} mt-2`} value={brand} onChange={(e) => setBrand(e.target.value as typeof brand)}>
                <option value="Visa">VISA</option>
                <option value="Mastercard">MasterCard</option>
                <option value="PayPal">PayPal</option>
              </select>
            </label>

            <label>
              <div className="text-xs font-medium text-shop-muted">4 derniers chiffres</div>
              <input
                className={inp}
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1234"
                maxLength={4}
                inputMode="numeric"
              />
            </label>

            <label>
              <div className="text-xs font-medium text-shop-muted">Mois d’expiration</div>
              <input className={inp} type="number" min={1} max={12} value={expM} onChange={(e) => setExpM(Number(e.target.value))} />
            </label>

            <label className="sm:col-span-2">
              <div className="text-xs font-medium text-shop-muted">Année d’expiration</div>
              <input
                className={inp}
                type="number"
                min={2025}
                max={2040}
                value={expY}
                onChange={(e) => setExpY(Number(e.target.value))}
              />
            </label>

            <button type="submit" className="rounded-xl bg-shop-cyan py-2 text-sm font-semibold text-white sm:col-span-2">
              Enregistrer la carte
            </button>
          </form>

          <ul className="mt-8 space-y-2">
            {cards.length === 0 && <li className="text-sm text-shop-muted">Aucune carte.</li>}
            {cards.map((c) => (
              <li key={c.id} className="rounded-xl border border-shop-border bg-shop-bg px-4 py-3 text-sm">
                <strong>{c.brand}</strong> ·••• {c.last4} — {c.expMonth}/{c.expYear}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "remboursements" && (
        <div className="mt-6">
          <p className="text-sm text-shop-muted">
            Demandes de retour liées à vos commandes. Pour en créer une, ouvrez{" "}
            <Link href="/compte/commandes" className="text-shop-cyan">
              Mes commandes
            </Link>
            .
          </p>
          <ul className="mt-4 space-y-2">
            {returns.length === 0 && <li className="text-sm text-shop-muted">Aucune demande.</li>}
            {returns.map((r) => (
              <li key={r.id} className="rounded-xl border border-shop-border bg-shop-bg px-4 py-3 text-sm">
                <span className="font-medium text-shop-text">{r.product.name}</span> — {r.status}
                <p className="text-xs text-shop-muted">{r.reason}</p>
                <p className="text-xs text-shop-muted">{new Date(r.createdAt).toLocaleString("fr-FR")}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
