"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Profile = {
  shopName: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  shopEmail: string | null;
  shopPhone: string | null;
  shopAddress: string | null;
  shippingPolicy: string | null;
  returnPolicy: string | null;
  operationalStatus: string;
};

export default function VendeurBoutiquePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/seller/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => toast.error("Chargement profil impossible"));
  }, []);

  if (!profile) {
    return (
      <div className="px-4 py-16 text-center text-shop-muted md:px-8">
        Chargement de votre boutique…
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-shop-text">Ma boutique</h1>
      <p className="mt-1 text-sm text-shop-muted">
        Identité, coordonnées professionnelles et politiques affichées côté clients (selon votre intégration
        vitrine).
      </p>
      <p className="mt-2 text-xs text-shop-muted">
        Statut opérationnel :{" "}
        <strong className="text-shop-text">{profile.operationalStatus}</strong>
      </p>

      <form
        className="mt-8 max-w-2xl space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          const r = await fetch("/api/seller/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(profile),
          });
          setSaving(false);
          if (!r.ok) toast.error("Enregistrement impossible");
          else toast.success("Boutique mise à jour");
        }}
      >
        <div>
          <label className="text-sm font-medium text-shop-text">Nom de la boutique</label>
          <input
            required
            className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={profile.shopName}
            onChange={(e) => setProfile({ ...profile, shopName: e.target.value })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">Description</label>
          <textarea
            rows={4}
            className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={profile.description ?? ""}
            onChange={(e) => setProfile({ ...profile, description: e.target.value || null })}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-shop-text">Logo (URL)</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
              value={profile.logoUrl ?? ""}
              onChange={(e) => setProfile({ ...profile, logoUrl: e.target.value || null })}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-shop-text">Bannière (URL)</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
              value={profile.bannerUrl ?? ""}
              onChange={(e) => setProfile({ ...profile, bannerUrl: e.target.value || null })}
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-shop-text">E-mail pro</label>
            <input
              type="email"
              className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
              value={profile.shopEmail ?? ""}
              onChange={(e) => setProfile({ ...profile, shopEmail: e.target.value || null })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-shop-text">Téléphone</label>
            <input
              className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
              value={profile.shopPhone ?? ""}
              onChange={(e) => setProfile({ ...profile, shopPhone: e.target.value || null })}
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">Adresse</label>
          <input
            className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={profile.shopAddress ?? ""}
            onChange={(e) => setProfile({ ...profile, shopAddress: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">Politique de livraison</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={profile.shippingPolicy ?? ""}
            onChange={(e) => setProfile({ ...profile, shippingPolicy: e.target.value || null })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">Politique de retour</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-xl border border-white/10 bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={profile.returnPolicy ?? ""}
            onChange={(e) => setProfile({ ...profile, returnPolicy: e.target.value || null })}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-shop-cyan px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
