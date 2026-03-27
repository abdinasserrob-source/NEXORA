import type { ReactNode } from "react";
import { SellerChrome } from "@/components/vendeur/SellerChrome";

export default function VendeurLayout({ children }: { children: ReactNode }) {
  return <SellerChrome>{children}</SellerChrome>;
}
