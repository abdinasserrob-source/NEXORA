"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Addr = {
  id: string;
  label?: string | null;
  recipientName?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  postalCode: string;
  region?: string | null;
  country: string;
  isDefault: boolean;
};

const emptyForm = {
  recipientName: "",
  line1: "",
  city: "",
  postalCode: "",
  country: "France",
  isDefault: false,
};

export default function AdressesPage() {
  const [list, setList] = useState<Addr[]>([]);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    void fetch("/api/addresses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setList(d.addresses ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const inp =
    "w-full rounded-xl border border-shop-border bg-shop-bg px-3 py-2 text-sm text-shop-text outline-none focus:border-shop-cyan";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-shop-navy">Adresses d’expédition</h1>
          <p className="mt-1 text-sm text-shop-muted">Utilisées à la commande pour une livraison fiable.</p>
        </div>
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="rounded-xl bg-shop-cyan px-4 py-2 text-sm font-semibold text-white"
        >
          {show ? "Fermer" : "Ajouter une adresse"}
        </button>
      </div>

      {show && (
        <form
          className="mt-6 grid gap-4 rounded-2xl border border-shop-border bg-shop-bg p-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await fetch("/api/addresses", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                recipientName: form.recipientName,
                line1: form.line1,
                city: form.city,
                postalCode: form.postalCode,
                country: form.country.trim(),
                isDefault: form.isDefault,
              }),
            });
            const ct = r.headers.get("content-type") ?? "";
            const raw = await r.text();
            let d: { error?: string } = {};
            if (ct.includes("application/json") && raw.trim()) {
              try {
                d = JSON.parse(raw) as { error?: string };
              } catch {
                d = {};
              }
            }
            if (!r.ok) {
              toast.error(
                typeof d.error === "string" && d.error
                  ? d.error
                  : `Impossible d’ajouter (${r.status}).`
              );
              return;
            }
            toast.success("Adresse ajoutée");
            setShow(false);
            setForm(emptyForm);
            load();
          }}
        >
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-shop-text">Nom du destinataire *</span>
            <input
              className={inp}
              required
              minLength={2}
              autoComplete="name"
              placeholder="Prénom et nom"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-shop-text">Rue — numéro et voie *</span>
            <input
              className={inp}
              required
              minLength={2}
              autoComplete="address-line1"
              placeholder="ex. 12 rue de la République"
              value={form.line1}
              onChange={(e) => setForm({ ...form, line1: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-shop-text">Code postal *</span>
            <input
              className={inp}
              required
              minLength={3}
              autoComplete="postal-code"
              placeholder="ex. 75001"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            />
            <span className="mt-1 block text-xs text-shop-muted">
              Incluez le code postal pour une livraison précise.
            </span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-shop-text">Nom de la ville *</span>
            <input
              className={inp}
              required
              autoComplete="address-level2"
              placeholder="ex. Paris"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <span className="mt-1 block text-xs text-shop-muted">Mentionnez la ville de livraison.</span>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-shop-text">Nom du pays *</span>
            <input
              className={inp}
              required
              minLength={2}
              maxLength={120}
              autoComplete="country-name"
              placeholder="ex. France, Belgique, Canada…"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
            <span className="mt-1 block text-xs text-shop-muted">
              Indiquez le nom du pays de destination.
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Définir comme adresse par défaut
          </label>
          <button
            type="submit"
            className="rounded-xl bg-shop-navy py-2.5 text-sm font-semibold text-white sm:col-span-2"
          >
            Enregistrer
          </button>
        </form>
      )}

      <ul className="mt-8 space-y-3">
        {list.length === 0 && <li className="text-sm text-shop-muted">Aucune adresse enregistrée.</li>}
        {list.map((a) => (
          <li key={a.id} className="rounded-2xl border border-shop-border bg-shop-bg px-4 py-3 text-sm">
            {a.isDefault && (
              <span className="mb-1 inline-block rounded-full bg-shop-cyan/15 px-2 py-0.5 text-xs font-medium text-shop-cyan">
                Par défaut
              </span>
            )}
            <p className="font-medium text-shop-text">Adresse de livraison</p>
            <div className="mt-1 space-y-0.5 text-shop-muted">
              {a.recipientName && (
                <p className="font-medium text-shop-text">{a.recipientName}</p>
              )}
              <p>{a.line1}</p>
              {a.line2 ? <p>{a.line2}</p> : null}
              <p>
                {a.postalCode} {a.city}
                {a.region ? `, ${a.region}` : ""}, {a.country}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
