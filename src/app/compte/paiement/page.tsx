"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { returnReasonLabel } from "@/lib/return-request-shared";

type Card = { id: string; brand: string; last4: string; expMonth: number; expYear: number };

type ReturnRow = {
  id: string;
  orderId: string;
  orderTotal: number;
  orderStatus: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
};

function typeFr(t: string) {
  if (t === "RETURN") return "Retour produit";
  if (t === "REFUND") return "Remboursement";
  if (t === "DISPUTE") return "Litige";
  return t;
}

function statusClass(s: string) {
  if (s === "PENDING") return "bg-amber-100 text-amber-950";
  if (s === "APPROVED") return "bg-emerald-100 text-emerald-950";
  if (s === "REJECTED") return "bg-red-100 text-red-950";
  if (s === "REFUNDED") return "bg-slate-200 text-slate-800";
  return "bg-shop-bg text-shop-muted";
}

function statusFr(s: string) {
  if (s === "PENDING") return "En attente";
  if (s === "APPROVED") return "Approuvé";
  if (s === "REJECTED") return "Refusé";
  if (s === "REFUNDED") return "Remboursé";
  return s;
}

export default function PaiementPage() {
  const [tab, setTab] = useState<"cartes" | "remboursements">("cartes");
  const [cards, setCards] = useState<Card[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
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
            Toutes vos demandes de retour, remboursement ou litige. Pour en créer une :{" "}
            <Link href="/compte/commandes" className="text-shop-cyan">
              Mes commandes
            </Link>
            .
          </p>
          <ul className="mt-4 space-y-3">
            {returns.length === 0 && <li className="text-sm text-shop-muted">Aucune demande.</li>}
            {returns.map((r) => (
              <li key={r.id} className="rounded-xl border border-shop-border bg-shop-bg p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-shop-muted">Commande {r.orderId.slice(0, 14)}…</p>
                    <p className="mt-1 font-semibold text-shop-text">
                      {typeFr(r.type)} · {returnReasonLabel(r.reason)}
                    </p>
                    <p className="mt-1 text-xs text-shop-muted">
                      {r.orderTotal.toFixed(2)} € — statut commande : {r.orderStatus}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusClass(r.status)}`}>
                    {statusFr(r.status)}
                  </span>
                </div>
                <p className="mt-2 text-shop-text">{r.description}</p>
                {r.adminNote ?
                  <p className="mt-2 rounded-lg border border-shop-border bg-white px-3 py-2 text-xs text-shop-muted">
                    <span className="font-semibold text-shop-navy">Réponse NEXORA :</span> {r.adminNote}
                  </p>
                : null}
                <p className="mt-2 text-xs text-shop-muted">
                  {new Date(r.createdAt).toLocaleString("fr-FR")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
