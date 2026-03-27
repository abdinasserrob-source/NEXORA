import Link from "next/link";
import { connection } from "next/server";
import { ProductCard } from "@/components/ProductCard";
import { getAuthFromCookies } from "@/lib/jwt";
import { getCachedPersonalizedHome } from "@/lib/recommendation-home";

export type GuestRecoCard = {
  id: string;
  name: string;
  slug: string;
  price: number;
  images: string[];
};

export function HomePersonalizedFallback() {
  return (
    <div className="mt-16 animate-pulse space-y-8" id="reco">
      <div className="h-8 w-64 rounded bg-shop-border" />
      <div className="h-4 max-w-xl rounded bg-shop-border/70" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-2xl bg-shop-border" />
        ))}
      </div>
    </div>
  );
}

/**
 * Blocs reco personnalisés (utilisateur connecté) ou message invité.
 * `connection()` isole le rendu dynamique par rapport au cache shell de la page.
 */
export async function HomePersonalizedSections({ guestRecoSample }: { guestRecoSample: GuestRecoCard[] }) {
  await connection();
  const auth = await getAuthFromCookies();

  if (!auth?.sub) {
    return (
      <section id="reco" className="mt-16">
        <h2 className="text-2xl font-bold text-shop-text">Découvrir le catalogue</h2>
        <p className="mt-1 text-sm text-shop-muted">
          Connectez-vous pour des recommandations personnalisées (suivi vendeurs, favoris, historique).
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {guestRecoSample.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-shop-muted">
          <Link href="/connexion" className="font-semibold text-shop-cyan hover:underline">
            Se connecter
          </Link>{" "}
          — le moteur s’adaptera à vos goûts en temps réel.
        </p>
      </section>
    );
  }

  const { blocks, actionCount, hasHistory } = await getCachedPersonalizedHome(auth.sub);

  const profile =
    actionCount === 0
      ? { label: "Nouveau membre", pct: 0 }
      : actionCount <= 5
        ? { label: "Profil en construction", pct: 25 }
        : actionCount <= 20
          ? { label: "Profil actif", pct: 60 }
          : { label: "Profil complet ✓", pct: 100 };

  if (!blocks.length) {
    return (
      <section id="reco" className="mt-16">
        <div className="mb-6 rounded-2xl border border-shop-border bg-shop-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-shop-text">Profil de recommandation</p>
            <p className="text-xs text-shop-muted">{profile.label} · {actionCount} action{actionCount > 1 ? "s" : ""}</p>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-shop-border/70">
            <div className="h-full rounded-full bg-shop-cyan" style={{ width: `${profile.pct}%` }} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-shop-text">Recommandé pour vous</h2>
        <p className="mt-1 text-sm text-shop-muted">
          Explorez le catalogue : vos recommandations apparaîtront dès vos premières visites.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {guestRecoSample.map((p) => (
            <ProductCard key={p.id} p={p} placement="HOME" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div id="reco" className="mt-16 space-y-16">
      <div className="rounded-2xl border border-shop-border bg-shop-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-shop-text">Profil de recommandation</p>
          <p className="text-xs text-shop-muted">{profile.label} · {actionCount} action{actionCount > 1 ? "s" : ""}</p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-shop-border/70">
          <div className="h-full rounded-full bg-shop-cyan" style={{ width: `${profile.pct}%` }} />
        </div>
        {!hasHistory ? (
          <p className="mt-3 text-sm text-shop-muted">
            Plus vous interagissez, plus nos recommandations s'améliorent pour vous.
          </p>
        ) : null}
      </div>
      {blocks.map((block) => (
        <section key={block.key} className="scroll-mt-24">
          <h2 className="text-2xl font-bold text-shop-text">{block.title}</h2>
          {block.subtitle ?
            <p className="mt-1 text-sm text-shop-muted">{block.subtitle}</p>
          : null}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {block.items.map((r) => {
              const algoKey = r.algorithm.split("·")[0] || r.algorithm;
              return (
                <ProductCard
                  key={`${block.key}-${r.product.id}`}
                  p={{
                    id: r.product.id,
                    name: r.product.name,
                    slug: r.product.slug,
                    price: r.product.price,
                    images: JSON.parse(r.product.images) as string[],
                    algorithm: `${algoKey}·${r.score01.toFixed(2)}`,
                    score: r.score01,
                    recoReason: r.reason,
                    badge: algoKey === "populaire" ? "Populaire" : algoKey === "nouveauté" ? "Nouveauté" : undefined,
                  }}
                  placement="HOME"
                  recoPlacement
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
