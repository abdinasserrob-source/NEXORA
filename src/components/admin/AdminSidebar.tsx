"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  CreditCard,
  Megaphone,
  Settings,
  LogOut,
  Store,
  Bell,
  UserCircle,
  Star,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] =
  [
    { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/admin/inventaire", label: "Inventaire", icon: Package },
    { href: "/admin/promo-produits", label: "Promo produits", icon: Megaphone },
    { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
    { href: "/admin/retours", label: "Retours & SAV", icon: RotateCcw },
    { href: "/admin/clients", label: "Clients", icon: Users },
    { href: "/admin/transactions", label: "Transactions", icon: CreditCard },
    { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
    { href: "/admin/vendeurs", label: "Vendeurs", icon: Store },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/profil", label: "Profil", icon: UserCircle },
    { href: "/admin/reviews", label: "Avis signalés", icon: Star },
    { href: "/admin/parametres", label: "Paramètres", icon: Settings },
  ];

export function AdminSidebar() {
  const pathname = usePathname();
  const [me, setMe] = useState<{
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatar: string | null;
  } | null>(null);
  const [logoOk, setLogoOk] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const refreshUnread = () => {
    void fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUnreadCount(typeof d.unreadCount === "number" ? d.unreadCount : 0))
      .catch(() => setUnreadCount(0));
  };

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));

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

  const initialLetter = useMemo(
    () =>
      ((me?.name?.trim()?.[0] ?? me?.firstName?.trim()?.[0] ?? me?.email?.trim()?.[0] ?? "A") as string).toUpperCase(),
    [me]
  );

  return (
    <aside className="fixed bottom-0 top-0 z-40 hidden w-60 flex-col border-r border-[#e8eaef] bg-white lg:flex">
      <div className="flex items-center gap-2 border-b border-[#e8eaef] px-4 py-5">
        {logoOk ? (
          <Image
            src="/brand/nexora-logo.svg"
            alt="NEXORA"
            width={36}
            height={36}
            className="size-9 rounded-lg object-cover"
            priority
            onError={() => setLogoOk(false)}
          />
        ) : (
          <span
            className="flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#00b8d9,#047a8f)" }}
            aria-hidden
          >
            N
          </span>
        )}
        <span className="font-bold text-[#1a2744]">NEXORA</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 text-sm">
        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-[#aaa]">Menu</p>
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 font-medium transition",
                active ? "bg-[#e8f8fb] text-[#0088a3]" : "text-[#555] hover:bg-[#f8f9fa]"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
              {href === "/admin/notifications" && unreadCount > 0 ? (
                <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-2 border-t border-[#e8eaef] p-3 text-xs text-[#666]">
        <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-[#e8eaef] bg-[#f8f9fa]">
          {me?.avatar ? <Image src={me.avatar} alt="" fill className="object-cover" unoptimized /> : null}
          {!me?.avatar ? (
            <div className="flex size-full items-center justify-center text-xs font-semibold text-[#64748b]">
              {initialLetter}
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[#333]">
            {me?.name || [me?.firstName, me?.lastName].filter(Boolean).join(" ") || "Espace admin"}
          </p>
          <p className="text-[10px] text-[#888]">Gestion plateforme</p>
        </div>
        <button
          type="button"
          className="shrink-0 text-[#888] hover:text-[#333]"
          aria-label="Déconnexion"
          onClick={() =>
            void fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
              window.location.href = "/";
            })
          }
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </aside>
  );
}
