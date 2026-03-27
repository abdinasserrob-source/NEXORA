"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { PreferencesProvider } from "@/components/PreferencesContext";

export function Providers({ children }: { children: React.ReactNode }) {
  const gid = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    void fetch("/api/session/bootstrap", { credentials: "include" }).catch(() => {});
  }, []);

  const inner = (
    <PreferencesProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#ffffff",
            color: "#1a1d26",
            border: "1px solid #e4e7ee",
            boxShadow: "0 8px 24px rgba(26,39,68,0.08)",
          },
        }}
      />
    </PreferencesProvider>
  );

  if (gid) {
    return <GoogleOAuthProvider clientId={gid}>{inner}</GoogleOAuthProvider>;
  }
  return inner;
}
