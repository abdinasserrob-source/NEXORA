"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  Star,
  Sparkles,
  BarChart3,
  PlusCircle,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";

const ITEMS: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  match?: (path: string) => boolean;
}[] = [
  { href: "/vendeur", label: "Tableau de bord", icon: LayoutDashboard, match: (p) => p === "/vendeur" },
  { href: "/vendeur/boutique", label: "Ma boutique", icon: Store },
  {
    href: "/vendeur/produits",
    label: "Mes produits",
    icon: Package,
    match: (p) => p === "/vendeur/produits",
  },
  {
    href: "/vendeur/produits/nouveau",
    label: "Ajouter un produit",
    icon: PlusCircle,
    match: (p) => p.startsWith("/vendeur/produits/nouveau"),
  },
  { href: "/vendeur/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/vendeur/notifications", label: "Notifications", icon: Bell },
  { href: "/vendeur/avis", label: "Avis clients", icon: Star },
  { href: "/vendeur/recommandations", label: "Recommandation IA", icon: Sparkles },
  { href: "/vendeur/statistiques", label: "Statistiques", icon: BarChart3 },
];

export function SellerSidebar({ suspended }: { suspended: boolean }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshUnread = () => {
    void fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUnreadCount(typeof d.unreadCount === "number" ? d.unreadCount : 0))
      .catch(() => setUnreadCount(0));
  };

  useEffect(() => {
    refreshUnread();
  }, []);

  useEffect(() => {
    refreshUnread();
  }, [pathname]);

  useEffect(() => {
    const onUpdated = () => refreshUnread();
    window.addEventListener("notifications:updated", onUpdated);
    return () => window.removeEventListener("notifications:updated", onUpdated);
  }, []);

  return (
    <aside className="fixed bottom-0 top-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-nexora-card/80 backdrop-blur lg:flex">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-shop-cyan/20 text-lg text-shop-cyan">
          ◆
        </span>
        <div className="min-w-0">
          <span className="block truncate font-bold text-shop-text">Espace vendeur</span>
          <span className="text-[10px] text-shop-muted">NEXORA</span>
        </div>
      </div>
      {suspended && (
        <div className="mx-3 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
          Boutique suspendue : publication catalogue limitée (prix / stock autorisés).
        </div>
      )}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        {ITEMS.map(({ href, label, icon: Icon, match }) => {
          const active = match
            ? match(pathname)
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium transition",
                active ? "bg-shop-cyan/15 text-shop-cyan" : "text-shop-muted hover:bg-white/5 hover:text-shop-text"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
              {href === "/vendeur/notifications" && unreadCount > 0 ? (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3 text-xs">
        <Link href="/compte" className="block rounded-lg px-3 py-2 text-shop-muted hover:text-shop-text">
          Paramètres compte →
        </Link>
        <Link href="/" className="mt-1 block rounded-lg px-3 py-2 text-shop-muted hover:text-shop-text">
          Retour boutique
        </Link>
      </div>
    </aside>
  );
}
