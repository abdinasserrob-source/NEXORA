"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminMobileNav } from "./AdminMobileNav";

export function AdminChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      <AdminSidebar />
      <div className="flex flex-1 flex-col lg:pl-60">
        <AdminMobileNav />
        {children}
      </div>
    </div>
  );
}
