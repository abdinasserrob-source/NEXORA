import Image from "next/image";
import type { ReactNode } from "react";

const HERO =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80";

/**
 * Carte connexion / mot de passe oublié (deux colonnes), à placer sous le Header du site.
 */
export function AuthSplitShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-shop-border bg-shop-surface shadow-md lg:flex-row lg:min-h-[520px]">
      <div className="flex flex-1 flex-col justify-center p-8 lg:p-10">{children}</div>

      <div className="relative hidden min-h-[280px] flex-1 lg:block lg:min-h-0">
        <Image src={HERO} alt="" fill className="object-cover" priority sizes="(min-width: 1024px) 42vw, 0px" />
        <div
          className="absolute inset-0 flex flex-col justify-end p-8 text-white"
          style={{
            background:
              "linear-gradient(to top, rgba(26,39,68,0.95) 0%, rgba(26,39,68,0.45) 45%, transparent 100%)",
          }}
        >
          <span className="mb-3 inline-flex w-fit rounded-full bg-shop-cyan/90 px-3 py-1 text-xs font-semibold text-white">
            Rejoignez des milliers d&apos;acheteurs
          </span>
          <h2 className="text-2xl font-bold leading-tight md:text-3xl">
            Élevez votre expérience d&apos;achat en ligne.
          </h2>
          <p className="mt-2 max-w-md text-sm text-white/85">
            High-tech, lifestyle et recommandations intelligentes — livraison rapide et support dédié.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="font-semibold">Livraison express</p>
              <p className="text-white/75">Suivi en temps réel</p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="font-semibold">Meilleurs prix</p>
              <p className="text-white/75">Offres et fidélité</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
