/**
 * Teks halaman Bantuan (1.0.0-rc.2, `/bantuan`; murni, tanpa logika). Versi panjangnya di docs/GUIDE.md, keterbatasan
 * di docs/LIMITATIONS.md. Langkah kirim ke jam per merek tidak ditulis ulang di sini: halaman memakai `WATCH_STEPS`
 * (`lib/intervals/watch.ts`) supaya sama persis dengan yang tampil setelah kirim.
 */
import { DOCS } from "./docs-links";

export interface HelpTopic {
  id: string;
  title: string;
  items: readonly string[];
}

export const HELP_INTRO = "Ringkasan cara memakai aplikasi. Panduan lengkap dan daftar keterbatasan ada di GitHub.";

export const HELP_TOPICS: readonly HelpTopic[] = [
  {
    id: "saran",
    title: "Membaca saran Gita",
    items: [
      "Saran hari ini di Profil menyebut jenis latihan dan level (Easy, Moderate, High) beserta alasannya, misalnya resting HR naik atau sesi kemarin berat.",
      "Saran hanya menurunkan dan tidak pernah memblokir. Kamu tetap bebas memilih latihan lain.",
      "Check-in harian opsional: nyeri shin 4/10 ke atas membatasi lari ke Easy, pegal 7/10 atau tidur 2/5 menurunkan satu level. Beberapa pemicu tetap hanya turun satu level.",
      "Ambang pribadi (LTHR, HRV, resting HR) aktif sendiri setelah datanya cukup, kira-kira 30 hari.",
    ],
  },
  {
    id: "program",
    title: "Program mingguan",
    items: [
      "Program disusun dari Hari H yang kamu pilih. Warna di kalender menunjukkan saran lama program; merah atau abu-abu hanya peringatan.",
      "Sesi minggu ini boleh dikerjakan di hari apa pun dalam minggunya. Hari di rencana hanya saran.",
      "Sesi yang tidak bisa dikerjakan bisa dilewati. Volume minggu berikutnya tidak bertambah.",
      "Kepatuhan dihitung otomatis dari aktivitas intervals.icu dan sesi strength yang dicatat.",
    ],
  },
  {
    id: "latihan",
    title: "Mode latihan",
    items: [
      "Mulai dari Generator Strength. Centang setiap set; timer istirahat dan hitung mundur tahan berjalan sendiri.",
      "Setelah selesai, isi RPE sesi. RPE sesi dikali menit menjadi beban strength di saran lari.",
      "Mode latihan tetap jalan tanpa sinyal. Sesi terkirim saat online lagi.",
      "Semua set dirancang di RPE 7 atau lebih ringan.",
    ],
  },
  {
    id: "jam",
    title: "Kirim ke jam",
    items: [
      "Kirim ke jam menaruh workout lari ke kalender intervals.icu, lalu intervals.icu meneruskannya ke jam yang terhubung.",
      "Pilih merek jam sekali di kartu Kirim ke jam. Langkah per merek ada di bawah.",
      "Kirim ulang memperbarui event yang sama, tidak menggandakan. Copy Set tetap tersedia bila tidak memakai intervals.icu.",
    ],
  },
  {
    id: "data",
    title: "Cadangan & sinkron",
    items: [
      "Tanpa sinkron, data hanya ada di perangkat ini. Ekspor JSON berkala di Setting › Data & cadangan.",
      "Dengan Upstash Redis, data sama di semua perangkat dan ada cadangan otomatis harian. Riwayat cadangan bisa dipulihkan dan dibatalkan.",
      "Setelah pembaruan aplikasi, salinan data sebelum migrasi bisa diunduh di Setting › Data & cadangan.",
    ],
  },
];

export const HELP_LINKS: readonly { label: string; href: string }[] = [
  { label: "Panduan lengkap", href: DOCS.guide },
  { label: "Keterbatasan yang diketahui", href: DOCS.limitations },
  { label: "Dasar ilmiah", href: DOCS.references },
];

export const HELP_DISCLAIMER = "Aplikasi ini alat bantu perencanaan latihan, bukan saran medis. Hentikan latihan bila muncul nyeri.";
