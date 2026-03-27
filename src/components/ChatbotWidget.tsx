"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import toast from "react-hot-toast";
import { sanitizeRedirectPath } from "@/lib/sanitize-next";
import { usePathname } from "next/navigation";

const DEFAULT_CHAT_WELCOME =
  "Bonjour ! Le chat assistant est réservé aux comptes connectés : connectez-vous pour poser vos questions (livraison, produits, promos…). Sans compte, vous pouvez ouvrir un ticket en bas.";

export function ChatbotWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [convId, setConvId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    { role: "assistant", text: DEFAULT_CHAT_WELCOME },
  ]);
  const [ticket, setTicket] = useState(false);
  const [tEmail, setTEmail] = useState("");
  const [tSubject, setTSubject] = useState("");
  const [tBody, setTBody] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      if (localStorage.getItem("nexora_chat_pending_message")) return;
    } catch {
      // ignore
    }
    let cancelled = false;
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { user?: unknown }) => {
        if (cancelled || !d?.user) return;
        void fetch("/api/chatbot", { credentials: "include" })
          .then(async (r) => {
            if (r.status === 401 || r.status === 403) return null;
            return r.json() as Promise<{
              conversationId?: string | null;
              messages?: { role: string; text: string }[];
            }>;
          })
          .then((data) => {
            if (cancelled || !data?.messages?.length) return;
            if (typeof data.conversationId === "string") setConvId(data.conversationId);
            setMessages(data.messages.map((m) => ({ role: m.role, text: m.text })));
          })
          .catch(() => {});
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const sendText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const r = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: trimmed, conversationId: convId }),
      });

      const data = await r.json().catch(() => ({}));

      if (r.status === 401 && data.error === "AUTH_REQUIRED") {
        toast("Connectez-vous pour utiliser le chatbot — redirection vers la page de connexion…", {
          duration: 2800,
        });
        localStorage.setItem("nexora_chat_pending_message", trimmed);
        localStorage.setItem("nexora_chat_open_after_login", "1");
        const next = sanitizeRedirectPath(window.location.pathname + window.location.search);
        window.setTimeout(() => {
          window.location.href = `/connexion?next=${encodeURIComponent(next)}`;
        }, 400);
        return;
      }

      if (r.status === 429 && data.error === "CHATBOT_COOLDOWN") {
        const waitMs: number = typeof data.waitMs === "number" ? data.waitMs : 0;
        const hours = Math.max(0, Math.ceil(waitMs / (60 * 60 * 1000)));
        toast.error(`Limite atteinte. Revenez dans ${hours}h.`);
        return;
      }

      if (!r.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Erreur chatbot");
        return;
      }

      if (typeof data.conversationId === "string") setConvId(data.conversationId);
      else if (data.conversationId === null) setConvId(undefined);

      setMessages((m) => [
        ...m,
        { role: "user", text: trimmed },
        { role: "assistant", text: data.reply ?? "…" },
      ]);

      localStorage.removeItem("nexora_chat_pending_message");
    } catch {
      toast.error("Erreur chatbot");
    }
  };

  // Reprise après connexion : uniquement si l’utilisateur est déjà authentifié (évite boucle 401 sur /connexion).
  useEffect(() => {
    let cancelled = false;
    try {
      const openAfter = localStorage.getItem("nexora_chat_open_after_login") === "1";
      const pending = localStorage.getItem("nexora_chat_pending_message");
      if (!openAfter || !pending) return;

      void fetch("/api/auth/me", { credentials: "include" })
        .then((r) => r.json())
        .then((d: { user?: unknown }) => {
          if (cancelled || !d?.user) return;
          localStorage.removeItem("nexora_chat_open_after_login");
          setOpen(true);
          void sendText(pending);
        });
    } catch {
      // ignore
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideOnAuthPages = pathname === "/connexion" || pathname === "/inscription";

  const send = async () => {
    const userText = msg.trim();
    if (!userText) return;
    setMsg("");
    void sendText(userText);
  };

  const submitTicket = async () => {
    try {
      await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: tEmail, subject: tSubject, body: tBody }),
      });
      toast.success("Ticket créé");
      setTicket(false);
    } catch {
      toast.error("Échec ticket");
    }
  };

  if (hideOnAuthPages) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[100] flex size-14 items-center justify-center rounded-full bg-shop-cyan text-white shadow-lg shadow-cyan-500/35 hover:bg-shop-cyan-hover"
        aria-label="Ouvrir le chat"
      >
        <MessageCircle className="size-7" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-[100] flex h-[420px] w-[min(100vw-2rem,380px)] flex-col rounded-2xl border border-shop-border bg-shop-surface shadow-2xl">
          <div className="flex items-center justify-between border-b border-shop-border bg-shop-navy px-4 py-3 text-white">
            <span className="font-semibold">Assistant NEXORA</span>
            <button type="button" onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto bg-shop-bg p-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-6 rounded-xl bg-shop-cyan/15 px-3 py-2 text-shop-text"
                    : "mr-6 rounded-xl border border-shop-border bg-shop-surface px-3 py-2 text-shop-text"
                }
              >
                {m.text}
              </div>
            ))}
          </div>
          {!ticket ? (
            <div className="flex gap-2 border-t border-shop-border bg-shop-surface p-3">
              <input
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void send()}
                className="flex-1 rounded-xl border border-shop-border bg-shop-bg px-3 py-2 text-sm text-shop-text outline-none focus:ring-2 focus:ring-shop-cyan/30"
                placeholder="Posez votre question…"
              />
              <button
                type="button"
                onClick={() => void send()}
                className="rounded-xl bg-shop-cyan px-3 text-white hover:bg-shop-cyan-hover"
              >
                <Send className="size-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2 border-t border-shop-border bg-shop-surface p-3 text-xs">
              <input
                className="w-full rounded border border-shop-border bg-shop-bg px-2 py-1 text-shop-text"
                placeholder="Email"
                value={tEmail}
                onChange={(e) => setTEmail(e.target.value)}
              />
              <input
                className="w-full rounded border border-shop-border bg-shop-bg px-2 py-1 text-shop-text"
                placeholder="Sujet"
                value={tSubject}
                onChange={(e) => setTSubject(e.target.value)}
              />
              <textarea
                className="h-20 w-full rounded border border-shop-border bg-shop-bg px-2 py-1 text-shop-text"
                placeholder="Message"
                value={tBody}
                onChange={(e) => setTBody(e.target.value)}
              />
              <button
                type="button"
                onClick={() => void submitTicket()}
                className="w-full rounded bg-shop-navy py-2 text-white hover:opacity-95"
              >
                Envoyer le ticket
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setTicket(!ticket)}
            className="border-t border-shop-border bg-shop-surface py-2 text-center text-xs text-shop-cyan"
          >
            {ticket ? "Retour au chat" : "Créer un ticket support"}
          </button>
        </div>
      )}
    </>
  );
}
