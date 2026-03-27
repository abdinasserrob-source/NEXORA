"use client";

import {
  Bell,
  CreditCard,
  Gift,
  Heart,
  History,
  LayoutDashboard,
  MapPin,
  Package,
  Search,
  Settings,
  Sparkles,
  Store,
  LogOut,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { usePreferences } from "@/components/PreferencesContext";

const NAV_BASE = [
  { href: "/compte", key: "account.nav.dashboard", icon: LayoutDashboard },
  { href: "/compte/favoris", key: "account.nav.favorites", icon: Heart },
  { href: "/compte/profil", key: "account.nav.profile", icon: UserCircle },
  { href: "/compte/adresses", key: "account.nav.addresses", icon: MapPin },
  { href: "/compte/historique-recherche", key: "account.nav.searchHistory", icon: Search },
  { href: "/compte/historique", key: "account.nav.browseHistory", icon: History },
  { href: "/compte/abonnement", key: "account.nav.subscription", icon: Sparkles },
  { href: "/compte/portefeuille", key: "account.nav.wallet", icon: Wallet },
  { href: "/compte/paiement", key: "account.nav.payment", icon: CreditCard },
  { href: "/compte/vendeur", key: "account.nav.becomeSeller", icon: Store },
  { href: "/compte/commandes", key: "account.nav.orders", icon: Package },
  { href: "/compte/fidelite", key: "account.nav.loyalty", icon: Gift },
  { href: "/compte/parametres", key: "account.nav.settings", icon: Settings },
] as const;

function linkActive(pathname: string, searchParams: URLSearchParams, href: string) {
  if (href.includes("?")) {
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    const want = new URLSearchParams(query);
    for (const [k, v] of want.entries()) {
      if (searchParams.get(k) !== v) return false;
    }
    return true;
  }
  return pathname === href;
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = usePreferences();
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [me, setMe] = useState<{
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatar: string | null;
    role: string;
  } | null>(null);
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
      .then((d) => {
        if (d.user?.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        setRole(d.user?.role ?? null);
        setLogged(!!d.user);
        setMe(d.user ?? null);
        setReady(true);
      });

    refreshUnread();
  }, [router]);

  useEffect(() => {
    refreshUnread();
  }, [pathname]);

  useEffect(() => {
    const onUpdated = () => refreshUnread();
    window.addEventListener("notifications:updated", onUpdated);
    return () => window.removeEventListener("notifications:updated", onUpdated);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-[50vh] bg-shop-bg px-4 py-16 text-center text-shop-muted">
        {t("account.loading")}
      </div>
    );
  }

  if (!logged) {
    return (
      <div className="mx-auto max-w-lg bg-shop-bg px-4 py-16 text-center">
        <p className="text-shop-text">{t("account.loginPrompt")}</p>
        <Link
          href="/connexion?next=/compte"
          className="mt-4 inline-block rounded-xl bg-shop-cyan px-6 py-3 font-semibold text-white"
        >
          {t("account.signIn")}
        </Link>
      </div>
    );
  }

  const NAV = NAV_BASE.map((item) => ({ ...item, label: t(item.key) }));

  const extraNav = [
    { href: "/compte/notifications", label: t("account.notifications"), icon: Bell },
    ...(role === "SELLER"
      ? []
      : ([
          {
            href: "/compte/favoris?tab=vendeurs",
            label: t("account.nav.followedSellers"),
            icon: Users,
          },
        ] as const)),
  ];

  const navForRole =
    role === "SELLER"
      ? NAV.map((item) =>
          item.href === "/compte/vendeur"
            ? { ...item, href: "/vendeur", label: t("account.nav.sellerDashboard") }
            : item
        )
      : NAV;

  const allNav = [...navForRole.slice(0, 3), ...extraNav, ...navForRole.slice(3)];
  const initialLetter = (
    (me?.name?.trim()?.[0] ??
      me?.firstName?.trim()?.[0] ??
      me?.email?.trim()?.[0] ??
      "U") as string
  ).toUpperCase();

  return (
    <div className="min-h-[calc(100vh-80px)] bg-shop-bg">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative size-10 overflow-hidden rounded-full border border-shop-border bg-shop-bg">
              {me?.avatar ? (
                <Image src={me.avatar} alt="" fill className="object-cover" unoptimized />
              ) : null}
              {!me?.avatar ? (
                <div className="flex size-full items-center justify-center text-sm font-bold text-shop-muted">
                  {initialLetter}
                </div>
              ) : null}
              {me?.avatar ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0">
                  <span className="text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                    {initialLetter}
                  </span>
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-shop-text">
                {me?.name ??
                  [me?.firstName, me?.lastName].filter(Boolean).join(" ") ??
                  me?.email ??
                  "Compte"}
              </p>
              <p className="text-xs text-shop-muted">{me?.role}</p>
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-shop-border bg-shop-surface px-4 py-2 text-sm font-medium text-shop-text hover:border-shop-cyan hover:text-shop-cyan"
            onClick={() =>
              void fetch("/api/auth/logout", { method: "POST", credentials: "include" }).then(() => {
                window.location.href = "/";
              })
            }
          >
            <LogOut className="size-4" />
            {t("account.disconnect")}
          </button>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {allNav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium",
                linkActive(pathname, searchParams, href)
                  ? "border-shop-cyan bg-shop-cyan/10 text-shop-cyan"
                  : "border-shop-border bg-shop-surface text-shop-muted"
              )}
            >
              {label}
              {href === "/compte/notifications" && unreadCount > 0 ? (
                <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <aside className="hidden w-60 shrink-0 lg:block">
            <nav className="sticky top-24 space-y-1 rounded-2xl border border-shop-border bg-shop-surface p-3 shadow-sm">
              {allNav.map(({ href, label, icon: Icon }) => {
                const active = linkActive(pathname, searchParams, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-shop-cyan/12 text-shop-navy"
                        : "text-shop-muted hover:bg-shop-bg hover:text-shop-text"
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                    {label}
                    {href === "/compte/notifications" && unreadCount > 0 ? (
                      <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-4 rounded-2xl border border-shop-cyan/30 bg-gradient-to-br from-shop-cyan/10 to-shop-surface p-4 shadow-sm">
              <p className="text-sm font-semibold text-shop-navy">{t("account.nexoraPlusTitle")}</p>
              <p className="mt-1 text-xs text-shop-muted">{t("account.nexoraPlusHint")}</p>
              <Link
                href="/compte/abonnement"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-shop-cyan py-2 text-xs font-semibold text-white"
              >
                {t("account.discover")}
              </Link>
            </div>
          </aside>

          <div className="min-w-0 flex-1 rounded-2xl border border-shop-border bg-shop-surface p-6 shadow-sm md:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
