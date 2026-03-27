"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Heart, Store } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";

type ProductRow = Parameters<typeof ProductCard>[0]["p"] & {
  category?: { name: string; slug: string } | null;
};

export default function BoutiquePage() {
  const { userId } = useParams<{ userId: string }>();
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<{ user: { id: string } | null } | null>(null);
  const [fav, setFav] = useState(false);
  const [data, setData] = useState<{
    profile: {
      shopName: string;
      description: string | null;
      logoUrl: string | null;
      bannerUrl: string | null;
      rating: number;
      salesCount: number;
      seller: { name: string | null; avatar: string | null };
    };
    products: ProductRow[];
  } | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => setMe({ user: null }));
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    void fetch(`/api/vendors/${userId}`)
      .then((r) => r.json())
      .then((d) => {
        setLoading(false);
        if (d.error) setData(null);
        else setData(d);
      })
      .catch(() => {
        setLoading(false);
        setData(null);
      });
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof userId !== "string") return;
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        type: "PAGE_VIEW",
        path: `/boutique/${userId}`,
        meta: { sellerUserId: userId, kind: "vendor_shop_view" },
      }),
    });
  }, [userId]);

  useEffect(() => {
    if (!me?.user?.id || !userId) return;
    void fetch("/api/vendor-favorites", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const ids = (d.favorites ?? []).map((x: { sellerUserId: string }) => x.sellerUserId);
        setFav(ids.includes(userId as string));
      })
      .catch(() => null);
  }, [me?.user?.id, userId]);

  const byCategory = useMemo(() => {
    if (!data?.products.length) return [];
    const m = new Map<string, ProductRow[]>();
    for (const p of data.products) {
      const key = p.category?.name?.trim() || "Autres";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    }
    return Array.from(m.entries());
  }, [data?.products]);

  const toggleFav = async () => {
    if (!me?.user) {
      toast.error("Connectez-vous pour suivre ce vendeur.");
      return;
    }
    if (!userId) return;
    try {
      if (fav) {
        const r = await fetch(
          `/api/vendor-favorites?sellerUserId=${encodeURIComponent(userId as string)}`,
          { method: "DELETE", credentials: "include" }
        );
        if (!r.ok) throw new Error();
        setFav(false);
        toast.success("Vendeur retiré des favoris");
      } else {
        const r = await fetch("/api/vendor-favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ sellerUserId: userId }),
        });
        if (!r.ok) throw new Error();
        setFav(true);
        toast.success("Vendeur ajouté — utilisé pour les recommandations");
      }
    } catch {
      toast.error("Action impossible");
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-shop-muted">Chargement…</div>;
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-shop-muted">
        Boutique introuvable.
      </div>
    );
  }

  const banner = data.profile.bannerUrl;

  return (
    <div className="min-h-screen bg-shop-bg pb-16">
      <div className="relative h-40 w-full overflow-hidden bg-gradient-to-r from-slate-800 to-slate-900 md:h-52">
        {banner ?
          <Image src={banner} alt="" fill className="object-cover opacity-90" unoptimized />
        : null}
        <div className="absolute inset-0 bg-gradient-to-t from-shop-bg via-transparent to-transparent" />
      </div>
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mt-16 relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <span className="relative size-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
              {data.profile.logoUrl ?
                <Image src={data.profile.logoUrl} alt="" fill className="object-cover" unoptimized />
              : (
                <span className="flex size-full items-center justify-center bg-shop-bg text-shop-muted">
                  <Store className="size-10" />
                </span>
              )}
            </span>
            <div>
              <h1 className="text-3xl font-bold text-shop-navy">{data.profile.shopName}</h1>
              <p className="mt-1 max-w-2xl text-sm text-shop-muted">{data.profile.description}</p>
              <p className="mt-2 text-xs text-shop-muted">
                {data.profile.salesCount ? `${data.profile.salesCount} ventes · ` : null}
                {data.profile.rating > 0 ? `★ ${data.profile.rating.toFixed(1)}` : null}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void toggleFav()}
            className={`inline-flex items-center justify-center gap-2 self-start rounded-xl border px-5 py-2.5 text-sm font-semibold shadow-sm ${
              fav ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-shop-border bg-white text-shop-navy hover:bg-shop-bg"
            }`}
          >
            <Heart className={`size-4 ${fav ? "fill-cyan-600 text-cyan-600" : ""}`} />
            {fav ? "Dans mes favoris" : "Suivre ce vendeur"}
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/categories" className="text-shop-cyan hover:underline">
            ← Catalogue
          </Link>
          <Link href="/vendeurs" className="text-shop-cyan hover:underline">
            Tous les vendeurs
          </Link>
        </div>

        <p className="mt-6 text-xs text-shop-muted">
          Vos visites et favoris vendeurs sont enregistrés pour affiner les recommandations produits (navigation, achats,
          boutiques suivies).
        </p>

        <div className="mt-10 space-y-12">
          {byCategory.map(([catName, items]) => (
            <section key={catName}>
              <h2 className="border-b border-shop-border pb-2 text-lg font-bold text-shop-navy">{catName}</h2>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {items.map((p) => (
                  <ProductCard key={p.id} p={p} placement={`vendor_shop_${userId}`} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
