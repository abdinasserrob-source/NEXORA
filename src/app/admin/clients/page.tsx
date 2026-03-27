"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type U = {
  id: string;
  email: string;
  role: string;
  banned: boolean;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

export default function AdminClientsPage() {
  const [users, setUsers] = useState<U[]>([]);
  const [err, setErr] = useState(false);

  const load = () => {
    void fetch("/api/admin/users", { credentials: "include" }).then(async (r) => {
      if (!r.ok) {
        setErr(true);
        return;
      }
      const d = await r.json();
      setUsers(d.users ?? []);
    });
  };

  useEffect(() => {
    load();
  }, []);

  if (err) {
    return (
      <main className="p-8 text-center text-[#666]">
        Accès refusé.{" "}
        <Link href="/connexion?next=/admin/clients" className="text-[#00b8d9]">
          Connexion
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-8 md:px-8">
      <h1 className="text-2xl font-bold text-[#1a2744]">Clients & utilisateurs</h1>
     
      <ul className="mt-6 max-w-3xl space-y-2 text-sm">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e8eaef] bg-white px-4 py-3"
          >
            <div>
              <span className="font-medium text-[#333]">{u.email}</span>
              <span className="ml-2 text-[#888]">
                ({u.role}){" "}
                {u.banned ? <span className="text-red-600">Banni</span> : null}
              </span>
              <p className="text-xs text-[#aaa]">
                {u.firstName} {u.lastName} · {new Date(u.createdAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs font-semibold text-[#00b8d9]"
                onClick={() =>
                  void fetch("/api/admin/users", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ userId: u.id, banned: !u.banned }),
                  }).then(() => {
                    toast.success(u.banned ? "Débanni" : "Banni");
                    load();
                  })
                }
              >
                {u.banned ? "Débannir" : "Bannir"}
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-red-600"
                onClick={async () => {
                  const ok = window.confirm(
                    `Supprimer définitivement ${u.email} ?\n\nAstuce: si ça échoue à cause de données liées, utilisez plutôt "Bannir".`
                  );
                  if (!ok) return;
                  const r = await fetch("/api/admin/users", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ userId: u.id }),
                  });
                  const d = await r.json().catch(() => ({}));
                  if (!r.ok) {
                    toast.error(typeof d.error === "string" ? d.error : "Suppression impossible");
                    return;
                  }
                  toast.success("Utilisateur supprimé");
                  setUsers((prev) => prev.filter((x) => x.id !== u.id));
                }}
              >
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
