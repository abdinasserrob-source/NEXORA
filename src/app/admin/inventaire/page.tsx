"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Camera } from "lucide-react";

type Row = {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isFlagged: boolean;
  isPromo: boolean;
  comparePrice: number | null;
  promoPercent: number | null;
  promoAmount: number | null;
  badge: string | null;
  sellerLabel: string;
};

type Meta = {
  categories: { id: string; name: string; slug: string; parentId: string | null }[];
  brands: { id: string; name: string; slug: string }[];
  sellers: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    sellerProfile: { shopName: string; approved: boolean; operationalStatus: string } | null;
  }[];
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminInventairePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    price: 0,
    stock: 0,
    categoryId: "",
    sellerId: "",
    brandId: "",
    imageUrl: "",
  });
  const [drafts, setDrafts] = useState<
    Record<
      string,
      {
        price: number;
        stock: number;
        isFlagged: boolean;
        badge: string | null;
        isPromo: boolean;
        comparePrice: number | null;
        promoPercent: number | null;
        promoAmount: number | null;
      }
    >
  >({});

  useEffect(() => {
    void fetch("/api/admin/products", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = await r.json();
      const list = d.products ?? [];
      setRows(list);
      const next: typeof drafts = {};
      for (const p of list) {
        next[p.id] = {
          price: p.price ?? 0,
          stock: p.stock ?? 0,
          isFlagged: p.isFlagged ?? false,
          badge: p.badge ?? null,
          isPromo: p.isPromo ?? false,
          comparePrice: p.comparePrice ?? null,
          promoPercent: p.promoPercent ?? null,
          promoAmount: p.promoAmount ?? null,
        };
      }
      setDrafts(next);
    });
  }, []);

  const openCreate = async () => {
    setShowCreate(true);
    if (meta) return;
    const r = await fetch("/api/admin/products/meta", { credentials: "include" });
    const d = (await r.json().catch(() => null)) as Meta | null;
    if (!r.ok || !d) {
      toast.error("Impossible de charger catégories / vendeurs / marques.");
      return;
    }
    setMeta(d);
    const firstCat = d.categories[0]?.id ?? "";
    const firstSeller = d.sellers[0]?.id ?? "";
    setForm((f) => ({ ...f, categoryId: f.categoryId || firstCat, sellerId: f.sellerId || firstSeller }));
  };

  const submitCreate = async () => {
    if (!meta) return;
    const name = form.name.trim();
    const description = form.description.trim();
    const imageUrl = form.imageUrl.trim();
    if (!name || !description || !imageUrl || !form.categoryId || !form.sellerId) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }
    setCreating(true);
    const payload = {
      name,
      slug: form.slug.trim() ? form.slug.trim() : slugify(name),
      description,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      categoryId: form.categoryId,
      sellerId: form.sellerId,
      brandId: form.brandId ? form.brandId : null,
      imageUrl,
    };
    const r = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      setCreating(false);
      toast.error(typeof body.error === "string" ? body.error : "Création impossible");
      return;
    }
    toast.success("Produit créé");
    setCreating(false);
    setShowCreate(false);
    setForm({
      name: "",
      slug: "",
      description: "",
      price: 0,
      stock: 0,
      categoryId: meta.categories[0]?.id ?? "",
      sellerId: meta.sellers[0]?.id ?? "",
      brandId: "",
      imageUrl: "",
    });
    const rr = await fetch("/api/admin/products", { credentials: "include" });
    const dd = await rr.json().catch(() => ({}));
    const list = dd.products ?? [];
    setRows(list);
    const next: typeof drafts = {};
    for (const p of list) {
      next[p.id] = {
        price: p.price ?? 0,
        stock: p.stock ?? 0,
        isFlagged: p.isFlagged ?? false,
        badge: p.badge ?? null,
        isPromo: p.isPromo ?? false,
        comparePrice: p.comparePrice ?? null,
        promoPercent: p.promoPercent ?? null,
        promoAmount: p.promoAmount ?? null,
      };
    }
    setDrafts(next);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/upload", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(typeof d.error === "string" ? d.error : "Upload impossible");
        return;
      }
      if (typeof d.url === "string") {
        setForm((f) => ({ ...f, imageUrl: d.url }));
        toast.success("Image importée");
      } else {
        toast.error("Upload: réponse invalide");
      }
    } finally {
      setUploading(false);
    }
  };

  if (err) {
    return (
      <main className="p-8 text-center text-[#666]">
        Accès refusé ou erreur de chargement.{" "}
        <Link href="/connexion?next=/admin/inventaire" className="text-[#00b8d9]">
          Connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-x-auto px-4 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">Inventaire</h1>
          <p className="text-sm text-[#666]">
            Prix vente = montant payé ; prix barré = ancien prix affiché barré si supérieur au prix vente (ex. 300 € /{" "}
            <span className="line-through">499 €</span>).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void openCreate()}
          className="rounded-xl bg-[#00d4ff] px-4 py-2 text-sm font-semibold text-white"
        >
          Ajouter un produit
        </button>
      </div>

      {showCreate ? (
        <div className="mt-6 rounded-2xl border border-[#e8eaef] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-[#1a2744]">Nouveau produit</h2>
            <button
              type="button"
              className="text-sm font-semibold text-[#666] hover:text-[#333]"
              onClick={() => setShowCreate(false)}
            >
              Fermer
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold text-[#555]">
              Nom *
              <input
                className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value, slug: f.slug || slugify(e.target.value) }))
                }
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[#555]">
              Slug (auto)
              <input
                className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="ex: iphone-15-pro"
              />
            </label>
            <label className="md:col-span-2 grid gap-1 text-xs font-semibold text-[#555]">
              Description *
              <textarea
                className="min-h-[90px] rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </label>

            <label className="grid gap-1 text-xs font-semibold text-[#555]">
              Prix (EUR) *
              <input
                className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                type="number"
                step="0.01"
                min={0}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-[#555]">
              Stock *
              <input
                className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
              />
            </label>

            <label className="grid gap-1 text-xs font-semibold text-[#555]">
              Catégorie *
              <select
                className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                {(meta?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-semibold text-[#555]">
              Vendeur *
              <select
                className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                value={form.sellerId}
                onChange={(e) => setForm((f) => ({ ...f, sellerId: e.target.value }))}
              >
                {(meta?.sellers ?? []).map((s) => {
                  const label =
                    s.sellerProfile?.shopName ||
                    [s.firstName, s.lastName].filter(Boolean).join(" ") ||
                    s.email;
                  return (
                    <option key={s.id} value={s.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="grid gap-1 text-xs font-semibold text-[#555]">
              Marque (optionnel)
              <select
                className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                value={form.brandId}
                onChange={(e) => setForm((f) => ({ ...f, brandId: e.target.value }))}
              >
                <option value="">— Aucune —</option>
                {(meta?.brands ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="md:col-span-2 grid gap-1 text-xs font-semibold text-[#555]">
              Image (URL) *
              <div className="flex items-stretch gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm"
                  value={form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://... ou /uploads/..."
                />
                <label
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#e8eaef] bg-white px-3 text-[#555] hover:bg-[#f8f9fa]"
                  title="Importer une image depuis le PC"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadImage(f);
                    }}
                    disabled={uploading}
                  />
                  <Camera className="size-4" />
                </label>
              </div>
              {uploading ? <span className="text-[11px] font-normal text-[#888]">Upload en cours…</span> : null}
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={() => void submitCreate()}
              className="rounded-xl bg-[#00d4ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {creating ? "Création…" : "Créer"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-xl border border-[#e8eaef] bg-white px-4 py-2 text-sm font-semibold text-[#555]"
            >
              Annuler
            </button>
          </div>

          <p className="mt-3 text-xs text-[#888]">
            Question rapide : <b>la marque est optionnelle</b> dans Nexora (champ <code>brandId</code>).
          </p>
        </div>
      ) : null}

      <table className="mt-6 w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-[#e8eaef] bg-[#f8f9fa] text-xs uppercase text-[#888]">
          <tr>
            <th className="px-3 py-2">Produit</th>
            <th className="px-3 py-2">Vendeur</th>
            <th className="px-3 py-2">Prix vente EUR</th>
            <th className="px-3 py-2">Stock</th>
            <th className="px-3 py-2">Statut</th>
            <th className="px-3 py-2">Badge</th>
            <th className="px-3 py-2">Promotion</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-[#f2f2f2]">
              <td className="px-3 py-2">
                <Link href={`/produit/${p.slug}`} className="font-medium text-[#00b8d9] hover:underline">
                  {p.name}
                </Link>
              </td>
              <td className="px-3 py-2 text-[#555]">{p.sellerLabel}</td>
              <td className="px-3 py-2">
                <input
                  className="w-24 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  type="number"
                  step="0.01"
                  min={0}
                  value={drafts[p.id]?.price ?? p.price}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDrafts((m) => {
                      const cur =
                        m[p.id] ?? {
                          price: p.price,
                          stock: p.stock,
                          isFlagged: p.isFlagged,
                          badge: p.badge,
                          isPromo: p.isPromo,
                          comparePrice: p.comparePrice,
                          promoPercent: p.promoPercent,
                          promoAmount: p.promoAmount,
                        };
                      return { ...m, [p.id]: { ...cur, price: Number.isNaN(v) ? 0 : v } };
                    });
                  }}
                />
              </td>
              <td className="px-3 py-2">
                <input
                  className="w-24 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  type="number"
                  min={0}
                  value={drafts[p.id]?.stock ?? p.stock}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDrafts((m) => {
                      const cur =
                        m[p.id] ?? {
                          price: p.price,
                          stock: p.stock,
                          isFlagged: p.isFlagged,
                          badge: p.badge,
                          isPromo: p.isPromo,
                          comparePrice: p.comparePrice,
                          promoPercent: p.promoPercent,
                          promoAmount: p.promoAmount,
                        };
                      return { ...m, [p.id]: { ...cur, stock: Number.isNaN(v) ? 0 : v } };
                    });
                  }}
                />
              </td>
              <td className="px-3 py-2">
                <select
                  className="w-28 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  value={drafts[p.id]?.isFlagged ? "FLAGGED" : "OK"}
                  onChange={(e) =>
                    setDrafts((m) => {
                      const cur =
                        m[p.id] ?? {
                          price: p.price,
                          stock: p.stock,
                          isFlagged: p.isFlagged,
                          badge: p.badge,
                          isPromo: p.isPromo,
                          comparePrice: p.comparePrice,
                          promoPercent: p.promoPercent,
                          promoAmount: p.promoAmount,
                        };
                      return { ...m, [p.id]: { ...cur, isFlagged: e.target.value === "FLAGGED" } };
                    })
                  }
                >
                  <option value="OK">Actif</option>
                  <option value="FLAGGED">Signalé</option>
                </select>
              </td>
              <td className="px-3 py-2">
                <select
                  className="w-28 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                  value={drafts[p.id]?.badge ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDrafts((m) => {
                      const cur =
                        m[p.id] ?? {
                          price: p.price,
                          stock: p.stock,
                          isFlagged: p.isFlagged,
                          badge: p.badge,
                          isPromo: p.isPromo,
                          comparePrice: p.comparePrice,
                          promoPercent: p.promoPercent,
                          promoAmount: p.promoAmount,
                        };
                      return { ...m, [p.id]: { ...cur, badge: v ? v : null } };
                    });
                  }}
                >
                  <option value="">—</option>
                  <option value="bestseller">Best-seller</option>
                  <option value="new">Nouveau</option>
                </select>
              </td>
              <td className="px-3 py-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={drafts[p.id]?.isPromo ?? p.isPromo}
                    onChange={(e) =>
                      setDrafts((m) => {
                        const cur =
                          m[p.id] ?? {
                            price: p.price,
                            stock: p.stock,
                            isFlagged: p.isFlagged,
                            badge: p.badge,
                            isPromo: p.isPromo,
                            comparePrice: p.comparePrice,
                            promoPercent: p.promoPercent,
                            promoAmount: p.promoAmount,
                          };
                        return { ...m, [p.id]: { ...cur, isPromo: e.target.checked } };
                      })
                    }
                  />
                  <span className="text-xs text-[#666]">Promo</span>
                </label>
                <div className="mt-2">
                  <input
                    className="w-28 rounded-xl border border-[#e8eaef] bg-white/90 px-2 py-1 text-sm"
                    type="number"
                    step="0.01"
                    min={0}
                    title="Ancien prix (affiché barré s'il est supérieur au prix vente)"
                    placeholder="Barré ex. 499"
                    value={drafts[p.id]?.comparePrice ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const v = raw === "" ? null : Number(raw);
                      setDrafts((m) => {
                        const cur =
                          m[p.id] ?? {
                            price: p.price,
                            stock: p.stock,
                            isFlagged: p.isFlagged,
                            badge: p.badge,
                            isPromo: p.isPromo,
                            comparePrice: p.comparePrice,
                            promoPercent: p.promoPercent,
                            promoAmount: p.promoAmount,
                          };
                        return { ...m, [p.id]: { ...cur, comparePrice: v } };
                      });
                    }}
                  />
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl bg-[#00d4ff] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    disabled={savingId === p.id}
                    onClick={async () => {
                    const d = drafts[p.id] ?? {
                      price: p.price ?? 0,
                      stock: p.stock ?? 0,
                      isFlagged: p.isFlagged ?? false,
                      badge: p.badge ?? null,
                      isPromo: p.isPromo ?? false,
                      comparePrice: p.comparePrice ?? null,
                      promoPercent: p.promoPercent ?? null,
                      promoAmount: p.promoAmount ?? null,
                    };
                    setSavingId(p.id);
                    const r = await fetch(`/api/admin/products/${p.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        price: d.price,
                        stock: d.stock,
                        isFlagged: d.isFlagged,
                        badge: d.badge,
                        isPromo: d.isPromo,
                        comparePrice: d.comparePrice,
                        promoPercent: d.promoPercent,
                        promoAmount: d.promoAmount,
                      }),
                    });
                    const errBody = await r.json().catch(() => ({}));
                    if (!r.ok) {
                      setSavingId(null);
                      const msg =
                        typeof errBody.error === "string"
                          ? errBody.error
                          : "Enregistrement refusé (vérifiez d’être connecté en admin).";
                      toast.error(msg);
                      return;
                    }
                    setSavingId(null);
                    toast.success("Produit mis à jour");
                    const rr = await fetch("/api/admin/products", { credentials: "include" });
                    const dd = await rr.json().catch(() => ({}));
                    const list = dd.products ?? [];
                    setRows(list);
                    const next: typeof drafts = {};
                    for (const p of list) {
                      next[p.id] = {
                        price: p.price ?? 0,
                        stock: p.stock ?? 0,
                        isFlagged: p.isFlagged ?? false,
                        badge: p.badge ?? null,
                        isPromo: p.isPromo ?? false,
                        comparePrice: p.comparePrice ?? null,
                        promoPercent: p.promoPercent ?? null,
                        promoAmount: p.promoAmount ?? null,
                      };
                    }
                    setDrafts(next);
                  }}
                  >
                    {savingId === p.id ? "…" : "Enregistrer"}
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-[#e8eaef] bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-[#f8f9fa]"
                    onClick={async () => {
                      const ok = window.confirm(`Supprimer définitivement "${p.name}" ?`);
                      if (!ok) return;
                      const r = await fetch(`/api/admin/products/${p.id}`, {
                        method: "DELETE",
                        credentials: "include",
                      });
                      const d = await r.json().catch(() => ({}));
                      if (!r.ok) {
                        toast.error(typeof d.error === "string" ? d.error : "Suppression impossible");
                        return;
                      }
                      toast.success("Produit supprimé");
                      setRows((prev) => prev.filter((x) => x.id !== p.id));
                      setDrafts((m) => {
                        const copy = { ...m };
                        delete copy[p.id];
                        return copy;
                      });
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
