import type { Metadata, Viewport } from "next";
import { AppBar } from "@/components/ui/AppBar";
import { BottomNav } from "@/components/ui/BottomNav";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { isDemoMode } from "@/lib/intervals/data-source";
import { THEME_BOOT_SCRIPT } from "@/lib/preference-keys";
import "./globals.css";

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
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
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
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme dipasang oleh script boot sebelum hydrate → abaikan perbedaan atribut.
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh pt-[env(safe-area-inset-top)]">
        {/* iOS standalone + black-translucent: konten tembus ke bawah status bar.
            Strip gelap ini menjaga jam/baterai (teks putih) tetap terbaca di light mode. */}
        <div aria-hidden className="fixed inset-x-0 top-0 z-30 h-[env(safe-area-inset-top)] bg-black" />
        {isDemoMode() && <DemoBanner />}
        <AppBar />
        <main className="safe-x mx-auto w-full max-w-xl pt-3 pb-[calc(7rem+env(safe-area-inset-bottom))]">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
