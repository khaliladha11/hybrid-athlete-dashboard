import { dict } from "../dict";

/**
 * Disclaimer (TermsStep), alasan gerakan tidak tersedia, peringatan kondisi, label peta otot, dan satuan preskripsi
 * strength. Konten keselamatan: arti sama persis di kedua bahasa.
 */
export const SAFETY = dict(
  {
    terms: {
      points: [
        {
          title: "Bukan saran medis.",
          body: "Aplikasi menyusun latihan dari aturan umum dan katalog kondisi berbasis riset. Konsultasikan dengan tenaga kesehatan bila ada cedera aktif, nyeri yang memburuk, atau kondisi medis.",
        },
        {
          title: "Kamu operator deploy-mu sendiri.",
          body: "Data dibaca dari intervals.icu milikmu ke deploy Vercel milikmu. Pengembang aplikasi tidak menerima datamu.",
        },
        {
          title: "Data ada di perangkat ini, dan di database milikmu bila sinkron aktif.",
          body: "Setting dan log tersimpan di browser ini. Bila kamu memasang Upstash Redis dan sandi aplikasi, data yang sama juga disimpan di database itu, di akun Vercel milikmu, tanpa enkripsi tambahan dari aplikasi. Hapus database untuk menghapus salinannya. Cadangkan lewat Setting › Data & cadangan.",
        },
      ],
      licenseTitle: "Lisensi.",
      // REVIEW: teks lama menyebut repo belum punya lisensi, padahal LICENSE (MIT) sudah ada. Diterjemahkan apa adanya.
      licenseBefore: "Repo ini belum mencantumkan lisensi. Gambar gerakan dari free-exercise-db (Unlicense), atribusinya di",
      accept: "Setuju dan lanjut",
      agree: "Saya mengerti dan setuju.",
      notLegal: "Teks ini bukan dokumen hukum.",
    },
    status: {
      notSelected: "Tidak dipilih",
      avoided: (labels: string) => `Dihindari: ${labels}`,
      needs: (items: string) => `Butuh ${items}`,
      needsBand: (band: string) => `Butuh band ${band}`,
      noLoads: (weight: string) => `Beban ${weight} tidak bisa dirakit dari alat`,
      notInLibrary: "tidak ada di library",
    },
    warning: {
      required: (movement: string, why: string) => `${movement} wajib untuk kondisi aktif, tetapi tidak tersedia (${why}).`,
      hip: (list: string) => `Kondisi aktif butuh stabilitas panggul, tetapi ${list} tidak tersedia.`,
    },
    muscles: {
      aria: (primary: string, secondary: string) => `Otot utama: ${primary}; sekunder: ${secondary}`,
      none: "tidak ada",
    },
    units: {
      perHand: "/tangan",
      perSide: "/sisi",
      min: "mnt",
      sec: "dtk",
      notes: "Catatan",
      phase: { warmup: "Pemanasan", main: "Inti", cooldown: "Pendinginan" } as Record<string, string>,
    },
  },
  {
    terms: {
      points: [
        {
          title: "Not medical advice.",
          body: "The app builds workouts from general rules and a research-based catalog of conditions. Consult a health professional if you have an active injury, pain that is getting worse, or a medical condition.",
        },
        {
          title: "You operate your own deploy.",
          body: "Data is read from your intervals.icu into your own Vercel deploy. The app's developer does not receive your data.",
        },
        {
          title: "Data is on this device, and in your own database when sync is on.",
          body: "Settings and logs are stored in this browser. If you set up Upstash Redis and an app passcode, the same data is also stored in that database, in your own Vercel account, without extra encryption from the app. Delete the database to delete that copy. Back up through Settings › Data & backup.",
        },
      ],
      licenseTitle: "License.",
      licenseBefore: "This repo does not list a license yet. Movement images are from free-exercise-db (Unlicense), with attribution in",
      accept: "Agree and continue",
      agree: "I understand and agree.",
      notLegal: "This text is not a legal document.",
    },
    status: {
      notSelected: "Not selected",
      avoided: (labels) => `Avoided: ${labels}`,
      needs: (items) => `Needs ${items}`,
      needsBand: (band) => `Needs a ${band} band`,
      noLoads: (weight) => `The ${weight} load cannot be built from your equipment`,
      notInLibrary: "not in the library",
    },
    warning: {
      required: (movement, why) => `${movement} is required for an active condition, but it is not available (${why}).`,
      hip: (list) => `An active condition needs pelvic stability, but ${list} are not available.`,
    },
    muscles: {
      aria: (primary, secondary) => `Main muscles: ${primary}; secondary: ${secondary}`,
      none: "none",
    },
    units: {
      perHand: "/hand",
      perSide: "/side",
      min: "min",
      sec: "sec",
      notes: "Notes",
      phase: { warmup: "Warm-up", main: "Main", cooldown: "Cool-down" },
    },
  },
);
