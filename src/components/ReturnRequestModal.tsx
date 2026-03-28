"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import {
  RETURN_REASON_CUSTOM_PREFIX,
  RETURN_REASON_LABELS,
  type ReturnReasonValue,
} from "@/lib/return-request-shared";

const REASON_ENTRIES = Object.entries(RETURN_REASON_LABELS) as [ReturnReasonValue, string][];

/** Valeur sentinelle du `<select>` (non envoyée telle quelle à l’API). */
const REASON_SELECT_OTHER = "__OTHER__" as const;
type ReasonSelectValue = ReturnReasonValue | typeof REASON_SELECT_OTHER;

const TYPE_OPTIONS: { value: "RETURN" | "REFUND" | "DISPUTE"; label: string }[] = [
  { value: "RETURN", label: "Retour produit" },
  { value: "REFUND", label: "Remboursement" },
  { value: "DISPUTE", label: "Litige" },
];

const MAX_PHOTO_BYTES = 1_500_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(typeof fr.result === "string" ? fr.result : "");
    fr.onerror = () => reject(new Error("lecture"));
    fr.readAsDataURL(file);
  });
}

type Props = {
  orderId: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export function ReturnRequestModal({ orderId, onClose, onSubmitted }: Props) {
  const [reqType, setReqType] = useState<"RETURN" | "REFUND" | "DISPUTE">("RETURN");
  const [reasonKey, setReasonKey] = useState<ReasonSelectValue>("DEFECTIVE");
  const [otherMotif, setOtherMotif] = useState("");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const runSubmit = async () => {
    if (description.trim().length < 20) {
      toast.error("La description doit contenir au moins 20 caractères.");
      return;
    }
    if (reasonKey === REASON_SELECT_OTHER) {
      const om = otherMotif.trim();
      if (om.length < 10) {
        toast.error("Précisez votre motif (au moins 10 caractères).");
        return;
      }
    }
    const reasonToSend =
      reasonKey === REASON_SELECT_OTHER ?
        `${RETURN_REASON_CUSTOM_PREFIX}${otherMotif.trim()}`
      : reasonKey;

    setSubmitting(true);
    try {
      let photoUrl: string | undefined;
      if (photo) {
        if (photo.size > MAX_PHOTO_BYTES) {
          toast.error("Photo trop volumineuse (max 1,5 Mo).");
          return;
        }
        try {
          photoUrl = await readFileAsDataUrl(photo);
        } catch {
          toast.error("Impossible de lire la photo.");
          return;
        }
        if (!photoUrl || photoUrl.length > 2_200_000) {
          toast.error("Photo trop volumineuse après encodage.");
          return;
        }
      }

      const payload: {
        type: typeof reqType;
        reason: string;
        description: string;
        photoUrl?: string;
      } = {
        type: reqType,
        reason: reasonToSend,
        description: description.trim(),
      };
      if (photoUrl) payload.photoUrl = photoUrl;

      const r = await fetch(`/api/orders/${orderId}/return-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const raw = await r.text();
      let d: { error?: unknown } = {};
      try {
        d = JSON.parse(raw) as { error?: unknown };
      } catch {
        /* corps non JSON (souvent page d’erreur HTML) */
      }
      if (!r.ok) {
        const fromApi = typeof d.error === "string" ? d.error : null;
        const fallback =
          raw.trim().startsWith("<") ?
            "Erreur serveur (réponse HTML). Ouvrez le terminal « npm run dev » pour voir la trace."
          : raw.trim().length > 0 ? raw.trim().slice(0, 220)
          : `Échec de l’envoi (HTTP ${r.status}).`;
        toast.error(fromApi ?? fallback);
        return;
      }
      toast.success("Demande enregistrée");
      onSubmitted();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void runSubmit();
  };

  const inp =
    "mt-1 w-full rounded-xl border border-shop-border bg-shop-bg px-3 py-2 text-sm text-shop-text outline-none focus:border-shop-cyan focus:ring-2 focus:ring-shop-cyan/20";

  const modal = (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-shop-border bg-shop-surface shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-shop-border px-4 py-3">
          <h2 id="return-modal-title" className="text-lg font-bold text-shop-navy">
            Retour / remboursement / litige
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-shop-muted hover:bg-shop-bg"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>
        {/*
          Soumission via fetch JSON (application/json), pas FormData : évite que Next.js traite
          le POST multipart comme une Server Action (« Server action not found »).
        */}
        <form onSubmit={onFormSubmit} className="space-y-4 p-4">
          <label className="block text-sm">
            <span className="font-medium text-shop-text">Type de demande</span>
            <select className={inp} value={reqType} onChange={(e) => setReqType(e.target.value as typeof reqType)}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-shop-text">Motif</span>
            <select
              className={inp}
              value={reasonKey}
              onChange={(e) => {
                const v = e.target.value as ReasonSelectValue;
                setReasonKey(v);
                if (v !== REASON_SELECT_OTHER) setOtherMotif("");
              }}
            >
              {REASON_ENTRIES.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
              <option value={REASON_SELECT_OTHER}>Autre</option>
            </select>
          </label>
          {reasonKey === REASON_SELECT_OTHER ?
            <label className="block text-sm">
              <span className="font-medium text-shop-text">Précisez votre motif</span>
              <input
                type="text"
                className={inp}
                value={otherMotif}
                onChange={(e) => setOtherMotif(e.target.value)}
                placeholder="Décrivez brièvement votre motif..."
                required
                minLength={10}
                maxLength={500}
                autoComplete="off"
              />
            </label>
          : null}
          <label className="block text-sm">
            <span className="font-medium text-shop-text">Description (obligatoire, min. 20 caractères)</span>
            <textarea
              className={`${inp} min-h-[120px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez précisément le problème…"
              required
              minLength={20}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-shop-text">Photo (optionnelle)</span>
            <input
              type="file"
              accept="image/*"
              className={`${inp} py-2 file:mr-3 file:rounded-lg file:border-0 file:bg-shop-cyan file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white`}
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-shop-border px-4 py-2.5 text-sm font-semibold text-shop-text hover:bg-shop-bg"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void runSubmit()}
              className="rounded-xl bg-shop-cyan px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? "Envoi…" : "Soumettre la demande"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modal, document.body);
}
