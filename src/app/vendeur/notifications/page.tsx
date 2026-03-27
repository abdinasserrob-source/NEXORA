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

export default function SellerNotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);

  const load = () => {
    void fetch("/api/notifications", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setItems(d.notifications ?? []));
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

  return (
    <div className="px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-shop-text">Notifications</h1>
      <p className="mt-1 text-sm text-shop-muted">Messages liés à votre boutique et vos produits.</p>
      <ul className="mt-6 space-y-3">
        {items.length === 0 && <li className="text-sm text-shop-muted">Aucune notification.</li>}
        {items.map((n) => (
          <li
            key={n.id}
            onClick={() => {
              if (!n.read) {
                void fetch("/api/notifications", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ id: n.id, read: true }),
                }).then((r) => {
                  if (r.ok) {
                    window.dispatchEvent(new Event("notifications:updated"));
                    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                  }
                });
              }
            }}
            className={`rounded-2xl border border-white/10 p-4 text-sm ${
              n.read ? "bg-nexora-card/70" : "bg-[#1f2d4a]"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold text-shop-text">{n.title}</p>
              <span className="text-xs text-shop-muted">{new Date(n.createdAt).toLocaleString("fr-FR")}</span>
            </div>
            <p className="mt-2 text-shop-muted">{n.body}</p>
            {!n.read && (
              <button
                type="button"
                className="mt-3 text-xs font-medium text-shop-cyan hover:underline"
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
                    } else toast.error("Erreur");
                  });
                }}
              >
                Marquer comme lu
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

