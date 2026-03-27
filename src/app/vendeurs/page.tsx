"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type Vendor = {
  sellerUserId: string;
  shopName: string;
  description?: string;
  rating?: number;
  salesCount?: number;
  seller?: { id: string; name: string | null; avatar: string | null; email: string };
};

export default function SellersPage() {
  const [me, setMe] = useState<{ user: { id: string } | null } | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const meJson = await meRes.json().catch(() => ({}));
        setMe(meJson);

        const vendorsRes = await fetch("/api/vendors");
        const vendorsJson = await vendorsRes.json().catch(() => ({}));
        setVendors(Array.isArray(vendorsJson.vendors) ? vendorsJson.vendors : []);

        if (meJson?.user?.id) {
          const favRes = await fetch("/api/vendor-favorites", { credentials: "include" });
          const favJson = await favRes.json().catch(() => ({}));
          const ids = Array.isArray(favJson.favorites)
            ? favJson.favorites.map((f: { sellerUserId: string }) => f.sellerUserId)
            : [];
          setFollowed(new Set(ids));
        }
      } catch {
        // On garde une UI sans blocage.
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const isLogged = !!me?.user?.id;

  const toggle = async (sellerUserId: string) => {
    if (!isLogged) {
      toast.error("Connectez-vous pour suivre un vendeur.");
      return;
    }

    try {
      const currently = followed.has(sellerUserId);
      if (currently) {
        const r = await fetch(
          `/api/vendor-favorites?sellerUserId=${encodeURIComponent(sellerUserId)}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!r.ok) throw new Error("Erreur");
        setFollowed((prev) => {
          const next = new Set(prev);
          next.delete(sellerUserId);
          return next;
        });
        toast.success("Vendeur retiré des suivis");
      } else {
        const r = await fetch("/api/vendor-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sellerUserId }),
        });
        if (!r.ok) throw new Error("Erreur");
        setFollowed((prev) => new Set(prev).add(sellerUserId));
        toast.success("Vendeur suivi");
      }
    } catch {
      toast.error("Action impossible");
    }
  };

  const sorted = useMemo(() => {
    // Visuel: favoris en haut.
    return [...vendors].sort((a, b) => {
      const af = followed.has(a.sellerUserId) ? 1 : 0;
      const bf = followed.has(b.sellerUserId) ? 1 : 0;
      if (af !== bf) return bf - af;
      return a.shopName.localeCompare(b.shopName);
    });
  }, [vendors, followed]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <p className="text-sm text-shop-muted">Chargement des vendeurs…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-bold text-shop-navy">Vendeurs</h1>
      <p className="mt-2 text-sm text-shop-muted">
        Suivez vos boutiques préférées. Quand un vendeur publie un produit, vous êtes notifié.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((v) => {
          const isFollowed = followed.has(v.sellerUserId);
          const initials = (v.seller?.name ?? v.shopName ?? "S").trim().slice(0, 1).toUpperCase();
          return (
            <div
              key={v.sellerUserId}
              className="flex flex-col rounded-2xl border border-shop-border bg-shop-surface p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-shop-cyan/10 text-sm font-bold text-shop-cyan">
                  {v.seller?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.seller.avatar}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/boutique/${v.sellerUserId}`}
                    className="truncate text-sm font-semibold text-shop-navy hover:underline"
                  >
                    {v.shopName}
                  </Link>
                  <p className="mt-1 line-clamp-2 text-sm text-shop-muted">
                    {v.description ?? "—"}
                  </p>
                  <p className="mt-2 text-xs text-shop-muted">
                    {typeof v.rating === "number" ? `Note ${v.rating.toFixed(1)}/5` : "Boutique approuvée"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isFollowed
                      ? "border border-shop-border bg-shop-bg text-shop-text hover:border-red-200 hover:text-red-700"
                      : "bg-shop-cyan text-white hover:bg-shop-cyan-hover"
                  }`}
                  onClick={() => void toggle(v.sellerUserId)}
                >
                  {isFollowed ? "Suivi" : "Suivre"}
                </button>
                <Link
                  href={`/boutique/${v.sellerUserId}`}
                  className="rounded-xl border border-shop-border bg-white px-3 py-2 text-sm font-medium text-shop-cyan hover:bg-shop-bg"
                >
                  Voir
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

