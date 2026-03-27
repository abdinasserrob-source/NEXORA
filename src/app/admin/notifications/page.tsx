"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Notif = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

function extractProductId(body: string) {
  const m = body.match(/productId=([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);
  const [forbidden, setForbidden] = useState(false);

  const load = () => {
    void fetch("/api/notifications", { credentials: "include" }).then(async (r) => {
      if (r.status === 401 || r.status === 403) {
        setForbidden(true);
        return;
      }
      const d = await r.json().catch(() => ({}));
      setItems(d.notifications ?? []);
    });
  };

  const markRead = async (id: string) => {
    const r = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, read: true }),
    });
    if (r.ok) {
      setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
      window.dispatchEvent(new Event("notifications:updated"));
    }
  };

  useEffect(() => {
    void fetch("/api/notifications", {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      window.dispatchEvent(new Event("notifications:updated"));
      load();
    });
  }, []);

  if (forbidden) {
    return (
      <main className="flex flex-1 items-center justify-center p-8 text-[#666]">
        Connectez-vous pour voir vos notifications.
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Notifications</h1>
      <p className="mt-1 text-sm text-[#666]">Vos alertes personnelles (compte admin).</p>
      <ul className="mt-6 max-w-3xl space-y-3">
        {items.length === 0 && <li className="text-sm text-[#888]">Aucune notification.</li>}
        {items.map((n) => (
          <li
            key={n.id}
            onClick={() => {
              if (!n.read) void markRead(n.id);
            }}
            className={`rounded-2xl border border-[#e8eaef] p-4 text-sm ${
              n.read ? "bg-white" : "bg-[#eef3ff]"
            }`}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <p className="font-semibold text-[#333]">{n.title}</p>
              <span className="text-xs text-[#888]">{new Date(n.createdAt).toLocaleString("fr-FR")}</span>
            </div>
            <p className="mt-2 text-[#555]">{n.body}</p>
            {n.title === "Validation produit vendeur" && !n.read && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    const productId = extractProductId(n.body);
                    if (!productId) {
                      toast.error("productId introuvable");
                      return;
                    }
                    void fetch("/api/admin/products/moderation", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ productId, action: "APPROVE", notificationId: n.id }),
                    }).then(async (r) => {
                      if (!r.ok) {
                        const d = await r.json().catch(() => ({}));
                        toast.error(typeof d.error === "string" ? d.error : "Action impossible");
                        return;
                      }
                      toast.success("Produit approuvé");
                      window.dispatchEvent(new Event("notifications:updated"));
                      load();
                    });
                  }}
                >
                  Approuver
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    const productId = extractProductId(n.body);
                    if (!productId) {
                      toast.error("productId introuvable");
                      return;
                    }
                    void fetch("/api/admin/products/moderation", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ productId, action: "REJECT", notificationId: n.id }),
                    }).then(async (r) => {
                      if (!r.ok) {
                        const d = await r.json().catch(() => ({}));
                        toast.error(typeof d.error === "string" ? d.error : "Action impossible");
                        return;
                      }
                      toast.success("Produit refusé");
                      window.dispatchEvent(new Event("notifications:updated"));
                      load();
                    });
                  }}
                >
                  Refuser
                </button>
              </div>
            )}
            {n.title === "Validation produit vendeur" && n.read ? (
              <p className="mt-3 text-xs font-semibold text-[#888]">Demande traitée</p>
            ) : null}
            {!n.read && (
              <button
                type="button"
                className="mt-3 text-xs font-medium text-[#00b8d9] hover:underline"
                onClick={(e) => {
                  e.stopPropagation();
                  void fetch("/api/notifications", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ id: n.id, read: true }),
                  }).then((r) => {
                    if (r.ok) {
                      window.dispatchEvent(new Event("notifications:updated"));
                      load();
                    }
                    else toast.error("Erreur");
                  });
                }}
              >
                Marquer comme lu
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
