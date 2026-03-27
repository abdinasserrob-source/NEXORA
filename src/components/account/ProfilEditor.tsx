"use client";

import Image from "next/image";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const PRESETS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `/avatars/preset-${n}.svg`);

export function ProfilEditor() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [uploading, setUploading] = useState(false);

  const initialLetter = ((firstName?.trim()?.[0] ?? lastName?.trim()?.[0] ?? email?.trim()?.[0] ?? "U") as string).toUpperCase();

  const load = useCallback(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const u = d.user;
        if (!u) return;
        setEmail(u.email ?? "");
        setFirstName(u.firstName ?? "");
        setLastName(u.lastName ?? "");
        setPhone(u.phone ?? "");
        setAvatar(u.avatar ?? "");
        setRole(u.role ?? "");
        setUserId(u.id ?? "");
        setCreatedAt(u.createdAt ?? "");
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inp =
    "w-full rounded-xl border border-shop-border bg-shop-bg px-4 py-2.5 text-shop-text outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20";

  const onUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/me/avatar", { method: "POST", body: fd, credentials: "include" });
    setUploading(false);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error(typeof d.error === "string" ? d.error : "Envoi impossible");
      return;
    }
    if (typeof d.avatar === "string") setAvatar(d.avatar);
    toast.success("Photo mise à jour");
    load();
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">Profil</h1>
      <p className="mt-1 text-sm text-shop-muted">
        Photo (fichier ou avatar), e-mail, coordonnées et mot de passe.
      </p>

      <div className="mt-8 rounded-2xl border border-shop-border bg-shop-bg/60 p-4 text-sm">
        <p className="font-medium text-shop-navy">Informations du compte (lecture seule)</p>
        <ul className="mt-2 space-y-1 text-shop-muted">
          <li>
            <span className="text-shop-text">Identifiant :</span> {userId || "—"}
          </li>
          <li>
            <span className="text-shop-text">Rôle :</span> {role || "—"}
          </li>
          <li>
            <span className="text-shop-text">Membre depuis :</span>{" "}
            {createdAt ? new Date(createdAt).toLocaleString("fr-FR") : "—"}
          </li>
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-col items-center gap-3">
          <div className="relative size-28 overflow-hidden rounded-full border border-shop-border bg-shop-bg">
            {avatar ? (
              <Image src={avatar} alt="" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex size-full items-center justify-center text-3xl text-shop-muted">
                {initialLetter}
              </div>
            )}
          </div>
          <label className="w-full max-w-xs cursor-pointer rounded-xl border border-shop-border bg-shop-surface px-4 py-2 text-center text-xs font-medium text-shop-text hover:border-shop-cyan">
            {uploading ? "Envoi…" : "Importer une photo (JPEG, PNG, WebP, max 2 Mo)"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onUpload} />
          </label>
          <p className="text-center text-xs text-shop-muted">Ou choisir un avatar :</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((src) => (
              <button
                key={src}
                type="button"
                className={`relative size-11 overflow-hidden rounded-full border-2 ${
                  avatar === src ? "border-shop-cyan" : "border-transparent"
                }`}
                onClick={() => setAvatar(src)}
              >
                <Image src={src} alt="" fill className="object-cover" unoptimized />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                    {initialLetter}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <label className="text-sm font-medium text-shop-text">E-mail</label>
            <input className={`${inp} mt-1`} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-shop-text">Prénom</label>
              <input className={`${inp} mt-1`} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-shop-text">Nom</label>
              <input className={`${inp} mt-1`} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-shop-text">Téléphone</label>
            <input className={`${inp} mt-1`} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button
            type="button"
            className="rounded-xl bg-shop-cyan px-6 py-2.5 text-sm font-semibold text-white"
            onClick={async () => {
              const r = await fetch("/api/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  firstName,
                  lastName,
                  phone: phone || null,
                  avatar: avatar || "",
                  email,
                }),
              });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) {
                toast.error(typeof d.error === "string" ? d.error : "Enregistrement impossible");
                return;
              }
              toast.success("Profil mis à jour");
              load();
            }}
          >
            Enregistrer le profil
          </button>
        </div>
      </div>

      <section className="mt-12 border-t border-shop-border pt-8">
        <h2 className="text-lg font-semibold text-shop-navy">Changer le mot de passe</h2>
        <p className="mt-1 text-sm text-shop-muted">
          Comptes Google uniquement : utilisez « mot de passe oublié » si besoin.
        </p>
        <div className="mt-4 grid max-w-md gap-3">
          <input
            type="password"
            className={inp}
            placeholder="Mot de passe actuel"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
          <input
            type="password"
            className={inp}
            placeholder="Nouveau mot de passe (6+ caractères)"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          <button
            type="button"
            className="w-fit rounded-xl border border-shop-border bg-shop-surface px-4 py-2 text-sm font-medium"
            onClick={async () => {
              const r = await fetch("/api/me/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
              });
              const d = await r.json().catch(() => ({}));
              if (!r.ok) toast.error(typeof d.error === "string" ? d.error : "Erreur");
              else {
                toast.success("Mot de passe mis à jour");
                setCurrentPw("");
                setNewPw("");
              }
            }}
          >
            Mettre à jour le mot de passe
          </button>
        </div>
      </section>
    </>
  );
}
