"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PackageSearch } from "lucide-react";

function TrackInner() {
  const sp = useSearchParams();
  const fromOrder = sp.get("order") ?? "";
  const [orderId, setOrderId] = useState(fromOrder);
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{
    status?: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    error?: string;
  } | null>(null);

  useEffect(() => {
    setOrderId(fromOrder);
  }, [fromOrder]);

  const consult = (id: string) => {
    const raw = id.trim();
    if (!raw) return;
    setLoading(true);
    setRes(null);
    void fetch(`/api/orders/${encodeURIComponent(raw)}/tracking`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setRes(d);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (fromOrder.trim()) consult(fromOrder);
  }, [fromOrder]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-cyan-50 text-shop-cyan">
          <PackageSearch className="size-7" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-shop-navy">Suivi colis</h1>
          <p className="mt-1 text-sm text-shop-muted">
            Collez le <strong>numéro de commande complet</strong> depuis « Mes commandes » (bouton Copier).
          </p>
        </div>
      </div>
      <label className="block text-xs font-medium text-shop-muted">ID commande</label>
      <input
        className="mt-1 w-full rounded-xl border border-shop-border bg-white px-4 py-3 text-sm text-shop-text outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20"
        placeholder="ex. cmn6cjm8e00b..."
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
      />
      <button
        type="button"
        disabled={loading || !orderId.trim()}
        className="mt-4 w-full rounded-xl bg-shop-cyan py-3 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
        onClick={() => consult(orderId)}
      >
        {loading ? "Chargement…" : "Consulter"}
      </button>
      {res?.error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{res.error}</p>
      )}
      {res && !res.error && (
        <div className="mt-6 rounded-2xl border border-shop-border bg-shop-bg p-5 text-sm shadow-sm">
          <dl className="space-y-3">
            <div>
              <dt className="text-xs font-semibold uppercase text-shop-muted">Statut</dt>
              <dd className="font-medium text-shop-navy">{res.status ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-shop-muted">Transporteur</dt>
              <dd>{res.carrier ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-shop-muted">Numéro de suivi</dt>
              <dd className="font-mono text-shop-cyan">{res.trackingNumber ?? "Pas encore attribué"}</dd>
            </div>
          </dl>
        </div>
      )}
      <p className="mt-8 text-center text-sm text-shop-muted">
        <Link href="/compte/commandes" className="font-medium text-shop-cyan hover:underline">
          ← Mes commandes
        </Link>
      </p>
    </div>
  );
}

export default function TrackPage() {
  return (
    <div className="min-h-screen bg-shop-bg">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center text-shop-muted">Chargement…</div>
        }
      >
        <TrackInner />
      </Suspense>
    </div>
  );
}
