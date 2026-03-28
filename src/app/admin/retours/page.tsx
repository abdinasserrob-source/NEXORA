"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { returnReasonLabel } from "@/lib/return-request-shared";

type Row = {
  id: string;
  type: string;
  reason: string;
  description: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  order: { id: string; total: number; status: string };
  user: { email: string; firstName: string | null; lastName: string | null };
};

function typeFr(t: string) {
  if (t === "RETURN") return "Retour";
  if (t === "REFUND") return "Remboursement";
  if (t === "DISPUTE") return "Litige";
  return t;
}

function statusFr(s: string) {
  if (s === "PENDING") return "En attente";
  if (s === "APPROVED") return "Approuvé";
  if (s === "REJECTED") return "Refusé";
  if (s === "REFUNDED") return "Remboursé";
  return s;
}

export default function AdminRetoursPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState(false);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetch("/api/admin/return-requests", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = await r.json();
      setRows(d.requests ?? []);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    const r = await fetch(`/api/admin/return-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action, adminNote: noteById[id]?.trim() || undefined }),
    });
    const d = await r.json().catch(() => ({}));
    setBusyId(null);
    if (!r.ok) {
      toast.error(typeof (d as { error?: string }).error === "string" ? (d as { error: string }).error : "Erreur");
      return;
    }
    toast.success(action === "approve" ? "Demande approuvée" : "Demande refusée");
    load();
  };

  if (err) {
    return (
      <main className="p-8 text-center text-[#666]">
        Accès refusé.{" "}
        <Link href="/connexion?next=/admin/retours" className="text-[#00b8d9]">
          Connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-x-auto px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Demandes de retour</h1>
      <p className="text-sm text-[#666]">
        Les demandes <strong>en attente</strong> apparaissent en premier. Approuver met la commande en{" "}
        <code className="rounded bg-[#f0f0f0] px-1 text-xs">REFUNDED</code> et notifie le client.
      </p>
      <div className="mt-6 space-y-6">
        {rows.length === 0 && <p className="text-sm text-[#888]">Aucune demande.</p>}
        {rows.map((r) => (
          <article
            key={r.id}
            className={`rounded-2xl border p-4 shadow-sm ${
              r.status === "PENDING" ? "border-amber-200 bg-amber-50/40" : "border-[#e8eaef] bg-white"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-mono text-[#888]">{r.id.slice(0, 12)}…</p>
                <p className="mt-1 font-semibold text-[#1a2744]">
                  Commande {r.order.id.slice(0, 10)}… — {r.order.total.toFixed(2)} € ({r.order.status})
                </p>
                <p className="text-sm text-[#555]">
                  {r.user.firstName ?? ""} {r.user.lastName ?? ""} · {r.user.email}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  r.status === "PENDING" ? "bg-amber-200 text-amber-950"
                  : r.status === "APPROVED" ? "bg-emerald-200 text-emerald-950"
                  : r.status === "REJECTED" ? "bg-red-200 text-red-950"
                  : "bg-[#e8eaef] text-[#555]"
                }`}
              >
                {statusFr(r.status)}
              </span>
            </div>
            <dl className="mt-3 grid gap-1 text-sm text-[#444]">
              <div>
                <dt className="inline font-medium">Type :</dt> <dd className="inline">{typeFr(r.type)}</dd>
              </div>
              <div>
                <dt className="inline font-medium">Motif :</dt>{" "}
                <dd className="inline">{returnReasonLabel(r.reason)}</dd>
              </div>
              <div>
                <dt className="font-medium">Description :</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[#333]">{r.description}</dd>
              </div>
              {r.adminNote ?
                <div>
                  <dt className="font-medium text-[#0088a3]">Note admin :</dt>
                  <dd className="mt-0.5">{r.adminNote}</dd>
                </div>
              : null}
              <div className="text-xs text-[#888]">{new Date(r.createdAt).toLocaleString("fr-FR")}</div>
            </dl>
            {r.status === "PENDING" ?
              <div className="mt-4 space-y-2 border-t border-[#e8eaef] pt-4">
                <label className="block text-xs font-medium text-[#555]">
                  Commentaire (optionnel)
                  <textarea
                    className="mt-1 w-full rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                    rows={2}
                    value={noteById[r.id] ?? ""}
                    onChange={(e) => setNoteById((m) => ({ ...m, [r.id]: e.target.value }))}
                    placeholder="Message visible par le client dans l’e-mail…"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void act(r.id, "approve")}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approuver
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void act(r.id, "reject")}
                    className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-60"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            : null}
          </article>
        ))}
      </div>
    </main>
  );
}
