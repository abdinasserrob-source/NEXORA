"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/retours", label: "Retours" },
  { href: "/admin/vendeurs", label: "Vendeurs" },
  { href: "/admin/promo-produits", label: "Promo produits" },
  { href: "/admin/parametres", label: "Réglages" },
  { href: "/admin/reviews", label: "Avis" },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#e8eaef] bg-white px-4 py-3 lg:hidden">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-[#1a2744]">
          <LayoutDashboard className="size-5 text-[#00d4ff]" />
          Admin
        </Link>
        <button
          type="button"
          className="rounded-lg border border-[#e8eaef] p-2 text-[#555]"
          aria-expanded={open}
          aria-label="Menu admin"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <nav className="mt-3 flex flex-col gap-1 border-t border-[#f0f0f0] pt-3">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                pathname === href || (href !== "/admin" && pathname.startsWith(href))
                  ? "bg-[#e8f8fb] text-[#0088a3]"
                  : "text-[#555]"
              )}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-2 text-sm text-[#888]"
          >
            ← Boutique
          </Link>
        </nav>
      )}
    </div>
  );
}
