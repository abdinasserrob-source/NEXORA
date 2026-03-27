import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/SiteChrome";
import { Providers } from "@/components/providers";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { BehaviorTracker } from "@/components/BehaviorTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXORA — E‑commerce intelligent",
  description: "NEXORA : catalogue complet, recommandations IA hybrides, fidélité et rôles vendeur/admin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>
          <BehaviorTracker />
          <SiteChrome>{children}</SiteChrome>
          <ChatbotWidget />
        </Providers>
      </body>
    </html>
  );
}
