"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  amount: number;
  status: string;
  stripeRef: string | null;
  note: string | null;
  createdAt: string;
  orderId: string | null;
  orderTotal: number | null;
};

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/transactions", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = await r.json();
      setRows(d.transactions ?? []);
    });
  }, []);

  if (err) {
    return (
      <main className="p-8 text-center text-[#666]">
        Accès refusé.{" "}
        <Link href="/connexion?next=/admin/transactions" className="text-[#00b8d9]">
          Connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-x-auto px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Transactions paiement</h1>
      <p className="text-sm text-[#666]">Montants en EUR (système interne).</p>
      <table className="mt-6 w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[#e8eaef] bg-[#f8f9fa] text-xs uppercase text-[#888]">
          <tr>
            <th className="px-3 py-2">Date</th>
            <th className="px-3 py-2">Montant</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Commande</th>
            <th className="px-3 py-2">Réf.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} className="border-b border-[#f2f2f2]">
              <td className="px-3 py-2 text-xs">{new Date(t.createdAt).toLocaleString("fr-FR")}</td>
              <td className="px-3 py-2">{t.amount.toFixed(2)} €</td>
              <td className="px-3 py-2">{t.status}</td>
              <td className="px-3 py-2 font-mono text-xs">
                {t.orderId ? `${t.orderId.slice(0, 8)}…` : "—"}
              </td>
              <td className="max-w-[140px] truncate px-3 py-2 text-xs text-[#666]">
                {t.stripeRef ?? t.note ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
