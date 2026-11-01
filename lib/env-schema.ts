/**
 * Satu sumber kebenaran variabel lingkungan (0.17, docs/RELEASE-1.0.md #9). Murni: dipakai tombol Deploy to Vercel
 * (README), `.env.example`, dan test yang memastikan setiap env yang dibaca kode tercantum di sini.
 *
 * Tombol Deploy mewajibkan key intervals.icu dan sandi aplikasi (keputusan pemilik 2026-11-01): perlindungan bawaan
 * Vercel hanya mengunci preview, jadi tanpa sandi domain produksi berisi data kesehatan terbuka untuk umum.
 * Nilai tidak pernah dimasukkan ke URL (docs Vercel: URL tersimpan di riwayat browser) dan tanpa `envDefaults`.
 */

export interface EnvVar {
  name: string;
  /** Diminta tombol Deploy to Vercel. */
  required: boolean;
  /** Rahasia: hanya diketik pengguna di Vercel/`.env.local`, tidak pernah di chat atau commit. */
  secret: boolean;
  description: string;
  /** Cara mendapatkan nilainya. */
  where: string;
}

export const ENV_VARS: readonly EnvVar[] = [
  {
    name: "INTERVALS_API_KEY",
    required: true,
    secret: true,
    description: "API key intervals.icu untuk membaca aktivitas & wellness dan mengirim workout ke kalender. Kosong = Demo Mode.",
    where: "intervals.icu › Settings › Developer Settings › API Key.",
  },
  {
    name: "APP_PASSCODE",
    required: true,
    secret: true,
    description: "Sandi aplikasi, minimal 8 karakter. Mengunci semua halaman dan API.",
    where: "Buat sendiri. Jangan pakai ulang sandi akun lain.",
  },
  {
    name: "SESSION_SECRET",
    required: true,
    secret: true,
    description: "Teks acak minimal 32 karakter untuk menandatangani sesi sandi.",
    where: "Buat di terminal: npm run secret, atau openssl rand -base64 32.",
  },
  {
    name: "INTERVALS_ATHLETE_ID",
    required: false,
    secret: false,
    description: "ID atlet intervals.icu. Kosong atau 0 = pemilik API key.",
    where: "intervals.icu › Settings, di bawah nama (diawali i). Biasanya tidak perlu diisi.",
  },
  {
    name: "UPSTASH_REDIS_REST_URL",
    required: false,
    secret: false,
    description: "Database untuk sinkron antar perangkat dan batas percobaan sandi. Diisi otomatis oleh integrasi Upstash di Vercel.",
    where: "Vercel › Storage › Upstash Redis › hubungkan ke project. Nama KV_REST_API_URL juga diterima.",
  },
  {
    name: "UPSTASH_REDIS_REST_TOKEN",
    required: false,
    secret: true,
    description: "Token database Upstash. Diisi otomatis oleh integrasi.",
    where: "Sama dengan di atas. Nama KV_REST_API_TOKEN juga diterima.",
  },
];

/** Nama alternatif yang juga dibaca kode (diisi integrasi Upstash versi Vercel KV). */
export const ENV_ALIASES: Record<string, string> = {
  KV_REST_API_URL: "UPSTASH_REDIS_REST_URL",
  KV_REST_API_TOKEN: "UPSTASH_REDIS_REST_TOKEN",
};

export const REQUIRED_ENV = ENV_VARS.filter((e) => e.required).map((e) => e.name);

export const UPSTREAM_REPO = "https://github.com/khaliladha11/hybrid-athlete-dashboard";
/** Bagian README yang menjelaskan setiap env (tujuan `envLink`). */
export const ENV_DOC_ANCHOR = "variabel-lingkungan";

/** URL tombol Deploy to Vercel (docs: vercel.com/docs/deploy-button). Tanpa nilai env dan tanpa `envDefaults`. */
export function deployButtonUrl(repoUrl = UPSTREAM_REPO): string {
  const q = new URLSearchParams({
    "repository-url": repoUrl,
    "project-name": "hybrid-athlete",
    "repository-name": "hybrid-athlete",
    env: REQUIRED_ENV.join(","),
    envDescription: "API key intervals.icu, sandi aplikasi, dan teks acak untuk sesi. Cara mendapatkannya ada di README.",
    envLink: `${repoUrl}#${ENV_DOC_ANCHOR}`,
  });
  return `https://vercel.com/new/clone?${q.toString()}`;
}
