"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Envoie PAGE_VIEW + mesure de scroll (étape 2). */
export function BehaviorTracker() {
  const pathname = usePathname();
  const start = useRef(Date.now());

  useEffect(() => {
    start.current = Date.now();
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type: "PAGE_VIEW", path: pathname }),
    });

    const onScroll = () => {
      const doc = document.documentElement;
      const pct = Math.round(
        ((doc.scrollTop + doc.clientHeight) / doc.scrollHeight) * 100
      );
      if (pct >= 25 && pct % 25 < 5) {
        void fetch("/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            type: "SCROLL_DEPTH",
            path: pathname,
            meta: { scrollPct: pct },
          }),
        });
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      const ms = Date.now() - start.current;
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "PAGE_VIEW",
          path: pathname,
          meta: { durationMs: ms },
        }),
      });
    };
  }, [pathname]);

  return null;
}
