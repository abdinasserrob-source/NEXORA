"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "./ProductCard";

export type FlashProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  images: string[];
};

export function HomeFlashSection({ products }: { products: FlashProduct[] }) {
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    setMounted(true);
    const end = Date.now() + (8 * 3600 + 42 * 60 + 15) * 1000;

    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTime({ h, m, s });
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const list = products.slice(0, 4);

  return (
    <section id="flash" className="mt-16 rounded-2xl bg-shop-peach px-4 py-10 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ⚡
          </span>
          <div>
            <h2 className="text-xl font-bold text-shop-text md:text-2xl">Ventes flash</h2>
            <p className="text-sm text-shop-muted">Offres limitées — démo avec compte à rebours</p>
          </div>
        </div>
        <div className="rounded-xl bg-white/80 px-4 py-2 text-center text-shop-navy shadow-sm">
          <span className="text-xs font-medium text-shop-muted">Fin dans</span>
          <p className="font-mono text-lg font-bold tabular-nums">
            {!mounted
              ? "--h --min --s"
              : `${String(time.h).padStart(2, "0")}h ${String(time.m).padStart(2, "0")}min ${String(time.s).padStart(2, "0")}s`}
          </p>
        </div>
      </div>
      <div className="mx-auto mt-8 grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4">
        {list.map((p) => (
          <ProductCard
            key={p.id}
            variant="flash"
            p={{
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: p.price,
              images: p.images,
              comparePrice: p.comparePrice,
            }}
          />
        ))}
      </div>
    </section>
  );
}
