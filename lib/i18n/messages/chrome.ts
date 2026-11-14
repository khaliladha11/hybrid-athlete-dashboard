/** Teks chrome: bilah atas, navigasi, metadata, halaman error, komponen UI umum. */
import { dict } from "../dict";

export const CHROME = dict(
  {
    meta: {
      description: "Profil atlet, data intervals.icu, dan generator latihan lari & strength.",
      offlineTitle: "Offline · Hybrid Athlete",
    },
    appBar: {
      home: "Beranda Hybrid Athlete",
      toDark: "Ganti ke mode gelap",
      toLight: "Ganti ke mode terang",
      darkTitle: "Mode gelap",
      lightTitle: "Mode terang",
      toEnglish: "Ganti bahasa ke English",
      toIndonesian: "Ganti bahasa ke Indonesia",
    },
    nav: {
      label: "Navigasi utama",
      profile: "Profil",
      run: "Lari",
      program: "Program",
      strength: "Strength",
      setting: "Setting",
    },
    demo: {
      lead: "Demo Mode:",
      body: "memakai data dummy. Isi",
      in: "di",
      tail: "untuk data asli.",
    },
    error: {
      title: "Terjadi kesalahan saat memuat halaman.",
      body: "Coba muat ulang. Jika berulang, cek log server.",
      retry: "Coba lagi",
    },
    notFound: {
      title: "Halaman tidak ditemukan",
      back: "Kembali ke profil",
    },
    offline: {
      title: "Halaman ini belum tersimpan untuk offline",
      body: "Buka halaman ini sekali saat online supaya bisa dibuka tanpa sinyal. Log ST dan check-in tetap tersimpan di perangkat.",
      open: "Buka Profil",
    },
    ui: {
      copied: "Tersalin",
      copyFailed: "Gagal menyalin",
      copy: "Copy",
      on: "Aktif",
      off: "Nonaktif",
      hours: "jam",
      minutes: "menit",
      seconds: "detik",
      prevInfo: "Info sebelumnya",
      nextInfo: "Info berikutnya",
      slideOf: (i: number, n: number) => `${i} dari ${n}`,
    },
  },
  {
    meta: {
      description: "Athlete profile, intervals.icu data, and a run & strength workout generator.",
      offlineTitle: "Offline · Hybrid Athlete",
    },
    appBar: {
      home: "Hybrid Athlete home",
      toDark: "Switch to dark mode",
      toLight: "Switch to light mode",
      darkTitle: "Dark mode",
      lightTitle: "Light mode",
      toEnglish: "Switch language to English",
      toIndonesian: "Switch language to Indonesian",
    },
    nav: {
      label: "Main navigation",
      profile: "Profile",
      run: "Run",
      program: "Program",
      strength: "Strength",
      setting: "Settings",
    },
    demo: {
      lead: "Demo Mode:",
      body: "using dummy data. Set",
      in: "in",
      tail: "for real data.",
    },
    error: {
      title: "Something went wrong while loading this page.",
      body: "Try reloading. If it keeps happening, check the server log.",
      retry: "Try again",
    },
    notFound: {
      title: "Page not found",
      back: "Back to profile",
    },
    offline: {
      title: "This page is not saved for offline use yet",
      body: "Open this page once while online so it can open without signal. ST logs and check-ins stay saved on this device.",
      open: "Open Profile",
    },
    ui: {
      copied: "Copied",
      copyFailed: "Copy failed",
      copy: "Copy",
      on: "On",
      off: "Off",
      hours: "hours",
      minutes: "minutes",
      seconds: "seconds",
      prevInfo: "Previous info",
      nextInfo: "Next info",
      slideOf: (i, n) => `${i} of ${n}`,
    },
  },
);
