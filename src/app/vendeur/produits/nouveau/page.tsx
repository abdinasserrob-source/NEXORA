"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Camera } from "lucide-react";

type Cat = { id: string; name: string; children?: Cat[] };

function flattenCategories(nodes: Cat[], prefix = ""): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const label = prefix ? `${prefix} › ${n.name}` : n.name;
    out.push({ id: n.id, label });
    if (n.children?.length) out.push(...flattenCategories(n.children, label));
  }
  return out;
}

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "produit"}-${Date.now().toString(36)}`;
}

export default function NouveauProduitPage() {
  const router = useRouter();
  const [cats, setCats] = useState<{ id: string; label: string }[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(9.99);
  const [stock, setStock] = useState(10);
  const [categoryId, setCategoryId] = useState("");
  const [imagesRaw, setImagesRaw] = useState("https://");
  const [tagsRaw, setTagsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCats(flattenCategories(d.categories ?? [])));
  }, []);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/seller/upload", {
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
        setImagesRaw((prev) => {
          const cur = prev.trim();
          if (!cur || cur === "https://") return d.url;
          return `${cur}\n${d.url}`;
        });
        toast.success("Image importée");
      } else {
        toast.error("Upload: réponse invalide");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Ajouter un produit</h1>
      <p className="mt-1 text-sm text-[#666]">
        Le slug est généré automatiquement. Le produit sera soumis à validation admin avant publication.
      </p>

      <form
        className="mt-6 max-w-4xl rounded-2xl border border-[#e8eaef] bg-white p-4 md:p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!categoryId) {
            toast.error("Choisissez une catégorie");
            return;
          }
          const images = imagesRaw
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          if (images.length === 0) {
            toast.error("Au moins une image (URL)");
            return;
          }
          const tags = tagsRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          setSubmitting(true);
          const r = await fetch("/api/seller/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name,
              slug: slugify(name),
              description,
              price,
              stock,
              categoryId,
              images,
              tags,
            }),
          });
          setSubmitting(false);
          const d = await r.json().catch(() => ({}));
          if (!r.ok) {
            toast.error(typeof d.error === "string" ? d.error : "Création impossible");
            return;
          }
          toast.success("Produit soumis. En attente de validation admin.");
          router.push("/vendeur/produits");
        }}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-[#555]">
            Nom *
            <input
              required
              minLength={2}
              className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00d4ff]/30"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#555]">
            Slug (auto)
            <input
              readOnly
              className="rounded-xl border border-[#e8eaef] bg-[#f8f9fa] px-3 py-2 text-sm text-[#555]"
              value={slugify(name)}
            />
          </label>

          <label className="md:col-span-2 grid gap-1 text-xs font-semibold text-[#555]">
            Description * (10 car. min.)
            <textarea
              required
              minLength={10}
              rows={4}
              className="min-h-[110px] rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00d4ff]/30"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold text-[#555]">
            Prix (EUR) *
            <input
              type="number"
              required
              min={0.01}
              step="0.01"
              className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00d4ff]/30"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#555]">
            Stock *
            <input
              type="number"
              required
              min={0}
              className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00d4ff]/30"
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
            />
          </label>

          <label className="grid gap-1 text-xs font-semibold text-[#555]">
            Catégorie *
            <select
              required
              className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00d4ff]/30"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">—</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs font-semibold text-[#555]">
            Tags (virgules)
            <input
              className="rounded-xl border border-[#e8eaef] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#00d4ff]/30"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="cuisine, knife, inox"
            />
          </label>

          <label className="md:col-span-2 grid gap-1 text-xs font-semibold text-[#555]">
            Images (URLs, une par ligne) *
            <div className="flex items-stretch gap-2">
              <textarea
                rows={3}
                className="min-w-0 flex-1 rounded-xl border border-[#e8eaef] bg-white px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-[#00d4ff]/30"
                value={imagesRaw}
                onChange={(e) => setImagesRaw(e.target.value)}
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

        <div className="mt-4 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-[#00d4ff] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Soumission..." : "Soumettre pour validation"}
          </button>
          <Link
            href="/vendeur/produits"
            className="rounded-xl border border-[#e8eaef] bg-white px-4 py-2 text-sm font-semibold text-[#555]"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
