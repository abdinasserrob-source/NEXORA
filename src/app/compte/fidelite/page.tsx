"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function LoyaltyPage() {
  const [data, setData] = useState<{ points: number; rewards: { id: string; title: string; costPoints: number }[] } | null>(
    null
  );

  useEffect(() => {
    void fetch("/api/loyalty", { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="py-10 text-center text-shop-muted">Chargement…</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Fidélité</h1>
      <p className="mt-2 text-shop-cyan">Solde : {data.points} pts (1 € = 10 pts)</p>
      <ul className="mt-6 max-w-xl space-y-3">
        {data.rewards.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-xl border border-shop-border bg-shop-bg p-4"
          >
            <span>{r.title}</span>
            <button
              type="button"
              onClick={async () => {
                const res = await fetch("/api/loyalty", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ rewardId: r.id }),
                });
                if (!res.ok) toast.error("Échange impossible");
                else toast.success("Récompense (voir console e-mail)");
                window.location.reload();
              }}
              className="rounded-full bg-shop-cyan px-3 py-1 text-xs font-semibold text-white"
            >
              {r.costPoints} pts
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
