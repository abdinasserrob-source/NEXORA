"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, HelpCircle } from "lucide-react";
import toast from "react-hot-toast";

type Overview = {
  users: number;
  orders: number;
  revenue: number;
  products: number;
  pendingSellerApplications: number;
  last30Days: { orders: number; revenue: number; newCustomers: number };
  recentOrders: {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    customer: string;
    productSample: string;
  }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [users, setUsers] = useState<
    { id: string; email: string; role: string; banned: boolean }[]
  >([]);
  const [apps, setApps] = useState<{ id: string; shopName: string; status: string }[]>([]);

  useEffect(() => {
    void fetch("/api/admin/overview", { credentials: "include" })
      .then(async (r) => {
        if (r.status === 403) {
          setForbidden(true);
          return;
        }
        if (!r.ok) {
          toast.error(`Tableau de bord indisponible (${r.status})`);
          return;
        }
        const text = await r.text();
        if (!text.trim()) {
          toast.error("Réponse serveur vide");
          return;
        }
        try {
          setData(JSON.parse(text) as Overview);
        } catch {
          toast.error("Réponse serveur invalide (JSON)");
        }
      })
      .catch(() => toast.error("Erreur réseau (tableau de bord)"));
    void fetch("/api/admin/users", { credentials: "include" }).then((r) =>
      r.ok ? r.json().then((d) => setUsers(d.users ?? [])) : null
    );
    void fetch("/api/admin/applications", { credentials: "include" }).then((r) =>
      r.ok ? r.json().then((d) => setApps(d.applications ?? [])) : null
    );
  }, []);

  if (forbidden) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#f8f9fa] px-4 text-center">
        <p className="text-lg font-semibold text-[#333]">Accès réservé aux administrateurs</p>
        <Link
          href="/connexion?next=/admin"
          className="mt-6 rounded-full bg-[#00d4ff] px-8 py-3 text-sm font-semibold text-white"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#f8f9fa] text-[#888]">
        Chargement du tableau de bord…
      </div>
    );
  }

  const r30 = data.last30Days;
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  return (
    <>
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-[#e8eaef] bg-white px-4 py-4 md:px-8">
          <input
            type="search"
            placeholder="Rechercher utilisateurs, commandes…"
            className="hidden max-w-xl flex-1 rounded-full border border-[#e8eaef] bg-[#f8f9fa] px-5 py-2.5 text-sm md:block"
          />
          <div className="flex items-center gap-2">
            <Link
              href="/admin/notifications"
              className="rounded-full p-2 text-[#666] hover:bg-[#f8f9fa]"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
            </Link>
            <button type="button" className="rounded-full p-2 text-[#666] hover:bg-[#f8f9fa]">
              <HelpCircle className="size-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 md:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#1a2744]">Vue d&apos;ensemble</h1>
            <p className="text-sm text-[#666]">Indicateurs et activité (données réelles de la base).</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Chiffre (30 j.)",
                value: fmt(r30.revenue),
                sub: `+ commandes : ${r30.orders}`,
                color: "bg-[#00d4ff]",
              },
              {
                label: "Commandes (30 j.)",
                value: String(r30.orders),
                sub: `CA total : ${fmt(data.revenue)}`,
                color: "bg-emerald-500",
              },
              {
                label: "Nouveaux clients (30 j.)",
                value: String(r30.newCustomers),
                sub: `Utilisateurs : ${data.users}`,
                color: "bg-orange-400",
              },
              {
                label: "Produits actifs",
                value: String(data.products),
                sub: `Demandes vendeur : ${data.pendingSellerApplications}`,
                color: "bg-violet-500",
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-[#e8eaef] bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-medium text-[#888]">{k.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#333]">{k.value}</p>
                <p className="mt-1 text-xs text-[#666]">{k.sub}</p>
                <div className={`mt-3 h-1.5 rounded-full ${k.color} opacity-70`} />
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-[#e8eaef] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#e8eaef] px-6 py-4">
              <h2 className="font-semibold text-[#333]">Transactions récentes</h2>
              <Link href="/admin/commandes" className="text-sm font-medium text-[#00b8d9]">
                Voir tout
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-[#e8eaef] bg-[#f8f9fa] text-xs uppercase text-[#888]">
                  <tr>
                    <th className="px-6 py-3">Commande</th>
                    <th className="px-6 py-3">Client</th>
                    <th className="px-6 py-3">Produit</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-[#f0f0f0]">
                      <td className="px-6 py-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                      <td className="px-6 py-3">{o.customer}</td>
                      <td className="px-6 py-3 text-[#666]">{o.productSample}</td>
                      <td className="px-6 py-3">{o.status}</td>
                      <td className="px-6 py-3 font-medium">{o.total.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section className="rounded-2xl border border-[#e8eaef] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#333]">Utilisateurs</h2>
              <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto text-sm">
                {users.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {u.email}{" "}
                      <span className="text-[#888]">({u.role})</span>
                    </span>
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#00b8d9]"
                      onClick={() =>
                        void fetch("/api/admin/users", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ userId: u.id, banned: !u.banned }),
                        }).then(() => window.location.reload())
                      }
                    >
                      {u.banned ? "Débannir" : "Bannir"}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-[#e8eaef] bg-white p-6 shadow-sm">
              <h2 className="font-semibold text-[#333]">Demandes vendeur</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {apps.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-2">
                    <span className="flex-1">{a.shopName}</span>
                    <span className="text-[#888]">{a.status}</span>
                    <button
                      type="button"
                      className="text-emerald-600"
                      onClick={() =>
                        void fetch("/api/admin/applications", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ id: a.id, status: "APPROVED", adminNote: "OK" }),
                        }).then(() => {
                          toast.success("Approuvé");
                          window.location.reload();
                        })
                      }
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      className="text-red-500"
                      onClick={() =>
                        void fetch("/api/admin/applications", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            id: a.id,
                            status: "REJECTED",
                            adminNote: "Refus",
                          }),
                        }).then(() => window.location.reload())
                      }
                    >
                      Refus
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
    </>
  );
}
