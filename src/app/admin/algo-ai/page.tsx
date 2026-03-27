"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Sparkles } from "lucide-react";

const MODES = [
  { id: "HYBRID", label: "HYBRID (contenu + collaboratif)" },
  { id: "CONTENT", label: "CONTENT uniquement" },
  { id: "COLLAB", label: "COLLAB uniquement" },
] as const;

export default function AdminAlgoAiPage() {
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("HYBRID");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await fetch("/api/admin/algo-ai", { credentials: "include" });
    if (!r.ok) {
      toast.error("Accès refusé");
      setLoading(false);
      return;
    }
    const d = await r.json().catch(() => ({}));
    if (typeof d.mode === "string") setMode(d.mode);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="flex-1 px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <Sparkles className="size-8 text-[#00d4ff]" />
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">Algo AI</h1>
          <p className="text-sm text-[#666]">
            Choisissez le mode de recommandation “Recommandé pour vous” (base : contenu + comportement).
          </p>
        </div>
      </div>

      <div className="mt-8 max-w-xl rounded-2xl border border-[#e8eaef] bg-white p-6 shadow-sm">
        <label className="text-sm font-medium text-[#333]">
          Mode
          <select
            className="mt-2 w-full rounded-xl border border-[#ddd] bg-white px-3 py-2.5 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as (typeof MODES)[number]["id"])}
            disabled={loading}
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="mt-5 rounded-full bg-[#00d4ff] px-5 py-2 text-sm font-semibold text-white"
          disabled={loading}
          onClick={async () => {
            const r = await fetch("/api/admin/algo-ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ mode }),
            });
            if (!r.ok) {
              toast.error("Impossible de sauvegarder");
              return;
            }
            toast.success("Mode d’algorithme enregistré");
            void load();
          }}
        >
          Appliquer
        </button>

        <p className="mt-3 text-xs text-[#888]">
          Si l’utilisateur n’a pas assez de comportement (invité), la page utilise une sélection déterministe
          (nouveautés + promos).
        </p>
      </div>

      <Link href="/admin" className="mt-8 inline-block text-sm font-medium text-[#00b8d9] hover:underline">
        ← Retour admin
      </Link>
    </main>
  );
}

