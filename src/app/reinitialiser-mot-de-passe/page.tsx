"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function ResetForm() {
  const sp = useSearchParams();
  const token = sp.get("token") ?? "";
  const [password, setPassword] = useState("");

  return (
    <>
      <Link
        href="/"
        className="mb-6 inline-flex text-sm font-medium text-shop-cyan hover:text-shop-cyan-hover"
      >
        ← Accueil
      </Link>
      <h1 className="text-2xl font-bold text-shop-navy">Nouveau mot de passe</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
          });
          if (!r.ok) toast.error("Lien invalide ou expiré");
          else {
            toast.success("Mot de passe mis à jour");
            window.location.href = "/connexion";
          }
        }}
      >
        <input
          type="password"
          required
          minLength={6}
          className="w-full rounded-xl border border-white/10 bg-nexora-card p-3"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="w-full rounded-full bg-nexora-cyan py-3 font-semibold text-nexora-bg">
          Enregistrer
        </button>
      </form>
    </>
  );
}

export default function ResetPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Suspense fallback={<p>Chargement…</p>}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
