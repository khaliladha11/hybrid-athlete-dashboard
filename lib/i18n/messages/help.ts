import { dict } from "../dict";

/** Isi halaman Bantuan (`lib/help.ts`) dan langkah sampai workout ada di jam (`lib/intervals/watch.ts`). */
export const HELP = dict(
  {
    intro: "Ringkasan cara memakai aplikasi. Panduan lengkap dan daftar keterbatasan ada di GitHub.",
    topics: {
      saran: {
        title: "Membaca saran Gita",
        items: [
          "Saran hari ini di Profil menyebut jenis latihan dan level (Easy, Moderate, High) beserta alasannya, misalnya resting HR naik atau sesi kemarin berat.",
          "Saran hanya menurunkan dan tidak pernah memblokir. Kamu tetap bebas memilih latihan lain.",
          "Check-in harian opsional: nyeri shin 4/10 ke atas membatasi lari ke Easy, pegal 7/10 atau tidur 2/5 menurunkan satu level. Beberapa pemicu tetap hanya turun satu level.",
          "Ambang pribadi (LTHR, HRV, resting HR) aktif sendiri setelah datanya cukup, kira-kira 30 hari.",
        ],
      },
      program: {
        title: "Program mingguan",
        items: [
          "Program disusun dari Hari H yang kamu pilih. Warna di kalender menunjukkan saran lama program; merah atau abu-abu hanya peringatan.",
          "Sesi minggu ini boleh dikerjakan di hari apa pun dalam minggunya. Hari di rencana hanya saran.",
          "Sesi yang tidak bisa dikerjakan bisa dilewati. Volume minggu berikutnya tidak bertambah.",
          "Kepatuhan dihitung otomatis dari aktivitas intervals.icu dan sesi strength yang dicatat.",
        ],
      },
      latihan: {
        title: "Mode latihan",
        items: [
          "Mulai dari Generator Strength. Centang setiap set; timer istirahat dan hitung mundur tahan berjalan sendiri.",
          "Setelah selesai, isi RPE sesi. RPE sesi dikali menit menjadi beban strength di saran lari.",
          "Mode latihan tetap jalan tanpa sinyal. Sesi terkirim saat online lagi.",
          "Semua set dirancang di RPE 7 atau lebih ringan.",
        ],
      },
      jam: {
        title: "Kirim ke jam",
        items: [
          "Kirim ke jam menaruh workout lari ke kalender intervals.icu, lalu intervals.icu meneruskannya ke jam yang terhubung.",
          "Pilih merek jam sekali di kartu Kirim ke jam. Langkah per merek ada di bawah.",
          "Kirim ulang memperbarui event yang sama, tidak menggandakan. Copy Set tetap tersedia bila tidak memakai intervals.icu.",
        ],
      },
      data: {
        title: "Cadangan & sinkron",
        items: [
          "Tanpa sinkron, data hanya ada di perangkat ini. Ekspor JSON berkala di Setting › Data & cadangan.",
          "Dengan Upstash Redis, data sama di semua perangkat dan ada cadangan otomatis harian. Riwayat cadangan bisa dipulihkan dan dibatalkan.",
          "Setelah pembaruan aplikasi, salinan data sebelum migrasi bisa diunduh di Setting › Data & cadangan.",
        ],
      },
    } as Record<string, { title: string; items: string[] }>,
    links: { guide: "Panduan lengkap", limitations: "Keterbatasan yang diketahui", references: "Dasar ilmiah" },
    disclaimer: "Aplikasi ini alat bantu perencanaan latihan, bukan saran medis. Hentikan latihan bila muncul nyeri.",
    watchOther: "Lainnya",
    watchSteps: {
      huawei: [
        "Biasanya masuk sendiri ke Huawei Health beberapa saat setelah dikirim (lari terencana berikutnya dalam seminggu).",
        "Belum muncul: buka event di kalender intervals.icu lalu ketuk Upload to Huawei.",
        "Di jam: Workout › Outdoor Run › Courses › Custom Courses. Belum ada di jam: buka Huawei Health › Olahraga › Lari luar ruangan › My running courses, lalu ketuk ikon jam.",
      ],
      garmin: ["intervals.icu mengunggah workout seminggu ke depan ke Garmin Connect.", "Muncul di jam setelah Garmin Connect sinkron dengan jam."],
      coros: ["intervals.icu mengunggah workout seminggu ke depan ke Coros.", "Belum muncul: tambahkan Intervals.icu Training Plan ke kalender aplikasi Coros."],
      other: ["Workout masuk ke kalender intervals.icu. Jam lain mengikuti halaman integrasi intervals.icu.", "Tanpa jam yang tersambung ke intervals.icu, pakai Copy Set."],
    },
  },
  {
    intro: "A short guide to using the app. The full guide and the list of known limitations are on GitHub.",
    topics: {
      saran: {
        title: "Reading Gita's advice",
        items: [
          "Today's advice in Profile names the workout type and level (Easy, Moderate, High) with the reason, for example a rising resting HR or a hard session yesterday.",
          "Advice only lowers and never blocks. You are still free to choose another workout.",
          "The daily check-in is optional: shin pain of 4/10 or more limits runs to Easy, soreness of 7/10 or sleep of 2/5 lowers one level. Several triggers together still lower only one level.",
          "Personal thresholds (LTHR, HRV, resting HR) turn on by themselves once there is enough data, about 30 days.",
        ],
      },
      program: {
        title: "Weekly program",
        items: [
          "The program is built from the race day you choose. Colors in the calendar show the suggested program length; red or grey are only warnings.",
          "This week's sessions can be done on any day of the week. The planned day is only a suggestion.",
          "Sessions you cannot do can be skipped. Next week's volume does not increase.",
          "Compliance is calculated automatically from intervals.icu activities and logged strength sessions.",
        ],
      },
      latihan: {
        title: "Workout mode",
        items: [
          "Start from the Strength generator. Check off each set; the rest timer and hold countdown run by themselves.",
          "When you finish, enter the session RPE. Session RPE times minutes becomes the strength load in the run advice.",
          "Workout mode keeps working without signal. The session is sent when you are back online.",
          "Every set is designed at RPE 7 or lighter.",
        ],
      },
      jam: {
        title: "Send to watch",
        items: [
          "Send to watch puts a run workout in the intervals.icu calendar, and intervals.icu passes it on to your connected watch.",
          "Pick your watch brand once in the Send to watch card. Steps per brand are below.",
          "Sending again updates the same event instead of duplicating it. Copy Set is still available if you do not use intervals.icu.",
        ],
      },
      data: {
        title: "Backup & sync",
        items: [
          "Without sync, your data lives only on this device. Export JSON regularly in Settings › Data & backup.",
          "With Upstash Redis, your data is the same on every device and is backed up automatically every day. Backup history can be restored and undone.",
          "After an app update, a copy of your data from before the migration can be downloaded in Settings › Data & backup.",
        ],
      },
    },
    links: { guide: "Full guide", limitations: "Known limitations", references: "Scientific basis" },
    disclaimer: "This app is a training planning aid, not medical advice. Stop training if pain appears.",
    watchOther: "Other",
    watchSteps: {
      huawei: [
        "It usually arrives in Huawei Health by itself shortly after sending (the next planned run within a week).",
        "Not showing yet: open the event in the intervals.icu calendar and tap Upload to Huawei.",
        // REVIEW: nama menu Huawei Health versi Inggris (Exercise › Outdoor run) belum dicek di aplikasi.
        "On the watch: Workout › Outdoor Run › Courses › Custom Courses. Not on the watch yet: open Huawei Health › Exercise › Outdoor run › My running courses, then tap the watch icon.",
      ],
      garmin: ["intervals.icu uploads the week ahead to Garmin Connect.", "It shows on the watch after Garmin Connect syncs with the watch."],
      coros: ["intervals.icu uploads the week ahead to Coros.", "Not showing yet: add the Intervals.icu Training Plan to the Coros app calendar."],
      other: ["The workout goes to the intervals.icu calendar. Other watches follow the intervals.icu integrations page.", "Without a watch connected to intervals.icu, use Copy Set."],
    },
  },
);
