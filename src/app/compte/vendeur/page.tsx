"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function DevenirVendeurPage() {
  const [role, setRole] = useState<string>("");
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [documentNote, setDocumentNote] = useState("");
  const [pending, setPending] = useState<{ shopName: string } | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setRole(d.user?.role ?? "");
        if (d.user?.pendingSellerApplication) {
          setPending({ shopName: d.user.pendingSellerApplication.shopName });
        }
      });
  }, []);

  if (role === "SELLER" || role === "ADMIN") {
    return (
      <>
        <h1 className="text-2xl font-bold text-shop-navy">Espace vendeur</h1>
        <p className="mt-2 text-sm text-shop-muted">Votre compte est déjà vendeur ou administrateur.</p>
        <a href="/vendeur" className="mt-4 inline-block text-shop-cyan font-medium">
          Ouvrir le tableau de bord vendeur →
        </a>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Commencer à vendre</h1>
      <p className="mt-2 text-sm text-shop-muted">
        Remplissez la fiche ci-dessous. Un <strong>e-mail de confirmation</strong> vous est envoyé, et l’
        <strong>administrateur</strong> reçoit une demande à traiter. Vous serez informé par{" "}
        <strong>e-mail et notification</strong> en cas d’approbation ou de refus.
      </p>

      {pending && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Demande en cours pour « <strong>{pending.shopName}</strong> » — en attente de validation.
        </div>
      )}

      <form
        className="mt-8 max-w-xl space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await fetch("/api/seller/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              shopName,
              description,
              shopEmail: shopEmail.trim() || undefined,
              shopPhone: shopPhone.trim() || undefined,
              shopAddress: shopAddress.trim() || undefined,
              documentNote: documentNote.trim() || undefined,
            }),
          });
          const d = await r.json().catch(() => ({}));
          if (!r.ok) toast.error(typeof d.error === "string" ? d.error : "Envoi impossible");
          else {
            toast.success("Demande envoyée — vérifiez votre boîte mail");
            setPending({ shopName });
          }
        }}
      >
        <div>
          <label className="text-sm font-medium text-shop-text">Nom de la boutique *</label>
          <input
            required
            minLength={2}
            className="mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">Description de la boutique * (10 caractères min.)</label>
          <textarea
            required
            minLength={10}
            rows={5}
            className="mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Produits proposés, expérience, délais d’expédition…"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">E-mail professionnel</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={shopEmail}
            onChange={(e) => setShopEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">Téléphone</label>
          <input
            className="mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={shopPhone}
            onChange={(e) => setShopPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">Adresse</label>
          <input
            className="mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={shopAddress}
            onChange={(e) => setShopAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-shop-text">Justificatif (référence / note)</label>
          <input
            className="mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-4 py-2.5 outline-none focus:border-shop-cyan"
            value={documentNote}
            onChange={(e) => setDocumentNote(e.target.value)}
            placeholder="Ex. n° SIRET, lien document (simulation)"
          />
        </div>
        <button type="submit" className="rounded-xl bg-shop-cyan px-6 py-3 font-semibold text-white">
          Envoyer la demande
        </button>
      </form>
    </>
  );
}
