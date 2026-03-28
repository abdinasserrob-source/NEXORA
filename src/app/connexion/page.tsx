"use client";

import { AuthSplitShell } from "@/components/AuthSplitShell";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { ArrowRight, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { sanitizeRedirectPath } from "@/lib/sanitize-next";

function LoginForm() {
  const sp = useSearchParams();
  const nextParam = sp.get("next");
  const next = useMemo(() => sanitizeRedirectPath(nextParam), [nextParam]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    let r: Response;
    try {
      r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
    } catch {
      toast.error("Connexion impossible (réseau ou serveur arrêté).");
      return;
    }
    const data = (await r.json().catch(() => null)) as { error?: string } | null;
    if (!r.ok) {
      toast.error(
        typeof data?.error === "string" && data.error.length > 0
          ? data.error
          : "Identifiants invalides"
      );
      return;
    }
    toast.success("Connecté");
    window.location.href = next || "/";
  };

  const inputClass =
    "w-full rounded-xl border border-shop-border bg-shop-bg py-3 pl-11 pr-4 text-shop-text placeholder:text-shop-muted outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20";

  return (
    <>
      <Link
        href="/"
        className="mb-6 inline-flex text-sm font-medium text-shop-cyan hover:text-shop-cyan-hover"
      >
        ← Accueil
      </Link>
      <h1 className="text-3xl font-bold text-shop-navy">Bon retour</h1>
      <p className="mt-2 text-sm text-shop-muted">Poursuivez vos achats sur NEXORA.</p>

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
        <div>
          <label className="mb-1.5 block text-sm font-medium text-shop-text">Adresse e-mail</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-shop-muted" aria-hidden />
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="vous@exemple.com"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="text-sm font-medium text-shop-text">Mot de passe</label>
            <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-shop-cyan hover:text-shop-cyan-hover">
              Oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-shop-muted" aria-hidden />
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-shop-cyan py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-shop-cyan-hover"
        >
          Se connecter
          <ArrowRight className="size-4" aria-hidden />
        </button>
      </form>

      <p className="mt-8 border-t border-shop-border pt-8 text-center text-sm text-shop-muted">
        Nouveau sur NEXORA ?{" "}
        <Link
          href={
            next !== "/"
              ? `/inscription?next=${encodeURIComponent(next)}`
              : "/inscription"
          }
          className="font-semibold text-shop-cyan hover:text-shop-cyan-hover"
        >
          Créer un compte
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AuthSplitShell>
        <Suspense fallback={<p className="text-shop-muted">Chargement…</p>}>
          <LoginForm />
        </Suspense>
      </AuthSplitShell>
    </div>
  );
}
