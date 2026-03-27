"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { usePreferences } from "@/components/PreferencesContext";

type Addr = {
  id: string;
  recipientName?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  postalCode: string;
  region?: string | null;
  country: string;
};
type Zone = { id: string; name: string; price: number };
type Carrier = { id: string; name: string };
type CartItem = {
  id: string;
  quantity: number;
  product: { name: string; slug: string; price: number; images: string[] };
};

const STEPS = ["Adresse", "Livraison", "Récapitulatif", "Paiement"] as const;

export default function CheckoutPage() {
  const { formatPrice } = usePreferences();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [me, setMe] = useState<{ user: unknown } | null>(null);
  const [addrs, setAddrs] = useState<Addr[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [addrId, setAddrId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [promo, setPromo] = useState("");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletError, setWalletError] = useState<{
    balance: number;
    total: number;
    missing: number;
    message: string;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setMe(d);
        if (!d.user) router.replace("/connexion?next=/commande");
        if (d.user?.wallet) setWalletBalance(d.user.wallet.balance);
      });
    void fetch("/api/addresses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAddrs(d.addresses ?? []));
    void fetch("/api/shipping")
      .then((r) => r.json())
      .then((d) => {
        setZones(d.zones ?? []);
        setCarriers(d.carriers ?? []);
      });
    void fetch("/api/cart", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCartItems(Array.isArray(d.items) ? d.items : []));
    void fetch("/api/me/wallet", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.wallet && typeof d.wallet.balance === "number") setWalletBalance(d.wallet.balance);
      })
      .catch(() => null);
  }, [router]);

  const zone = zones.find((z) => z.id === zoneId);
  const subtotal = useMemo(
    () => cartItems.reduce((a, i) => a + i.product.price * i.quantity, 0),
    [cartItems]
  );
  const shipping = zone?.price ?? 0;
  const totalEst = Math.max(0, subtotal + shipping);
  const addr = addrs.find((a) => a.id === addrId);

  const walletShort = walletBalance !== null && walletBalance < totalEst;

  const goNext = () => {
    if (step === 0 && !addrId) {
      toast.error("Choisissez une adresse de livraison");
      return;
    }
    if (step === 1 && (!zoneId || !carrierId)) {
      toast.error("Choisissez une zone et un transporteur");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    if (!addrId || !zoneId || !carrierId) {
      toast.error("Remplissez adresse, zone et transporteur");
      return;
    }
    setWalletError(null);
    if (walletBalance !== null && walletBalance < totalEst) {
      const missing = Math.round((totalEst - walletBalance) * 100) / 100;
      setWalletError({
        balance: walletBalance,
        total: totalEst,
        missing,
        message: `Il vous manque ${formatPrice(missing)} pour payer avec le portefeuille (total estimé ${formatPrice(totalEst)}, solde ${formatPrice(walletBalance)}). Un code promo peut encore baisser le total final.`,
      });
      toast.error("Solde portefeuille insuffisant pour ce montant estimé");
      return;
    }
    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        addressId: addrId,
        zoneId,
        carrierId,
        promoCode: promo || undefined,
      }),
    });
    const data = (await r.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      balance?: number;
      total?: number;
      missing?: number;
      orderId?: string;
    };
    if (!r.ok) {
      if (data.code === "WALLET_INSUFFICIENT" && typeof data.balance === "number" && typeof data.total === "number") {
        const missing =
          typeof data.missing === "number" ? data.missing : Math.round((data.total - data.balance) * 100) / 100;
        setWalletError({
          balance: data.balance,
          total: data.total,
          missing,
          message:
            data.error ??
            `Solde insuffisant : total commande ${data.total.toFixed(2)} €, solde ${data.balance.toFixed(2)} €, manque ${missing.toFixed(2)} €.`,
        });
      }
      toast.error(data.error ?? "Erreur");
      return;
    }
    toast.success("Commande validée");
    router.push(`/compte?order=${data.orderId}`);
  };

  if (!me?.user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#f4f7fb] text-slate-600">
        Chargement…
      </div>
    );
  }

  const field =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

  const nextLabel = step < STEPS.length - 1 ? STEPS[step + 1] : null;

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-20 pt-8 text-slate-900">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold text-slate-900">
            NEXORA
          </Link>
          
        </div>

        {/* Stepper 4 étapes — style maquette */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-center gap-0 sm:gap-1 md:gap-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex min-w-0 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (i <= step) setStep(i);
                  }}
                  className="flex min-w-0 flex-col items-center gap-1 px-1 sm:flex-row sm:gap-2 sm:px-2"
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                      step === i ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                      : step > i ? "bg-cyan-100 text-cyan-800"
                      : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`max-w-[4.5rem] text-center text-[10px] font-semibold leading-tight sm:max-w-none sm:text-sm ${
                      step === i ? "text-cyan-700" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {i < STEPS.length - 1 ?
                  <div className="mx-0.5 hidden h-px w-4 bg-slate-200 sm:mx-2 sm:block sm:w-8 md:w-12" />
                : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Étape {step + 1} sur {STEPS.length}
            </span>
            {nextLabel && step < STEPS.length - 1 ?
              <span>
                Suivant : <span className="font-medium text-cyan-600">{nextLabel}</span>
              </span>
            : step === STEPS.length - 1 ?
              <span className="font-medium text-cyan-600">Validation de la commande</span>
            : null}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {step === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h1 className="text-2xl font-bold">Adresse de livraison</h1>
                <p className="mt-1 text-sm text-slate-500">Sélectionnez une adresse enregistrée sur votre compte.</p>
                <div className="mt-8 space-y-5">
                  <label className="block text-sm font-medium text-slate-700">
                    Adresse
                    <select className={field} value={addrId} onChange={(e) => setAddrId(e.target.value)}>
                      <option value="">— Choisir —</option>
                      {addrs.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.recipientName ? `${a.recipientName} — ` : ""}
                          {a.line1}, {a.postalCode} {a.city}
                        </option>
                      ))}
                    </select>
                  </label>
                  {addrs.length === 0 && (
                    <p className="text-sm text-amber-800">
                      Aucune adresse —{" "}
                      <Link href="/compte/adresses" className="font-semibold text-cyan-600 underline">
                        en ajouter une
                      </Link>
                      .
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={goNext}
                  className="mt-8 w-full rounded-xl bg-cyan-500 py-3.5 text-sm font-bold text-white shadow-md shadow-cyan-500/25 hover:bg-cyan-600 md:w-auto md:px-10"
                >
                  Continuer vers la livraison
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h1 className="text-2xl font-bold">Mode de livraison</h1>
                <p className="mt-1 text-sm text-slate-500">Zone et transporteur.</p>
                <div className="mt-8 space-y-5">
                  <label className="block text-sm font-medium text-slate-700">
                    Zone
                    <select className={field} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                      <option value="">—</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} (+{formatPrice(z.price)})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Transporteur
                    <select className={field} value={carrierId} onChange={(e) => setCarrierId(e.target.value)}>
                      <option value="">—</option>
                      {carriers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-xl bg-cyan-500 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-cyan-600"
                  >
                    Continuer vers le récapitulatif
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h1 className="text-2xl font-bold">Récapitulatif</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Vérifiez les informations avant le paiement. Le code promo sera appliqué à la validation.
                </p>
                <div className="mt-6 space-y-4 rounded-xl bg-slate-50 p-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Adresse</p>
                    <p className="mt-1 whitespace-pre-line text-slate-800">
                      {addr ?
                        [
                          addr.recipientName,
                          [addr.line1, addr.line2].filter(Boolean).join(addr.line2 ? ", " : ""),
                          `${addr.postalCode} ${addr.city}${addr.region ? `, ${addr.region}` : ""}, ${addr.country}`,
                        ]
                          .filter(Boolean)
                          .join("\n")
                      : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">Livraison</p>
                    <p className="mt-1 text-slate-800">
                      {zone?.name ?? "—"} · {carriers.find((c) => c.id === carrierId)?.name ?? "—"}
                    </p>
                  </div>
                </div>
                <label className="mt-8 block text-sm font-medium text-slate-700">
                  Code promo
                  <input className={field} value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Optionnel" />
                </label>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-xl bg-cyan-500 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-cyan-600"
                  >
                    Continuer vers le paiement
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h1 className="text-2xl font-bold">Paiement</h1>
               

                {walletError && (
                  <div
                    className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
                    role="alert"
                  >
                    <p className="font-semibold">Portefeuille : solde insuffisant</p>
                    <p className="mt-2">{walletError.message}</p>
                    <ul className="mt-2 list-inside list-disc text-xs">
                      <li>Total à régler (côté serveur) : {formatPrice(walletError.total)}</li>
                      <li>Votre solde : {formatPrice(walletError.balance)}</li>
                      <li>Manquant : {formatPrice(walletError.missing)}</li>
                    </ul>
                    <Link href="/compte/portefeuille" className="mt-3 inline-block font-semibold text-cyan-700 underline">
                      Créditer mon portefeuille
                    </Link>
                  </div>
                )}

                {walletShort && !walletError && (
                  <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <p className="font-semibold">Attention</p>
                    <p className="mt-1">
                      Votre solde ({formatPrice(walletBalance!)}) est inférieur au total estimé (
                      {formatPrice(totalEst)}). Le total final peut baisser si un code promo est accepté ; sinon
                      créditez votre{" "}
                      <Link href="/compte/portefeuille" className="font-semibold text-cyan-700 underline">
                        portefeuille
                      </Link>{" "}
                      avant de valider.
                    </p>
                  </div>
                )}

                <div className="mt-8 rounded-xl border border-cyan-100 bg-cyan-50/50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-800">Paiement par portefeuille NEXORA</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Le montant de la commande sera débité de votre solde au moment de la validation.
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {walletBalance !== null ?
                      <>Solde disponible : {formatPrice(walletBalance)}</>
                    :   <>Chargement du solde…</>}
                  </p>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    className="rounded-xl bg-cyan-500 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-cyan-600"
                  >
                    Valider la commande
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
              <h2 className="text-lg font-bold">Récapitulatif</h2>
              <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto border-b border-slate-100 pb-4">
                {cartItems.length === 0 ?
                  <li className="text-sm text-slate-500">
                    Panier vide —{" "}
                    <Link href="/panier" className="text-cyan-600">
                      Panier
                    </Link>
                  </li>
                : cartItems.map((i) => (
                    <li key={i.id} className="flex gap-3 text-sm">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <Image
                          src={i.product.images[0] ?? ""}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-900">{i.product.name}</p>
                        <p className="text-xs text-slate-500">Qté {i.quantity}</p>
                      </div>
                      <span className="shrink-0 font-semibold text-cyan-600">
                        {formatPrice(i.product.price * i.quantity)}
                      </span>
                    </li>
                  ))
                }
              </ul>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Livraison</span>
                  <span className="text-cyan-600">{zone ? formatPrice(shipping) : "Calcul à l’étape livraison"}</span>
                </div>
                <p className="text-xs text-slate-400">La remise promo s’applique au paiement (total final sur le serveur).</p>
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-base font-bold text-slate-900">
                  <span>Total estimé</span>
                  <span>{formatPrice(totalEst)}</span>
                </div>
              </div>
              {walletBalance !== null && (
                <p className="mt-3 rounded-lg bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
                  Portefeuille : <strong>{formatPrice(walletBalance)}</strong> — créditez depuis{" "}
                  <Link href="/compte/portefeuille" className="font-semibold underline">
                    Mon portefeuille
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-16 flex flex-wrap items-center justify-center gap-4 border-t border-slate-200 pt-6 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Lock className="size-3" /> Checkout sécurisé (démo)
          </span>
          <Link href="/" className="hover:text-cyan-600">
            Retour boutique
          </Link>
        </footer>
      </div>
    </div>
  );
}
