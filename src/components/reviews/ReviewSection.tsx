"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Star } from "lucide-react";

type ReviewUser = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string | Date;
  reported: boolean;
  reportCount: number;
  user: ReviewUser;
};

function displayName(u: ReviewUser) {
  return u.name ?? [u.firstName, u.lastName].filter(Boolean).join(" ") ?? u.email;
}

export function ReviewSection({
  productId,
  initialReviews,
}: {
  productId: string;
  initialReviews: ReviewRow[];
}) {
  const [me, setMe] = useState<{ user: { id: string } | null } | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>(initialReviews);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [eligMsg, setEligMsg] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setMe(d))
      .catch(() => setMe({ user: null }));
  }, []);

  useEffect(() => {
    if (!me?.user?.id) {
      setEligible(null);
      setEligMsg(null);
      return;
    }
    void fetch(`/api/reviews/eligibility?productId=${encodeURIComponent(productId)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d: { eligible?: boolean; message?: string }) => {
        setEligible(!!d.eligible);
        setEligMsg(typeof d.message === "string" ? d.message : null);
      })
      .catch(() => {
        setEligible(false);
        setEligMsg(null);
      });
  }, [me?.user?.id, productId]);

  const isLogged = !!me?.user?.id;

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  }, [reviews]);

  const canSubmit =
    isLogged &&
    eligible === true &&
    rating >= 1 &&
    comment.trim().length >= 4 &&
    !submitting;

  const submitReview = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ productId, rating, comment }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error(typeof d.error === "string" ? d.error : "Erreur");
        return;
      }

      // La route POST renvoie le review avec user inclus.
      const newReview = d.review as ReviewRow | undefined;
      if (newReview) setReviews((prev) => [newReview, ...prev]);
      setRating(0);
      setComment("");
      toast.success("Avis publié");
    } finally {
      setSubmitting(false);
    }
  };

  const reportReview = async (reviewId: string) => {
    if (!isLogged) {
      toast.error("Connectez-vous pour signaler.");
      return;
    }
    const r = await fetch("/api/reviews/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reviewId }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      toast.error(typeof d.error === "string" ? d.error : "Impossible de signaler");
      return;
    }
    setReviews((prev) =>
      prev.map((x) =>
        x.id === reviewId
          ? { ...x, reported: true, reportCount: Math.max(0, x.reportCount + 1) }
          : x
      )
    );
    toast.success("Avis signalé");
  };

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-shop-navy">Avis clients</h2>
          <p className="mt-1 text-sm text-shop-muted">
            {reviews.length > 0 ? `Note moyenne ${avg.toFixed(1)}/5 · ${reviews.length} avis` : "Soyez le premier à donner votre avis."}
          </p>
        </div>
        {reviews.length > 0 ? (
          <div className="flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => {
              const idx = i + 1;
              const filled = idx <= Math.round(avg);
              return <Star key={idx} className={filled ? "size-4 fill-amber-500" : "size-4 text-[#ddd]"} />;
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl border border-shop-border bg-shop-bg p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-shop-text">Votre avis</h3>
        {!isLogged ? (
          <p className="mt-2 text-sm text-shop-muted">
            Connectez-vous pour publier un avis.
          </p>
        ) : eligible === false ?
          <p className="mt-2 text-sm text-amber-900">
            {eligMsg ??
              "Les avis sont réservés aux clients ayant commandé ce produit (commande payée)."}
            <br />
            <Link href="/compte/commandes" className="mt-2 inline-block font-semibold text-shop-cyan underline">
              Voir mes commandes
            </Link>
          </p>
        : eligible === null ?
          <p className="mt-2 text-sm text-shop-muted">Vérification de votre éligibilité…</p>
        : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-shop-text">Étoiles</p>
              <div className="mt-2 flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => {
                  const v = i + 1;
                  const active = v <= rating;
                  return (
                    <button
                      key={v}
                      type="button"
                      className="rounded-lg"
                      onClick={() => setRating(v)}
                      aria-label={`Donner ${v} étoiles`}
                    >
                      <Star
                        className={
                          active ? "size-6 fill-shop-cyan text-shop-cyan" : "size-6 text-[#ddd]"
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-shop-text">Commentaire</span>
              <textarea
                className="mt-2 w-full rounded-xl border border-shop-border bg-shop-surface px-4 py-3 text-sm outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20"
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Dites-nous ce que vous en pensez…"
              />
            </label>

            <button
              type="button"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-shop-cyan px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              onClick={() => void submitReview()}
            >
              Publier mon avis
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {reviews.length === 0 && (
          <p className="text-sm text-shop-muted">Aucun avis pour l’instant.</p>
        )}

        {reviews.map((r) => {
          const d = new Date(r.createdAt);
          return (
            <div key={r.id} className="rounded-2xl border border-shop-border bg-shop-bg p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-10 overflow-hidden rounded-full border border-shop-border bg-shop-surface">
                    {(() => {
                      const initial =
                        (r.user.name?.trim()?.[0] ??
                          r.user.firstName?.trim()?.[0] ??
                          r.user.lastName?.trim()?.[0] ??
                          "U") as string;
                      const initialLetter = initial.toUpperCase();
                      return (
                        <>
                          {r.user.avatar ? (
                            <Image
                              src={r.user.avatar}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-shop-muted">
                              {initialLetter}
                            </div>
                          )}
                          {r.user.avatar ? (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                                {initialLetter}
                              </span>
                            </div>
                          ) : null}
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-shop-text">{displayName(r.user)}</p>
                    <p className="text-xs text-shop-muted">{d.toLocaleString("fr-FR")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {r.reported ? (
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600">
                      Signalé ({r.reportCount})
                    </span>
                  ) : null}
                  {!r.reported ? (
                    <button
                      type="button"
                      className="rounded-xl border border-shop-border bg-shop-surface px-3 py-2 text-xs font-semibold text-shop-cyan hover:bg-shop-bg"
                      onClick={() => void reportReview(r.id)}
                    >
                      Signaler
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => {
                  const v = i + 1;
                  const filled = v <= r.rating;
                  return (
                    <Star
                      key={v}
                      className={filled ? "size-4 fill-amber-500 text-amber-500" : "size-4 text-[#ddd]"}
                    />
                  );
                })}
                <span className="text-sm font-semibold text-shop-text">{r.rating}/5</span>
              </div>

              <p className="mt-3 text-sm text-shop-muted whitespace-pre-wrap">{r.comment}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

