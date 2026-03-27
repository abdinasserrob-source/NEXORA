"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export function HomeHeroSection({ images }: { images: string[] }) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { user?: { id: string } | null }) => setLoggedIn(!!d?.user))
      .catch(() => setLoggedIn(false));
  }, []);

  const heroImages = useMemo(() => {
    // On s'assure d'avoir exactement 3 slides (pour les 3 points).
    const base = images.filter(Boolean).slice(0, 3);
    while (base.length < 3) base.push(base[base.length - 1] ?? "");
    return base;
  }, [images]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => {
      setIdx((v) => (v + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  return (
    <section className="relative min-h-[420px] w-full md:min-h-[480px]">
      {/* Carousel image (fade infini) */}
      {heroImages.map((src, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === idx ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            priority={i === 0}
            sizes="100vw"
            unoptimized={src.startsWith("http")}
          />
        </div>
      ))}

      <div
        className="absolute inset-0 flex items-center"
        style={{
          background:
            "linear-gradient(90deg, rgba(26,39,68,0.88) 0%, rgba(26,39,68,0.45) 55%, transparent 100%)",
        }}
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <span className="inline-block rounded-full bg-shop-cyan/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-shop-cyan">
            Nouvelle technologie
          </span>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight text-white md:text-5xl">
            L&apos;ère du shopping intelligent
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/85 md:text-base">
            NEXORA : recommandations hybrides, tracking avant connexion, panier persistant. Jusqu&apos;à{" "}
            <strong>20 %</strong> sur une sélection — démo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/categories"
              className="rounded-full bg-shop-cyan px-8 py-3 text-sm font-semibold text-white shadow-lg hover:bg-shop-cyan-hover"
            >
              Acheter maintenant
            </Link>
            <Link
              href={loggedIn ? "/#reco" : "/#tendance"}
              className="rounded-full border-2 border-white/90 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              {loggedIn ? "Recommandations pour vous" : "Voir les tendances"}
            </Link>
          </div>
          {/* 3 points qui se mettent à jour avec le carousel */}
          <div className="mt-10 flex gap-2">
            {heroImages.slice(0, 3).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setIdx(i)}
                className="h-2 w-2 rounded-full bg-white/40 transition-colors"
              >
                <span className="sr-only">{i + 1}</span>
                <span
                  className={`block h-2 w-2 rounded-full transition-colors ${
                    i === idx ? "bg-shop-cyan" : "bg-white/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

