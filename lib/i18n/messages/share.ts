import { dict } from "../dict";

/** Sheet ekspor kartu mingguan (`components/share/`). Teks di kartu itu sendiri ada di `lib/share-card.ts`. */
export const SHARE = dict(
  {
    share: "Bagikan",
    title: "Bagikan kartu minggu ini",
    intro: "PNG transparan untuk ditempel di atas foto. Tanpa nama dan tanpa alamat app.",
    close: "Tutup",
    preview: (w: number, h: number) => `Pratinjau kartu ${w}×${h}`,
    format: "Format",
    ink: "Warna teks",
    light: "Teks terang",
    dark: "Teks gelap",
    lang: "Bahasa kartu",
    download: "Unduh PNG",
    shareFailed: "Gagal membagikan. Coba Unduh PNG.",
    pngFailed: "Gagal membuat PNG. Coba lagi.",
  },
  {
    share: "Share",
    title: "Share this week's card",
    intro: "Transparent PNG to place over a photo. No name and no app address.",
    close: "Close",
    preview: (w, h) => `Card preview ${w}×${h}`,
    format: "Format",
    ink: "Text color",
    light: "Light text",
    dark: "Dark text",
    lang: "Card language",
    download: "Download PNG",
    shareFailed: "Could not share. Try Download PNG.",
    pngFailed: "Could not create the PNG. Try again.",
  },
);
