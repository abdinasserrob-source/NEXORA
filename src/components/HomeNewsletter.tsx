"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export function HomeNewsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <section className="mx-auto mt-16 max-w-7xl px-4">
      <div
        className="rounded-2xl px-6 py-12 text-center md:px-14 md:text-left"
        style={{ background: "linear-gradient(135deg, #1a2744 0%, #243352 100%)" }}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="text-white">
            <h2 className="text-2xl font-bold md:text-3xl">Rejoignez la révolution tech</h2>
            <p className="mt-2 text-sm text-white/75">
              Actualités, nouveautés et offres 
            </p>
          </div>
          <form
            className="flex w-full max-w-md flex-col gap-3 sm:flex-row md:flex-1 md:justify-end"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);
              try {
                const r = await fetch("/api/newsletter", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                });
                if (!r.ok) toast.error("Inscription impossible");
                else {
                  toast.success("Inscrit — vérifiez votre boîte mail");
                  setEmail("");
                }
              } finally {
                setLoading(false);
              }
            }}
          >
            <input
              type="email"
              required
              placeholder="Votre e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border-2 border-white/90 bg-white px-4 py-3 text-slate-900 shadow-lg outline-none ring-2 ring-white/40 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-cyan-300/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-shop-cyan px-8 py-3 font-semibold text-white shadow-md hover:bg-shop-cyan-hover disabled:opacity-50"
            >
              S&apos;inscrire
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
