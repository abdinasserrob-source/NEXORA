"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type AppRow = {
  id: string;
  shopName: string;
  status: string;
  shopEmail: string | null;
  shopPhone: string | null;
  shopAddress: string | null;
};

type SellerRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  sellerProfile: {
    shopName: string;
    approved: boolean;
    operationalStatus: string;
  } | null;
};

export default function AdminVendeursPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [err, setErr] = useState(false);

  useEffect(() => {
    void fetch("/api/admin/applications", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = await r.json();
      setApps(d.applications ?? []);
    });
    void fetch("/api/admin/sellers", { credentials: "include" }).then(async (r) => {
      if (!r.ok) return;
      const d = await r.json();
      setSellers(d.sellers ?? []);
    });
  }, []);

  if (err) {
    return (
      <main className="p-8 text-center text-[#666]">
        Accès refusé.{" "}
        <Link href="/connexion?next=/admin/vendeurs" className="text-[#00b8d9]">
          Connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Vendeurs</h1>
      <p className="text-sm text-[#666]">Demandes d&apos;ouverture et statut opérationnel des boutiques.</p>

      <section className="mt-8">
        <h2 className="font-semibold text-[#333]">Demandes en cours</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {apps.length === 0 && <li className="text-[#888]">Aucune demande listée.</li>}
          {apps.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-2 rounded-xl border border-[#e8eaef] bg-white px-4 py-3 md:flex-row md:flex-wrap md:items-center"
            >
              <span className="flex-1 font-medium">{a.shopName}</span>
              <span className="text-[#888]">{a.status}</span>
              {(a.shopEmail || a.shopPhone) && (
                <span className="text-xs text-[#666]">
                  {a.shopEmail}
                  {a.shopPhone ? ` · ${a.shopPhone}` : ""}
                </span>
              )}
              <div className="flex gap-2">
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
                  Approuver
                </button>
                <button
                  type="button"
                  className="text-red-500"
                  onClick={() =>
                    void fetch("/api/admin/applications", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ id: a.id, status: "REJECTED", adminNote: "Refus" }),
                    }).then(() => window.location.reload())
                  }
                >
                  Refuser
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold text-[#333]">Comptes vendeur</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {sellers.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-xl border border-[#e8eaef] bg-white px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <Link href={`/boutique/${s.id}`} className="text-[#00b8d9] hover:underline">
                  {s.email}
                </Link>
                <span className="ml-2 text-[#888]">
                  {s.firstName} {s.lastName}
                </span>
                {s.sellerProfile ?
                  <p className="mt-1 text-xs text-[#666]">
                    {s.sellerProfile.shopName} —{" "}
                    <strong>{s.sellerProfile.operationalStatus}</strong>
                    {s.sellerProfile.approved ? "" : " (non approuvé)"}
                  </p>
                : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-[#666]">Statut</label>
                <select
                  className="rounded-lg border border-[#e8eaef] px-2 py-1 text-xs"
                  value={s.sellerProfile?.operationalStatus ?? "ACTIVE"}
                  onChange={(e) => {
                    const operationalStatus = e.target.value;
                    void fetch("/api/admin/sellers", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ userId: s.id, operationalStatus }),
                    }).then(async (r) => {
                      if (!r.ok) toast.error("Mise à jour impossible");
                      else {
                        toast.success("Statut mis à jour");
                        setSellers((prev) =>
                          prev.map((x) =>
                            x.id === s.id && x.sellerProfile ?
                              {
                                ...x,
                                sellerProfile: { ...x.sellerProfile, operationalStatus },
                              }
                            : x
                          )
                        );
                      }
                    });
                  }}
                >
                  <option value="ACTIVE">Actif</option>
                  <option value="SUSPENDED">Suspendu</option>
                  <option value="BLOCKED">Bloqué</option>
                </select>
                <button
                  type="button"
                  className="ml-2 text-xs font-semibold text-red-600"
                  onClick={async () => {
                    const ok = window.confirm(
                      `Supprimer définitivement le vendeur ${s.email} ?\n\nAstuce: si ça échoue à cause de données liées, utilisez plutôt "Suspendu/Bloqué".`
                    );
                    if (!ok) return;
                    const r = await fetch("/api/admin/sellers", {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ userId: s.id }),
                    });
                    const d = await r.json().catch(() => ({}));
                    if (!r.ok) {
                      toast.error(typeof d.error === "string" ? d.error : "Suppression impossible");
                      return;
                    }
                    toast.success("Vendeur supprimé");
                    setSellers((prev) => prev.filter((x) => x.id !== s.id));
                  }}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
