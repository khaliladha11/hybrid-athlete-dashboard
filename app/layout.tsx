import { headers } from "next/headers";
import { OfflineAgent } from "@/components/offline/OfflineAgent";
import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { AppBar } from "@/components/ui/AppBar";
import { BottomNav } from "@/components/ui/BottomNav";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { TourProvider } from "@/components/onboarding/Tour";
import { SyncAgent } from "@/components/sync/SyncAgent";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { passcodeConfig } from "@/lib/auth/config";
import { redisEnv } from "@/lib/redis";
import { availability } from "@/lib/sync/server";
import { isDemoMode } from "@/lib/intervals/data-source";
import { THEME_BOOT_SCRIPT } from "@/lib/preference-keys";
import "./globals.css";

// Archivo variable (sumbu wdth untuk display condensed & ledger expanded) + Geist Mono untuk label.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-archivo",
});
const geistMono = Geist_Mono({ subsets: ["latin"], display: "swap", variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Hybrid Athlete Dashboard",
  description: "Profil atlet, data intervals.icu, dan generator latihan lari & strength.",
  applicationName: "Hybrid App",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hybrid App",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0c" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce CSP dari proxy.ts (0.16) untuk script tema inline.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    // data-theme dipasang oleh script boot sebelum hydrate → abaikan perbedaan atribut.
    <html lang="id" suppressHydrationWarning className={`${archivo.variable} ${geistMono.variable}`}>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh pt-[env(safe-area-inset-top)]">
        {/* iOS standalone + black-translucent: konten tembus ke bawah status bar.
            Strip gelap ini menjaga jam/baterai (teks putih) tetap terbaca di light mode. */}
        <div aria-hidden className="fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top)] bg-black" />
        {isDemoMode() && <DemoBanner />}
        {/* Mode offline (0.16): service worker, banner "Sedang offline", prompt versi baru. */}
        <OfflineAgent />
        <AppBar />
        {/* Sinkron hanya bila server menyatakan aktif (sandi + database); browser hanya menerima boolean. */}
        <SyncAgent enabled={availability(passcodeConfig(), redisEnv()).sync} />
        <TourProvider>
          <main className="safe-x mx-auto w-full max-w-xl pt-3 pb-[calc(7rem+env(safe-area-inset-bottom))]">
            <OnboardingGate>{children}</OnboardingGate>
          </main>
          <BottomNav />
        </TourProvider>
      </body>
    </html>
  );
}
