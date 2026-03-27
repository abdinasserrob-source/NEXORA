"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HistoryPage() {
  const [events, setEvents] = useState<
    { id: string; type: string; path?: string | null; query?: string | null; createdAt: string }[]
  >([]);

  useEffect(() => {
    void fetch("/api/history/browse", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setEvents(d.events ?? []));
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Historique de navigation</h1>
      <p className="mt-2 text-sm text-shop-muted">
        Vues de pages et signaux utilisés pour les recommandations. Pour les recherches texte seules, voir{" "}
        <Link href="/compte/historique-recherche" className="text-shop-cyan">
          Historique de recherche
        </Link>
        .
      </p>
      <ul className="mt-6 space-y-2 text-sm">
        {events.map((e) => (
          <li key={e.id} className="rounded-xl border border-shop-border bg-shop-bg px-4 py-3">
            <span className="font-medium text-shop-cyan">{e.type}</span>
            {e.path && <span className="text-shop-muted"> · {e.path}</span>}
            {e.query && <span className="text-shop-muted"> · requête « {e.query} »</span>}
            <span className="block text-xs text-shop-muted">{new Date(e.createdAt).toLocaleString("fr-FR")}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
