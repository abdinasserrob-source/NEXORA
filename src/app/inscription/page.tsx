"use client";

import { AuthSplitShell } from "@/components/AuthSplitShell";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { sanitizeRedirectPath } from "@/lib/sanitize-next";
import { ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

function RegisterForm() {
  const sp = useSearchParams();
  const nextParam = sp.get("next");
  const next = useMemo(() => sanitizeRedirectPath(nextParam), [nextParam]);
  const connexionHref =
    next !== "/" ? `/connexion?next=${encodeURIComponent(next)}` : "/connexion";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, firstName, lastName }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast.error(typeof d.error === "string" ? d.error : "Erreur");
      return;
    }
    toast.success("Compte créé");
    window.location.href = next || "/";
  };

  const inputClass =
    "w-full rounded-xl border border-shop-border bg-shop-bg py-3 px-4 text-shop-text placeholder:text-shop-muted outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20";

  return (
    <>
      <Link
        href="/"
        className="mb-6 inline-flex text-sm font-medium text-shop-cyan hover:text-shop-cyan-hover"
      >
        ← Accueil
      </Link>
      <h1 className="text-3xl font-bold text-shop-navy">Créer un compte</h1>
      <p className="mt-2 text-sm text-shop-muted">Rejoignez NEXORA en quelques secondes.</p>

      <div className="mt-6 space-y-3">
        <GoogleSignInButton nextUrl={next || "/"} />
      </div>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-shop-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wide">
          <span className="bg-shop-surface px-3 text-shop-muted">ou par e-mail</span>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-shop-muted opacity-50" />
            <input
              className={`${inputClass} pl-11`}
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <input
            className={inputClass}
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
        <input
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className={inputClass}
          placeholder="Mot de passe (6 caractères min.)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-shop-cyan py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-shop-cyan-hover"
        >
          S&apos;inscrire
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </form>

      <p className="mt-8 border-t border-shop-border pt-8 text-center text-sm text-shop-muted">
        Déjà un compte ?{" "}
        <Link href={connexionHref} className="font-semibold text-shop-cyan hover:text-shop-cyan-hover">
          Se connecter
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AuthSplitShell>
        <Suspense fallback={<p className="text-shop-muted">Chargement…</p>}>
          <RegisterForm />
        </Suspense>
      </AuthSplitShell>
    </div>
  );
}
