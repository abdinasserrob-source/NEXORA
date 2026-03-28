"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingCart, User, Search, Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePreferences } from "@/components/PreferencesContext";
import { SearchMediaButtons } from "@/components/SearchMediaButtons";

type Me = {
  user:
    | {
        id: string;
        email: string;
        role: string;
        firstName?: string | null;
        name?: string | null;
        avatar?: string | null;
      }
    | null;
};

export function Header() {
  const pathname = usePathname();
  const { t } = usePreferences();
  const [me, setMe] = useState<Me | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [q, setQ] = useState("");
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return null;
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) return null;
        return (await r.json()) as Me;
      })
      .then((data) => setMe(data))
      .catch(() => setMe(null));
    void fetch("/api/cart", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCartCount(d.items?.length ?? 0))
      .catch(() => {});
  }, [pathname]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) window.location.href = `/recherche?q=${encodeURIComponent(q.trim())}`;
  };

  return (
    <header className="sticky top-0 z-50 border-b border-shop-border bg-shop-surface shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 md:flex-nowrap">
        <Link href="/" className="flex shrink-0 items-center gap-2">
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
          <span className="text-lg font-bold tracking-tight text-shop-navy">NEXORA</span>
        </Link>

        <nav className="order-3 flex w-full items-center justify-center gap-6 text-sm text-shop-muted md:order-none md:w-auto">
          <Link href="/" className="font-medium hover:text-shop-cyan">
            {t("nav.home")}
          </Link>
          <Link href="/categories" className="hover:text-shop-cyan">
            {t("nav.categories")}
          </Link>
          <Link href="/vendeurs" className="hover:text-shop-cyan">
            {t("nav.sellers")}
          </Link>
          <Link href="/promos" className="hover:text-shop-cyan">
            {t("nav.promos")}
          </Link>
          <Link href="/#tendance" className="hover:text-shop-cyan">
            {t("nav.news")}
          </Link>
          {me?.user?.role === "ADMIN" && (
            <Link href="/admin" className="font-medium text-amber-600 hover:text-amber-700">
              {t("nav.admin")}
            </Link>
          )}
          {me?.user?.role === "SELLER" && (
            <Link href="/vendeur" className="font-medium text-emerald-600 hover:text-emerald-700">
              {t("nav.seller")}
            </Link>
          )}
        </nav>

        <form
          onSubmit={onSearch}
          className="order-2 flex min-w-0 flex-1 items-center gap-1.5 md:order-none md:max-w-md md:mx-4"
        >
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-shop-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("header.searchPlaceholder")}
              className="w-full rounded-full border border-shop-border bg-shop-bg py-2.5 pl-10 pr-4 text-sm text-shop-text outline-none ring-shop-cyan/30 focus:ring-2"
            />
          </div>
          <SearchMediaButtons compact />
        </form>

        <div className="order-2 ml-auto flex items-center gap-2 md:order-none">
          {me?.user && (
            <Link
              href="/compte/favoris"
              className="rounded-full p-2 text-shop-muted hover:bg-shop-bg hover:text-shop-cyan"
              aria-label={t("header.favorites")}
            >
              <Heart className="size-5" />
            </Link>
          )}
          <Link
            href="/panier"
            className="relative rounded-full p-2 text-shop-muted hover:bg-shop-bg hover:text-shop-cyan"
            aria-label={t("header.cart")}
          >
            <ShoppingCart className="size-6" />
            <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {cartCount}
            </span>
          </Link>
          <Link
            href={
              me?.user ? (me.user.role === "ADMIN" ? "/admin" : "/compte") : "/connexion"
            }
            className={cn(
              "flex items-center gap-1.5 rounded-full border border-shop-border bg-shop-bg px-3 py-2 text-sm text-shop-text",
              "hover:border-shop-cyan/50"
            )}
          >
            {!me?.user ? (
              <>
                <User className="size-4 text-shop-muted" />
                <span className="hidden max-w-[120px] truncate sm:inline">{t("header.login")}</span>
              </>
            ) : me.user.avatar ? (
              <div className="flex items-center gap-2">
                <Image
                  src={me.user.avatar}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                  alt={me.user.name ?? me.user.firstName ?? "Utilisateur"}
                  unoptimized
                />
                <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                  {me.user.firstName ?? (me.user.name ? me.user.name.split(" ")[0] : "Moi")}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-shop-cyan text-sm font-bold text-white">
                  {(me.user.name ?? me.user.firstName ?? "U").charAt(0).toUpperCase()}
                </div>
                <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
                  {(me.user.name ?? me.user.firstName ?? "Moi").split(" ")[0]}
                </span>
              </div>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
