"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

const AUTH_PATHS = new Set([
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reinitialiser-mot-de-passe",
]);

function isAuthPath(pathname: string | null) {
  if (!pathname) return false;
  return AUTH_PATHS.has(pathname);
}

function isAdminPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Sur le reste du site : barre de navigation (logo, liens, recherche, panier, compte) + pied de page (liens légaux, contact).
 * Sur les pages d’authentification : on les retire pour un écran centré sur la connexion / inscription (comme une maquette dédiée).
 * Sur /admin : chrome boutique masqué (layout admin dédié).
 */
export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const minimal = isAuthPath(pathname) || isAdminPath(pathname);

  if (minimal) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
