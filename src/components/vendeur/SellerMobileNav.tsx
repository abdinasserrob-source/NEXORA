"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/vendeur", label: "Tableau de bord" },
  { href: "/vendeur/boutique", label: "Ma boutique" },
  { href: "/vendeur/produits", label: "Produits" },
  { href: "/vendeur/commandes", label: "Commandes" },
  { href: "/vendeur/avis", label: "Avis" },
  { href: "/vendeur/recommandations", label: "IA" },
  { href: "/vendeur/statistiques", label: "Stats" },
];

export function SellerMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10 bg-nexora-card/90 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between">
        <Link href="/vendeur" className="flex items-center gap-2 font-bold text-shop-text">
          <LayoutDashboard className="size-5 text-shop-cyan" />
          Vendeur
        </Link>
        <button
          type="button"
          className="rounded-lg border border-white/10 p-2 text-shop-muted"
          aria-expanded={open}
          aria-label="Menu vendeur"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <nav className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                pathname === href || (href !== "/vendeur" && pathname.startsWith(href))
                  ? "bg-shop-cyan/15 text-shop-cyan"
                  : "text-shop-muted"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
