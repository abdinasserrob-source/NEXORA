"use client";

import { AuthSplitShell } from "@/components/AuthSplitShell";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ForgotPage() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const inputClass =
    "w-full rounded-xl border border-shop-border bg-shop-bg py-3 pl-11 pr-4 text-shop-text placeholder:text-shop-muted outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20";

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const raw = await r.text();
      let d: {
        ok?: boolean;
        mailed?: boolean;
        error?: string;
        mailError?: string;
      } = {};
      try {
        d = raw ? (JSON.parse(raw) as typeof d) : {};
      } catch {
        toast.error(raw.slice(0, 200) || `Erreur serveur (${r.status})`);
        return;
      }
      if (!r.ok) {
        toast.error(typeof d.error === "string" ? d.error : `Erreur (${r.status})`);
        return;
      }
      if (d.mailed === false) {
        if (typeof d.mailError === "string" && d.mailError) {
          toast.error(`E-mail non envoyé : ${d.mailError}`);
        } else {
          toast.error(
            "E-mail non envoyé : dans .env, décommentez et renseignez SMTP (smtp.gmail.com, SMTP_USER=noreplynexora1@gmail.com, SMTP_PASS=mot de passe d’application, SMTP_FROM)."
          );
        }
        return;
      }
      toast.success("Code à 6 chiffres envoyé à votre adresse.");
      setStep("code");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Saisissez les 6 chiffres du code.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, code }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(typeof d.error === "string" ? d.error : "Code invalide");
        return;
      }
      const token = typeof d.token === "string" ? d.token : "";
      if (!token) {
        toast.success("Code validé.");
        window.location.href = "/";
        return;
      }
      toast.success("Code validé. Choisissez un nouveau mot de passe.");
      window.location.href = `/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <AuthSplitShell>
      {step === "email" ? (
        <>
          <Link
            href="/"
            className="mb-6 inline-flex text-sm font-medium text-shop-cyan hover:text-shop-cyan-hover"
          >
            ← Accueil
          </Link>
          <h1 className="text-3xl font-bold text-shop-navy">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-shop-muted">
            Nous enverrons un code de vérification à 6 chiffres à votre adresse e-mail.
          </p>
          <form onSubmit={sendCode} className="mt-8 space-y-4">
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
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-shop-cyan py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-shop-cyan-hover disabled:opacity-60"
            >
              Envoyer le code
              <ArrowRight className="size-4" aria-hidden />
            </button>
          </form>
        </>
      ) : (
        <>
          <Link
            href="/"
            className="mb-6 inline-flex text-sm font-medium text-shop-cyan hover:text-shop-cyan-hover"
          >
            ← Accueil
          </Link>
          <h1 className="text-3xl font-bold text-shop-navy">Code de vérification</h1>
          <p className="mt-2 text-sm text-shop-muted">
            Saisissez les 6 chiffres reçus sur <span className="font-medium text-shop-text">{email}</span>.
          </p>
          <form onSubmit={verifyCode} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-shop-text">Code à 6 chiffres</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-shop-muted" aria-hidden />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className={`${inputClass} pl-11 font-mono text-lg tracking-[0.35em]`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-shop-cyan py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-shop-cyan-hover disabled:opacity-60"
            >
              Vérifier et continuer
              <ArrowRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              className="w-full text-sm text-shop-cyan hover:text-shop-cyan-hover"
              onClick={() => {
                setStep("email");
                setCode("");
              }}
            >
              Utiliser une autre adresse
            </button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-sm text-shop-muted">
        <Link href="/connexion" className="font-semibold text-shop-cyan hover:text-shop-cyan-hover">
          Retour à la connexion
        </Link>
      </p>
      </AuthSplitShell>
    </div>
  );
}
