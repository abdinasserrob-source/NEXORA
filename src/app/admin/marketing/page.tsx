"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type Promo = {
  id: string;
  code: string;
  kind: string;
  value: number;
  active: boolean;
};

export default function AdminMarketingPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("10");
  const [err, setErr] = useState(false);

  const load = () => {
    void fetch("/api/admin/promos", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = await r.json();
      setPromos(d.promos ?? []);
    });
  };

  useEffect(() => {
    load();
  }, []);

  if (err) {
    return (
      <main className="p-8 text-center text-[#666]">
        Accès refusé.{" "}
        <Link href="/connexion?next=/admin/marketing" className="text-[#00b8d9]">
          Connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Marketing & promos</h1>
      <p className="text-sm text-[#666]">Codes promo en base.</p>

      <form
        className="mt-6 flex max-w-xl flex-wrap items-end gap-3 rounded-2xl border border-[#e8eaef] bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void fetch("/api/admin/promos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              code,
              kind,
              value: Number(value),
            }),
          }).then(async (r) => {
            if (!r.ok) toast.error("Création impossible");
            else {
              toast.success("Promo créée");
              setCode("");
              load();
            }
          });
        }}
      >
        <label className="text-sm">
          Code
          <input
            className="mt-1 block rounded-lg border border-[#ddd] px-3 py-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          Type
          <select
            className="mt-1 block rounded-lg border border-[#ddd] px-3 py-2"
            value={kind}
            onChange={(e) => setKind(e.target.value as "PERCENT" | "FIXED")}
          >
            <option value="PERCENT">Pourcentage</option>
            <option value="FIXED">Montant fixe</option>
          </select>
        </label>
        <label className="text-sm">
          Valeur
          <input
            type="number"
            step="0.01"
            className="mt-1 block w-28 rounded-lg border border-[#ddd] px-3 py-2"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="rounded-full bg-[#00d4ff] px-5 py-2 text-sm font-semibold text-white">
          Ajouter
        </button>
      </form>

      <ul className="mt-8 space-y-2 text-sm">
        {promos.map((p) => (
          <li key={p.id} className="rounded-xl border border-[#e8eaef] bg-white px-4 py-3">
            <span className="font-mono font-semibold">{p.code}</span>{" "}
            <span className="text-[#666]">
              {p.kind} {p.value} {p.active ? "" : "(inactif)"}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
