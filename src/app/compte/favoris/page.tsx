import { Suspense } from "react";
import { WishlistContent } from "./WishlistContent";

export default function WishlistPage() {
  return (
    <Suspense fallback={<p className="text-sm text-shop-muted">Chargement des favoris…</p>}>
      <WishlistContent />
    </Suspense>
  );
}
