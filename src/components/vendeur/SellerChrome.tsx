"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SellerSidebar } from "./SellerSidebar";
import { SellerMobileNav } from "./SellerMobileNav";

type MeUser = {
  role: string;
  sellerProfile: {
    approved: boolean;
    operationalStatus: string;
    shopName?: string;
  } | null;
} | null;

export function SellerChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<MeUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setUser(d.user ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/connexion?next=${encodeURIComponent("/vendeur")}`);
      return;
    }
    if (user.role !== "SELLER") {
      router.replace("/compte");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shop-bg text-shop-muted">
        Chargement…
      </div>
    );
  }

  if (!user || user.role !== "SELLER") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-shop-bg text-shop-muted">
        Redirection…
      </div>
    );
  }

  if (user.sellerProfile?.operationalStatus === "BLOCKED") {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-16">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <h1 className="text-xl font-bold text-red-200">Accès vendeur désactivé</h1>
          <p className="mt-3 text-sm text-shop-muted">
            Votre espace vendeur a été bloqué par l’administration. Contactez le support pour plus
            d’informations.
          </p>
          <a href="/compte" className="mt-6 inline-block text-shop-cyan hover:underline">
            Retour au compte
          </a>
        </div>
      </div>
    );
  }

  const suspended = user.sellerProfile?.operationalStatus === "SUSPENDED";

  return (
    <div className="flex min-h-screen bg-shop-bg">
      <SellerSidebar suspended={suspended} />
      <div className="flex flex-1 flex-col lg:pl-64">
        <SellerMobileNav />
        {!user.sellerProfile ?
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100 md:text-sm">
            Aucune fiche boutique liée à ce compte. Si vous êtes vendeur, contactez l’administrateur.
          </div>
        : !user.sellerProfile.approved ?
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100 md:text-sm">
            Boutique en attente d’approbation : vous pouvez consulter le tableau de bord ; la{" "}
            <strong>publication</strong> de produits sera possible après validation par l’administrateur.
          </div>
        : null}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
