"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type ReviewRow = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reportCount: number;
  product: { id: string; name: string; slug: string };
  user: { id: string; email: string; name: string | null; firstName: string | null; lastName: string | null; avatar: string | null };
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [forbidden, setForbidden] = useState(false);

  const load = () => {
    void fetch("/api/admin/reviews", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) setForbidden(true);
        return;
      }
      const d = await r.json().catch(() => ({}));
      setReviews(d.reviews ?? []);
    });
  };

  useEffect(() => {
    load();
  }, []);

  if (forbidden) {
    return (
      <main className="flex-1 px-4 py-12 md:px-8">
        <p className="text-center text-sm text-[#666]">Accès refusé.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-x-auto px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Avis signalés</h1>
      <p className="mt-1 text-sm text-[#666]">
        Les avis signalés par les utilisateurs. L&apos;admin peut les supprimer.
      </p>

      <div className="mt-6 max-w-5xl space-y-4">
        {reviews.length === 0 && (
          <div className="rounded-2xl border border-[#e8eaef] bg-white p-6 text-sm text-[#888]">
            Aucun avis signalé pour le moment.
          </div>
        )}

        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl border border-[#e8eaef] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#333]">
                  Produit :{" "}
                  <Link href={`/produit/${r.product.slug}`} className="text-[#00b8d9] hover:underline">
                    {r.product.name}
                  </Link>
                </p>
                <p className="mt-1 text-xs text-[#888]">
                  Utilisateur : {r.user.name ?? [r.user.firstName, r.user.lastName].filter(Boolean).join(" ") ?? r.user.email}
                </p>
                <p className="mt-2 text-sm text-[#555]">
                  <span className="font-semibold text-[#1a2744]">{r.rating}/5</span> — {r.comment}
                </p>
                <p className="mt-2 text-xs text-[#aaa]">
                  Signalé {r.reportCount} fois · {new Date(r.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>

              <button
                type="button"
                className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                onClick={() => {
                  void fetch(`/api/admin/reviews/${encodeURIComponent(r.id)}`, {
                    method: "DELETE",
                    credentials: "include",
                  }).then((res) => {
                    if (!res.ok) toast.error("Suppression impossible");
                    else {
                      toast.success("Avis supprimé");
                      load();
                    }
                  });
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

