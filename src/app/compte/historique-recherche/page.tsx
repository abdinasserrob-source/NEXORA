"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function SearchHistoryPage() {
  const [events, setEvents] = useState<{ id: string; query: string | null; createdAt: string }[]>([]);

  useEffect(() => {
    void fetch("/api/history/browse?searchOnly=1", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const ev = (d.events ?? []).filter((e: { query?: string | null }) => e.query);
        setEvents(ev);
      });
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Historique de recherche</h1>
      <p className="mt-1 text-sm text-shop-muted">Recherches effectuées pendant que vous étiez connecté.</p>
      <ul className="mt-6 space-y-2">
        {events.length === 0 && <li className="text-sm text-shop-muted">Aucune recherche enregistrée.</li>}
        {events.map((e) => (
          <li key={e.id} className="flex items-center justify-between rounded-xl border border-shop-border bg-shop-bg px-4 py-3 text-sm">
            <Link href={`/recherche?q=${encodeURIComponent(e.query ?? "")}`} className="font-medium text-shop-cyan hover:underline">
              {e.query}
            </Link>
            <span className="text-xs text-shop-muted">{new Date(e.createdAt).toLocaleString("fr-FR")}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
