"use client";

import { GoogleLogin } from "@react-oauth/google";
import toast from "react-hot-toast";

type Props = {
  /** Après succès (ex. `/?` ou `/compte`) */
  nextUrl: string;
};

export function GoogleSignInButton({ nextUrl }: Props) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <p className="rounded-xl border border-dashed border-shop-border bg-shop-bg px-3 py-2.5 text-center text-xs leading-relaxed text-shop-muted">
        Connexion Google : définissez{" "}
        <code className="rounded bg-shop-surface px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>,{" "}
        <code className="rounded bg-shop-surface px-1">GOOGLE_CLIENT_ID</code> et{" "}
        <code className="rounded bg-shop-surface px-1">GOOGLE_CLIENT_SECRET</code> dans{" "}
        <code className="rounded bg-shop-surface px-1">.env</code>, puis redémarrez le serveur de dev.
      </p>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-shop-border bg-shop-surface">
      <div className="flex justify-center py-1">
        <GoogleLogin
          theme="outline"
          size="large"
          width={340}
          text="continue_with"
          shape="pill"
          onSuccess={async (res) => {
            const idToken = res.credential;
            if (!idToken) {
              toast.error("Réponse Google incomplète");
              return;
            }
            const r = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ idToken }),
            });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) {
              toast.error(typeof d.error === "string" ? d.error : "Connexion Google impossible");
              return;
            }
            toast.success("Connecté avec Google");
            window.location.href = nextUrl || "/";
          }}
          onError={() => {
            toast.error("Connexion Google annulée ou échouée");
          }}
        />
      </div>
    </div>
  );
}
