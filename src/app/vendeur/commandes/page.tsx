"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

type SellerOrder = {
  id: string;
  status: string;
  createdAt: string;
  customerLabel: string;
  sellerSubtotal: number;
  items: {
    id: string;
    titleSnap: string;
    quantity: number;
  }[];
};

const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "PENDING", label: "Nouvelles" },
  { id: "PAID", label: "En préparation" },
  { id: "SHIPPED", label: "Expédiées" },
  { id: "DELIVERED", label: "Livrées" },
  { id: "CANCELLED", label: "Annulées" },
] as const;

export default function VendeurCommandesPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/orders?seller=1", { credentials: "include" });
    const d = await r.json();
    if (!r.ok) throw new Error();
    const list = (d.orders ?? []) as SellerOrder[];
    setOrders(list);
    const st: Record<string, string> = {};
    for (const o of list) st[o.id] = o.status;
    setDrafts(st);
  }, []);

  useEffect(() => {
    void load().catch(() => toast.error("Erreur chargement commandes"));
  }, [load]);

  const visible =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-shop-text">Commandes</h1>
      <p className="mt-1 text-sm text-shop-muted">
        Montants = votre part uniquement. Le statut n’est modifiable que si la commande ne contient que vos
        produits.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === f.id ?
                "border-shop-cyan bg-shop-cyan/10 text-shop-cyan"
              : "border-white/10 bg-nexora-card text-shop-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-nexora-card p-4">
        <table className="min-w-[720px] w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-shop-muted">
            <tr>
              <th className="px-2 py-2">Réf.</th>
              <th className="px-2 py-2">Client</th>
              <th className="px-2 py-2">Statut</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Votre total</th>
              <th className="px-2 py-2">Articles</th>
              <th className="px-2 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id} className="border-b border-white/5 align-top">
                <td className="px-2 py-3 font-mono text-xs">{o.id.slice(0, 10)}…</td>
                <td className="px-2 py-3">{o.customerLabel}</td>
                <td className="px-2 py-3">
                  <select
                    className="w-40 rounded-xl border border-white/10 bg-shop-bg px-2 py-1"
                    value={drafts[o.id] ?? o.status}
                    onChange={(e) => setDrafts((m) => ({ ...m, [o.id]: e.target.value }))}
                  >
                    <option value="PENDING">En attente</option>
                    <option value="PAID">Payée / préparation</option>
                    <option value="SHIPPED">Expédiée</option>
                    <option value="DELIVERED">Livrée</option>
                    <option value="CANCELLED">Annulée</option>
                  </select>
                </td>
                <td className="px-2 py-3 text-xs text-shop-muted">
                  {new Date(o.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-2 py-3 font-medium text-shop-cyan">{o.sellerSubtotal.toFixed(2)} €</td>
                <td className="px-2 py-3">
                  <ul className="space-y-1 text-xs text-shop-muted">
                    {o.items.map((it) => (
                      <li key={it.id}>
                        {it.titleSnap} × {it.quantity}
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-2 py-3">
                  <button
                    type="button"
                    disabled={savingId === o.id}
                    className="rounded-xl bg-shop-cyan px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    onClick={async () => {
                      setSavingId(o.id);
                      const status = drafts[o.id] ?? o.status;
                      const r = await fetch(`/api/seller/orders/${o.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ status }),
                      });
                      setSavingId(null);
                      if (!r.ok) toast.error("Mise à jour impossible (commande mixte ?)");
                      else {
                        toast.success("Statut enregistré");
                        await load();
                      }
                    }}
                  >
                    {savingId === o.id ? "…" : "OK"}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 ?
              <tr>
                <td colSpan={7} className="px-2 py-8 text-center text-shop-muted">
                  Aucune commande dans ce filtre.
                </td>
              </tr>
            : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
