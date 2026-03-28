"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  customerLabel: string;
  items: { titleSnap: string; quantity: number }[];
};

export default function AdminCommandesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetch("/api/admin/orders", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = await r.json();
      setRows(d.orders ?? []);
    });
  }, []);

  useEffect(() => {
    // Initialise les brouillons avec les statuts actuels
    const next: Record<string, string> = {};
    for (const r of rows) next[r.id] = draftStatuses[r.id] ?? r.status;
    setDraftStatuses(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  if (err) {
    return (
      <main className="p-8 text-center text-[#666]">
        Accès refusé.{" "}
        <Link href="/connexion?next=/admin/commandes" className="text-[#00b8d9]">
          Connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-x-auto px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Commandes</h1>
      <p className="text-sm text-[#666]">Toutes les commandes (totaux en EUR).</p>
      <table className="mt-6 w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-[#e8eaef] bg-[#f8f9fa] text-xs uppercase text-[#888]">
          <tr>
            <th className="px-3 py-2">Id</th>
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Total</th>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Articles</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className="border-b border-[#f2f2f2]">
              <td className="px-3 py-2 font-mono text-xs">{o.id.slice(0, 10)}…</td>
              <td className="px-3 py-2">{o.customerLabel}</td>
              <td className="px-3 py-2">
                <select
                  className="w-full rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  value={draftStatuses[o.id] ?? o.status}
                  onChange={(e) => setDraftStatuses((m) => ({ ...m, [o.id]: e.target.value }))}
                >
                  <option value="PENDING">En attente</option>
                  <option value="PAID">En cours</option>
                  <option value="SHIPPED">Expédiée</option>
                  <option value="DELIVERED">Livrée</option>
                  <option value="CANCELLED">Annulée</option>
                  <option value="REFUNDED">Remboursée</option>
                </select>
                <button
                  type="button"
                  className="mt-2 w-full rounded-xl bg-[#00d4ff] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                  disabled={savingId === o.id}
                  onClick={async () => {
                    const nextStatus = draftStatuses[o.id] ?? o.status;
                    setSavingId(o.id);
                    const r = await fetch(`/api/admin/orders/${o.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ status: nextStatus }),
                    });
                    if (!r.ok) {
                      setSavingId(null);
                      return;
                    }
                    setSavingId(null);
                    // Recharge légère
                    const rr = await fetch("/api/admin/orders", { credentials: "include" });
                    const dd = await rr.json().catch(() => ({}));
                    setRows(dd.orders ?? []);
                  }}
                >
                  {savingId === o.id ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </td>
              <td className="px-3 py-2">{o.total.toFixed(2)} €</td>
              <td className="px-3 py-2 text-xs text-[#666]">
                {new Date(o.createdAt).toLocaleString("fr-FR")}
              </td>
              <td className="max-w-[200px] truncate px-3 py-2 text-xs text-[#666]">
                {(o.items ?? []).map((i) => `${i.titleSnap}×${i.quantity}`).join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
