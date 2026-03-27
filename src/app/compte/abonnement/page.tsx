"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AbonnementPage() {
  const [premium, setPremium] = useState(false);

  const load = () => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPremium(!!d.user?.chatbotPremium));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Abonnement & chatbot</h1>
      <p className="mt-2 text-sm text-shop-muted">
        <strong>Sans abonnement</strong> : le chatbot utilise des <strong>règles et intentions</strong> (mots-clés :
        livraison, retours, promo, compte…). Il comprend mal les questions libres complexes.
      </p>
      <p className="mt-2 text-sm text-shop-muted">
        <strong>Avec NEXORA+</strong> : si la clé <code className="rounded bg-shop-bg px-1">OPENAI_API_KEY</code> est
        configurée sur le serveur, le chatbot répond via <strong>OpenAI</strong> (modèle configurable).
      </p>

      <div className="mt-8 rounded-2xl border border-shop-cyan/40 bg-gradient-to-br from-shop-cyan/10 to-shop-surface p-6">
        <p className="text-lg font-semibold text-shop-navy">
          Statut : {premium ? "NEXORA+ actif" : "Formule standard"}
        </p>
        <p className="mt-2 text-sm text-shop-muted">
          Ceci est une <strong>démo</strong> : activez ou désactivez l’accès au mode IA pour votre compte.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {!premium ? (
            <button
              type="button"
              className="rounded-xl bg-shop-cyan px-5 py-2.5 text-sm font-semibold text-white"
              onClick={async () => {
                const r = await fetch("/api/me", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ chatbotPremium: true }),
                });
                if (!r.ok) toast.error("Erreur");
                else {
                  toast.success("NEXORA+ activé (démo)");
                  load();
                }
              }}
            >
              Activer NEXORA+ (démo)
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl border border-shop-border bg-shop-surface px-5 py-2.5 text-sm font-medium"
              onClick={async () => {
                const r = await fetch("/api/me", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ chatbotPremium: false }),
                });
                if (!r.ok) toast.error("Erreur");
                else {
                  toast.success("Repassé en formule standard");
                  load();
                }
              }}
            >
              Désactiver NEXORA+
            </button>
          )}
        </div>
        <p className="mt-4 text-xs text-shop-muted">
          Admin : ajoutez <code className="rounded bg-shop-bg px-1">OPENAI_API_KEY</code> dans{" "}
          <code className="rounded bg-shop-bg px-1">.env</code> pour que le mode premium appelle réellement l’API
          OpenAI.
        </p>
      </div>
    </>
  );
}
