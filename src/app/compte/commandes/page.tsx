"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import { usePreferences } from "@/components/PreferencesContext";
import { Copy, Package } from "lucide-react";
import { ReturnRequestModal } from "@/components/ReturnRequestModal";
import { returnReasonLabel } from "@/lib/return-request-shared";

type ReturnRequestBrief = {
  id: string;
  status: string;
  type: string;
  reason: string;
  createdAt: string;
} | null;

type OrderItemRow = {
  id: string;
  titleSnap: string;
  quantity: number;
  product?: {
    id: string;
    slug: string;
    sellerId: string;
    seller?: {
      id: string;
      sellerProfile: { shopName: string; logoUrl: string | null; description: string | null } | null;
    } | null;
  } | null;
};

type OrderRow = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string | null;
  trackingNumber?: string | null;
  disputeCount?: number;
  returnRequest: ReturnRequestBrief;
  items: OrderItemRow[];
};

function clientCanOpenReturn(o: OrderRow): boolean {
  if (o.status !== "DELIVERED") return false;
  if (o.returnRequest) return false;
  if ((o.disputeCount ?? 0) > 0) return false;
  const ref = o.deliveredAt ? new Date(o.deliveredAt) : new Date(o.updatedAt);
  return Date.now() - ref.getTime() <= 30 * 24 * 60 * 60 * 1000;
}

function returnStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "APPROVED":
      return "Approuvé";
    case "REJECTED":
      return "Refusé";
    case "REFUNDED":
      return "Remboursé";
    default:
      return status;
  }
}

function returnStatusClass(status: string): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-900";
    case "APPROVED":
      return "bg-emerald-100 text-emerald-900";
    case "REJECTED":
      return "bg-red-100 text-red-900";
    case "REFUNDED":
      return "bg-slate-200 text-slate-800";
    default:
      return "bg-shop-surface text-shop-muted";
  }
}

function requestTypeLabel(t: string): string {
  switch (t) {
    case "RETURN":
      return "Retour";
    case "REFUND":
      return "Remboursement";
    case "DISPUTE":
      return "Litige";
    default:
      return t;
  }
}

export default function CommandesPage() {
  const { formatOrderPrice, t, locale } = usePreferences();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [modalOrderId, setModalOrderId] = useState<string | null>(null);

  const load = useCallback(() => {
    void fetch("/api/orders", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders((d.orders ?? []) as OrderRow[]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const copyId = (id: string) => {
    void navigator.clipboard.writeText(id);
    toast.success(t("orders.copied"));
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-shop-navy">{t("orders.title")}</h1>
      <p className="mt-1 text-sm text-shop-muted">{t("orders.subtitle")}</p>
      <ul className="mt-6 space-y-4">
        {orders.length === 0 && <li className="text-sm text-shop-muted">{t("orders.empty")}</li>}
        {orders.map((o) => (
          <li key={o.id} className="rounded-2xl border border-shop-border bg-shop-bg p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase text-shop-muted">{t("orders.orderLabel")}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="break-all font-mono text-xs text-shop-text">{o.id}</span>
                  <button
                    type="button"
                    onClick={() => copyId(o.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-shop-border bg-white px-2 py-0.5 text-[11px] font-medium text-shop-cyan hover:bg-shop-bg"
                  >
                    <Copy className="size-3" />
                    {t("orders.copy")}
                  </button>
                </div>
              </div>
              <span className="rounded-full bg-shop-surface px-2 py-0.5 text-xs font-medium">{o.status}</span>
            </div>
            <p className="mt-2 font-semibold text-shop-text">{formatOrderPrice(o.total)}</p>
            <p className="text-[11px] text-shop-muted">{t("orders.totalNote")}</p>
            <p className="text-xs text-shop-muted">
              {new Date(o.createdAt).toLocaleString(
                locale === "ar" ? "ar-DJ" : locale === "en" ? "en-GB" : "fr-FR"
              )}
            </p>
            {o.trackingNumber && (
              <p className="mt-1 text-xs">
                {t("orders.tracking")}{" "}
                <span className="font-mono text-shop-cyan">{o.trackingNumber}</span>
              </p>
            )}
            <ul className="mt-3 space-y-3 border-t border-shop-border pt-3">
              {o.items?.map((it) => {
                const sp = it.product?.seller?.sellerProfile;
                const shop = sp?.shopName ?? t("orders.shop");
                const logo = sp?.logoUrl;
                return (
                  <li key={it.id} className="rounded-xl bg-white/80 p-3">
                    <p className="font-medium text-shop-text">
                      {it.titleSnap} × {it.quantity}
                    </p>
                    {it.product?.slug ?
                      <Link
                        href={`/produit/${it.product.slug}`}
                        className="mt-1 inline-block text-xs text-shop-cyan hover:underline"
                      >
                        {t("orders.viewProduct")}
                      </Link>
                    : null}
                    {it.product?.seller ?
                      <div className="mt-3 flex gap-3 border-t border-shop-border/80 pt-3">
                        <Link
                          href={`/boutique/${it.product.seller.id}`}
                          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg hover:bg-shop-bg/80"
                        >
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-shop-bg">
                            {logo ?
                              <Image src={logo} alt="" fill className="object-cover" unoptimized />
                            : (
                              <span className="flex size-full items-center justify-center text-[10px] font-bold text-shop-muted">
                                {shop.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-xs font-semibold text-shop-navy">{shop}</span>
                            {sp?.description ?
                              <span className="line-clamp-2 text-[11px] text-shop-muted">{sp.description}</span>
                            : null}
                          </span>
                        </Link>
                      </div>
                    : null}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-col gap-2 border-t border-shop-border pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <a
                href={`/api/orders/${o.id}/invoice`}
                className="text-xs font-medium text-shop-cyan hover:underline"
              >
                Télécharger facture PDF
              </a>
              <Link
                href={`/suivi?order=${encodeURIComponent(o.id)}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-shop-cyan hover:underline"
              >
                <Package className="size-3.5" />
                Suivi colis
              </Link>
              {o.returnRequest ?
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${returnStatusClass(o.returnRequest.status)}`}
                >
                  Demande : {returnStatusLabel(o.returnRequest.status)} — {requestTypeLabel(o.returnRequest.type)} (
                  {returnReasonLabel(o.returnRequest.reason)})
                </span>
              : clientCanOpenReturn(o) ?
                <button
                  type="button"
                  onClick={() => setModalOrderId(o.id)}
                  className="inline-flex rounded-xl border border-shop-cyan/40 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900 hover:bg-cyan-100"
                >
                  Retourner un article
                </button>
              : null}
            </div>
          </li>
        ))}
      </ul>
      {modalOrderId ?
        <ReturnRequestModal
          orderId={modalOrderId}
          onClose={() => setModalOrderId(null)}
          onSubmitted={load}
        />
      : null}
    </>
  );
}
