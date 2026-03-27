"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type Row = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  sellerReply: string | null;
  sellerRepliedAt: string | null;
  product: { id: string; name: string; slug: string };
  customerLabel: string;
};

export default function VendeurAvisPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [draftReply, setDraftReply] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/seller/reviews", { credentials: "include" });
    const d = await r.json();
    if (!r.ok) throw new Error();
    setRows(d.reviews ?? []);
  }, []);

  useEffect(() => {
    void load().catch(() => toast.error("Chargement des avis impossible"));
  }, [load]);

  return (
    <div className="px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-shop-text">Avis clients</h1>
      <p className="mt-1 text-sm text-shop-muted">Uniquement les avis sur vos produits.</p>

      <ul className="mt-8 space-y-6">
        {rows.length === 0 ?
          <li className="text-shop-muted">Aucun avis pour l’instant.</li>
        : rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-white/10 bg-nexora-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/produit/${r.product.slug}`} className="font-semibold text-shop-cyan hover:underline">
                    {r.product.name}
                  </Link>
                  <p className="text-xs text-shop-muted">{r.customerLabel}</p>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-amber-200">
                  {r.rating}/5
                </span>
              </div>
              <p className="mt-3 text-sm text-shop-text">{r.comment}</p>
              <p className="mt-1 text-[10px] text-shop-muted">
                {new Date(r.createdAt).toLocaleString("fr-FR")}
              </p>

              {r.sellerReply ?
                <div className="mt-4 rounded-xl border border-shop-cyan/20 bg-shop-cyan/5 p-3 text-sm">
                  <p className="text-xs font-semibold text-shop-cyan">Votre réponse</p>
                  <p className="mt-1 text-shop-muted">{r.sellerReply}</p>
                  {r.sellerRepliedAt ?
                    <p className="mt-1 text-[10px] text-shop-muted">
                      {new Date(r.sellerRepliedAt).toLocaleString("fr-FR")}
                    </p>
                  : null}
                </div>
              : <div className="mt-4 space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Répondre publiquement…"
                    className="w-full rounded-xl border border-white/10 bg-shop-bg px-3 py-2 text-sm outline-none focus:border-shop-cyan"
                    value={draftReply[r.id] ?? ""}
                    onChange={(e) => setDraftReply((m) => ({ ...m, [r.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    disabled={saving === r.id || !(draftReply[r.id]?.trim())}
                    className="rounded-xl bg-shop-cyan px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    onClick={async () => {
                      setSaving(r.id);
                      const body = { sellerReply: draftReply[r.id]!.trim() };
                      const res = await fetch(`/api/seller/reviews/${r.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify(body),
                      });
                      setSaving(null);
                      if (!res.ok) toast.error("Envoi impossible");
                      else {
                        toast.success("Réponse publiée");
                        await load();
                      }
                    }}
                  >
                    {saving === r.id ? "…" : "Publier la réponse"}
                  </button>
                </div>
              }
            </li>
          ))
        }
      </ul>
    </div>
  );
}
