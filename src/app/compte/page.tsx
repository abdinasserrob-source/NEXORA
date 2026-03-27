"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";

type Me = {
  user: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    loyaltyPoints: number;
    chatbotPremium: boolean;
    pendingSellerApplication?: { shopName: string; status: string } | null;
  } | null;
};

export default function AccountDashboardPage() {
  const [data, setData] = useState<Me | null>(null);
  const [orders, setOrders] = useState<
    { id: string; total: number; status: string; createdAt: string; trackingNumber?: string | null }[]
  >([]);
  const [reco, setReco] = useState<Parameters<typeof ProductCard>[0]["p"][]>([]);
  const [wishCount, setWishCount] = useState(0);

  useEffect(() => {
    const parseJson = async <T,>(r: Response, fallback: T): Promise<T> => {
      const ct = r.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) return fallback;
      const text = await r.text();
      if (!text.trim()) return fallback;
      try {
        return JSON.parse(text) as T;
      } catch {
        return fallback;
      }
    };

    void fetch("/api/auth/me", { credentials: "include" }).then(async (r) =>
      setData(await parseJson(r, { user: null }))
    );
    void fetch("/api/orders", { credentials: "include" }).then(async (r) => {
      const d = await parseJson<{ orders?: unknown[] }>(r, { orders: [] });
      setOrders(Array.isArray(d.orders) ? (d.orders as typeof orders) : []);
    });
    void fetch("/api/recommendations?placement=HOME&record=0", { credentials: "include" }).then(
      async (r) => {
        const d = await parseJson<{ recommendations?: Parameters<typeof ProductCard>[0]["p"][] }>(
          r,
          { recommendations: [] }
        );
        setReco((d.recommendations ?? []).slice(0, 6));
      }
    );
    void fetch("/api/wishlist", { credentials: "include" }).then(async (r) => {
      const d = await parseJson<{ items?: unknown[] }>(r, { items: [] });
      setWishCount(Array.isArray(d.items) ? d.items.length : 0);
    });
  }, []);

  if (!data?.user) return null;

  const u = data.user;
  const display =
    [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.email.split("@")[0];
  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;
  const latest = orders[0];

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy md:text-3xl">
        Bon retour, {display}{" "}
        <span className="inline-block" aria-hidden>
          
        </span>
      </h1>
      <p className="mt-2 text-sm text-shop-muted">
        {activeOrders > 0
          ? `Vous avez ${activeOrders} commande${activeOrders > 1 ? "s" : ""} en cours.`
          : "Explorez les nouveautés et vos recommandations personnalisées."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { n: orders.length, l: "Commandes totales" },
          { n: u.loyaltyPoints, l: "Points fidélité" },
          { n: "—", l: "Coupons actifs" },
          { n: wishCount, l: "Favoris" },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-2xl border border-shop-border bg-shop-bg px-4 py-4 text-center shadow-sm"
          >
            <p className="text-2xl font-bold text-shop-navy">{s.n}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-shop-muted">{s.l}</p>
          </div>
        ))}
      </div>

      {latest && (
        <section className="mt-10 rounded-2xl border border-shop-border bg-shop-bg p-6">
          <h2 className="text-lg font-semibold text-shop-navy">Suivi de commande</h2>
          <p className="mt-1 text-sm text-shop-muted">
            Commande du {new Date(latest.createdAt).toLocaleDateString("fr-FR")} —{" "}
            <span className="font-medium text-shop-text">{latest.status}</span>
            {latest.trackingNumber && (
              <>
                {" "}
                · Suivi : <span className="text-shop-cyan">{latest.trackingNumber}</span>
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/compte/commandes"
              className="text-sm font-medium text-shop-cyan hover:underline"
            >
              Voir toutes les commandes
            </Link>
            <span className="text-shop-border">|</span>
            <Link href="/suivi" className="text-sm font-medium text-shop-cyan hover:underline">
              Page suivi colis
            </Link>
          </div>
        </section>
      )}

      {u.pendingSellerApplication && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Demande vendeur « {u.pendingSellerApplication.shopName} » : <strong>en attente</strong> de
          validation admin. Vous serez notifié par e-mail.
        </div>
      )}

      {reco.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-shop-navy">Recommandé pour vous</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {reco.map((p) => (
              <ProductCard key={p.id} p={p} placement="HOME" />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
