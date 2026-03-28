"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Mic } from "lucide-react";
import toast from "react-hot-toast";

type SpeechRecCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onresult: ((ev: Event) => void) | null;
};

function getSpeechRecognition(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function voiceErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone refusé. Autorisez l’accès au micro pour ce site (icône à gauche de la barre d’adresse).";
    case "no-speech":
      return "Aucune parole détectée. Parlez après avoir cliqué sur le micro.";
    case "audio-capture":
      return "Microphone introuvable ou déjà utilisé par une autre application.";
    case "network":
      return "Recherche vocale : problème réseau. Vérifiez votre connexion.";
    case "aborted":
      return "";
    default:
      return code ? `Recherche vocale : ${code}` : "Erreur microphone";
  }
}

export type ImageSearchClientPayload = {
  query?: string;
  message?: string;
  products?: unknown[];
};

type Props = {
  compact?: boolean;
  /** Si défini, la voix ne redirige pas seule (page Recherche met à jour l’URL). */
  onVoiceResult?: (text: string) => void;
  /** Si défini, l’image ne redirige pas seule (résultats affichés sur la page). */
  onImageSuccess?: (data: ImageSearchClientPayload) => void;
  onImageLoadingChange?: (loading: boolean) => void;
};

/**
 * Recherche par image (API) et recherche vocale (Web Speech API).
 */
export function SearchMediaButtons({
  compact,
  onVoiceResult,
  onImageSuccess,
  onImageLoadingChange,
}: Props) {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [isImageSearching, setIsImageSearching] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const navigateWithQuery = (text: string) => {
    const q = text.trim();
    if (q.length < 2) {
      toast.error("Entrez au moins 2 caractères (parlez un peu plus longtemps).");
      return;
    }
    router.push(`/recherche?q=${encodeURIComponent(q)}`);
  };

  const startVoiceSearch = () => {
    const SR = getSpeechRecognition();
    if (!SR) {
      toast.error("Recherche vocale non disponible (essayez Chrome ou Edge, en HTTPS ou sur localhost).");
      return;
    }
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    const rec = new SR();
    recRef.current = rec;
    rec.lang = "fr-FR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = (ev) => {
      setIsListening(false);
      const msg = voiceErrorMessage(ev?.error ?? "");
      if (msg) toast.error(msg);
    };
    rec.onresult = (ev: Event) => {
      const anyEv = ev as unknown as { results: { 0: { 0: { transcript: string } } } };
      const transcript = String(anyEv?.results?.[0]?.[0]?.transcript ?? "").trim();
      if (!transcript) {
        toast.error("Aucun texte reconnu. Réessayez.");
        return;
      }
      toast.success(`« ${transcript} »`);
      if (onVoiceResult) onVoiceResult(transcript);
      else navigateWithQuery(transcript);
    };
    try {
      rec.start();
    } catch {
      toast.error("Impossible de démarrer la reconnaissance vocale.");
      setIsListening(false);
    }
  };

  const onPickImage = async (file: File) => {
    setIsImageSearching(true);
    onImageLoadingChange?.(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/search/image", { method: "POST", body: fd });
      const d = (await r.json().catch(() => ({}))) as ImageSearchClientPayload & { error?: string };
      if (!r.ok) {
        toast.error(typeof d.error === "string" ? d.error : "Analyse image impossible");
        return;
      }
      if (onImageSuccess) {
        onImageSuccess(d);
        return;
      }
      const q = typeof d.query === "string" ? d.query.trim() : "";
      if (typeof d.message === "string" && d.message.length > 0) {
        toast.success(d.message.slice(0, 100) + (d.message.length > 100 ? "…" : ""));
      }
      if (q.length >= 2) {
        router.push(`/recherche?q=${encodeURIComponent(q)}`);
      } else {
        toast.error("Impossible de déduire une recherche depuis cette image.");
      }
    } catch {
      toast.error("Envoi de l’image impossible (réseau).");
    } finally {
      setIsImageSearching(false);
      onImageLoadingChange?.(false);
    }
  };

  const btn =
    compact ?
      "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-shop-border bg-shop-bg text-shop-muted hover:bg-white hover:text-shop-cyan"
    : "inline-flex items-center justify-center rounded-xl border border-shop-border bg-white px-3 py-2.5 text-shop-muted hover:bg-shop-bg";

  return (
    <>
      <label
        className={`${btn} ${isImageSearching ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        title="Rechercher par image"
        aria-label="Rechercher par image"
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isImageSearching}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onPickImage(f);
          }}
        />
        <Camera className="size-4" />
      </label>
      <button
        type="button"
        onClick={startVoiceSearch}
        disabled={isListening}
        className={`${btn} ${isListening ? "ring-2 ring-shop-cyan/40" : ""}`}
        title="Recherche vocale"
        aria-label="Recherche vocale"
      >
        <Mic className="size-4" />
      </button>
    </>
  );
}
