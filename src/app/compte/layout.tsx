import { Suspense } from "react";
import { AccountShell } from "@/components/AccountShell";

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] bg-shop-bg px-4 py-16 text-center text-shop-muted">
          Chargement de votre espace…
        </div>
      }
    >
      <AccountShell>{children}</AccountShell>
    </Suspense>
  );
}
