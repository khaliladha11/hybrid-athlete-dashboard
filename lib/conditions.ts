/**
 * Katalog kondisi & batasan atlet (murni, tanpa I/O).
 *
 * Setiap kondisi memetakan rekomendasi dari sumber kredibel (guideline klinis,
 * consensus statement, atau studi) ke aturan yang bisa dijalankan generator.
 * Aturan hanya memakai gerakan yang ADA di movement library — kondisi tidak
 * pernah menambah gerakan baru, hanya mewajibkan, melarang, atau memberi catatan.
 *
 * Aturan umum (RPE ≤ 7, beban ≤ library & alat, long run ≤ 10%/minggu, 80/20)
 * tidak ada di sini karena SELALU berlaku, apa pun kondisinya.
 */

export const CONDITION_IDS = [
  "apt",
  "shin",
  "overpronation",
  "mcu",
  "lbp",
  "pfp",
  "itbs",
  "achilles",
  "plantar",
  "shoulder",
] as const;

export type ConditionId = (typeof CONDITION_IDS)[number];

export interface ConditionSource {
  label: string;
  url?: string;
}

export interface ConditionRules {
  /** Spine-Friendly Protocol: larang pola axial loading berat tanpa tumpuan. */
  spineFriendly?: boolean;
  /** Gerakan library yang wajib ada di sesi Lower/Full Body. */
  requiredLower?: string[];
  /** Minimal satu gerakan stabilitas panggul (gluteus medius) di Lower/Full Body. */
  hipStability?: boolean;
  /** Gerakan library yang tidak boleh diresepkan. */
  exclude?: string[];
  /** Catatan untuk sesi strength. */
  strengthNotes?: string[];
  /** Pengingat cadence 175–180 SPM (gait retraining). */
  cadenceCue?: boolean;
  /** Cue "rel kereta" anti-crossover. */
  crossoverCue?: boolean;
  /** Hindari sprint sangat pendek (15/15) — pilih interval 4×4. */
  avoidSprints?: boolean;
  /** Catatan untuk sesi lari. */
  runNotes?: string[];
}

export interface ConditionDef {
  id: ConditionId;
  label: string;
  /** Ringkasan efek ke latihan, tampil di Setting. */
  effect: string;
  rules: ConditionRules;
  sources: ConditionSource[];
}

export const CONDITIONS: Record<ConditionId, ConditionDef> = {
  apt: {
    id: "apt",
    label: "Anterior Pelvic Tilt / Hiperlordosis",
    effect: "Spine-Friendly Protocol: tanpa beban axial berat tanpa tumpuan; Dead Bug (anti-ekstensi) wajib di Lower/Full Body.",
    rules: {
      spineFriendly: true,
      requiredLower: ["Dead Bug"],
      strengthNotes: ["Spine-Friendly: tanpa beban axial berat tanpa tumpuan. Rib cage turun, core aktif di setiap gerakan."],
    },
    sources: [
      { label: "McGill S. Low Back Disorders, 3rd ed. Human Kinetics, 2016 (latihan spine-sparing & anti-ekstensi)" },
      { label: "Haff GG, Triplett NT (eds). NSCA Essentials of Strength Training and Conditioning, 4th ed., 2016" },
    ],
  },
  shin: {
    id: "shin",
    label: "Riwayat Shin Splints (MTSS)",
    effect: "Prehab Tibialis Wall Raise + Eccentric Calf Raise wajib di Lower/Full Body; pengingat cadence & tanda bahaya nyeri tulang kering.",
    rules: {
      requiredLower: ["Tibialis Wall Raise", "Eccentric Calf Raise"],
      cadenceCue: true,
      runNotes: ["Nyeri tulang kering yang makin terasa saat lari → hentikan dan ganti jalan. Hindari menambah km & intensitas di minggu yang sama."],
    },
    sources: [
      { label: "Winters M, et al. Treatment of medial tibial stress syndrome: a systematic review. Sports Med. 2013;43(12):1315–33", url: "https://doi.org/10.1007/s40279-013-0087-0" },
      { label: "Nielsen RO, et al. Excessive progression in weekly running distance and risk of running-related injuries. JOSPT. 2014;44(10):739–47", url: "https://doi.org/10.2519/jospt.2014.5164" },
      { label: "Heiderscheit BC, et al. Effects of step rate manipulation on joint mechanics during running. MSSE. 2011;43(2):296–302", url: "https://doi.org/10.1249/MSS.0b013e3181ebedf4" },
    ],
  },
  overpronation: {
    id: "overpronation",
    label: "Overpronation / Crossover Gait",
    effect: "Stabilitas gluteus medius wajib di Lower/Full Body; cue cadence 175–180 SPM dan \"rel kereta\" (anti-crossover) di setiap lari.",
    rules: { hipStability: true, cadenceCue: true, crossoverCue: true },
    sources: [
      { label: "Willy RW, Davis IS. The effect of a hip-strengthening program on mechanics during running and during a single-leg squat. JOSPT. 2011;41(9):625–32", url: "https://doi.org/10.2519/jospt.2011.3470" },
      { label: "Meardon SA, Campbell S, Derrick TR. Step width alters iliotibial band strain during running. Sports Biomech. 2012;11(4):464–72", url: "https://doi.org/10.1080/14763141.2012.699547" },
      { label: "Heiderscheit BC, et al. MSSE. 2011;43(2):296–302", url: "https://doi.org/10.1249/MSS.0b013e3181ebedf4" },
    ],
  },
  mcu: {
    id: "mcu",
    label: "Jeda latihan beban 24–48 jam sebelum MCU / tes darah",
    effect: "Catatan di sesi strength: latihan beban bisa menaikkan CK, AST, dan ALT sampai beberapa hari sehingga hasil tes darah tampak abnormal.",
    rules: { strengthNotes: ["Jeda latihan beban berat 24–48 jam sebelum MCU/tes darah (enzim otot & hati bisa naik sementara)."] },
    sources: [
      { label: "Pettersson J, et al. Muscular exercise can cause highly pathological liver function tests in healthy men. Br J Clin Pharmacol. 2008;65(2):253–9", url: "https://doi.org/10.1111/j.1365-2125.2007.03001.x" },
    ],
  },
  lbp: {
    id: "lbp",
    label: "Nyeri punggung bawah (non-spesifik)",
    effect: "Spine-Friendly, tanpa Barbell Squat (beban axial), Dead Bug wajib di Lower/Full Body; tetap aktif bergerak.",
    rules: {
      spineFriendly: true,
      exclude: ["Barbell Squat"],
      requiredLower: ["Dead Bug"],
      strengthNotes: ["Nyeri punggung bawah: tetap bergerak, nyeri ringan (≤ 3/10) yang reda setelah sesi masih wajar. Nyeri menjalar, kebas, atau kesemutan → hentikan & periksa ke tenaga medis."],
    },
    sources: [
      { label: "NICE guideline NG59. Low back pain and sciatica in over 16s: assessment and management. 2016 (update 2020)", url: "https://www.nice.org.uk/guidance/ng59" },
      { label: "Hayden JA, et al. Exercise therapy for chronic low back pain. Cochrane Database Syst Rev. 2021;9:CD009790", url: "https://doi.org/10.1002/14651858.CD009790.pub2" },
      { label: "McGill S. Low Back Disorders, 3rd ed. 2016" },
    ],
  },
  pfp: {
    id: "pfp",
    label: "Nyeri lutut depan (Patellofemoral Pain / runner's knee)",
    effect: "Penguatan pinggul (stabilitas panggul) wajib di Lower/Full Body; cue cadence (naik 5–10%); pantau nyeri ≤ 3/10.",
    rules: {
      hipStability: true,
      cadenceCue: true,
      strengthNotes: ["Lutut: kombinasi penguatan pinggul + lutut paling efektif. Nyeri ≤ 3/10 saat latihan masih boleh, asal tidak bertambah keesokan harinya."],
      runNotes: ["Lutut depan: kurangi turunan curam; naikkan cadence 5–10% untuk menurunkan beban sendi patellofemoral."],
    },
    sources: [
      { label: "Willy RW, et al. Patellofemoral Pain: Clinical Practice Guidelines. JOSPT. 2019;49(9):CPG1–CPG95", url: "https://doi.org/10.2519/jospt.2019.0302" },
      { label: "Crossley KM, et al. 2016 Patellofemoral pain consensus statement. Br J Sports Med. 2016;50(14):839–43", url: "https://doi.org/10.1136/bjsports-2016-096384" },
    ],
  },
  itbs: {
    id: "itbs",
    label: "IT Band Syndrome (nyeri lutut sisi luar)",
    effect: "Penguatan abduktor pinggul (stabilitas panggul) wajib di Lower/Full Body; cue anti-crossover & cadence; hindari turunan panjang.",
    rules: {
      hipStability: true,
      cadenceCue: true,
      crossoverCue: true,
      runNotes: ["ITB: hindari turunan panjang & jalan miring (camber) yang sama terus; langkah tidak menyilang garis tengah."],
    },
    sources: [
      { label: "Fredericson M, et al. Hip abductor weakness in distance runners with iliotibial band syndrome. Clin J Sport Med. 2000;10(3):169–75", url: "https://doi.org/10.1097/00042752-200007000-00004" },
      { label: "Meardon SA, Campbell S, Derrick TR. Sports Biomech. 2012;11(4):464–72", url: "https://doi.org/10.1080/14763141.2012.699547" },
    ],
  },
  achilles: {
    id: "achilles",
    label: "Tendinopati Achilles",
    effect: "Eccentric Calf Raise wajib di Lower/Full Body; interval berat memakai 4×4 (tanpa sprint 15/15); pantau nyeri ≤ 5/10.",
    rules: {
      requiredLower: ["Eccentric Calf Raise"],
      avoidSprints: true,
      runNotes: ["Achilles: nyeri saat lari ≤ 5/10 dan harus kembali normal besok paginya (pain-monitoring model). Hindari sprint & tanjakan curam."],
    },
    sources: [
      { label: "Alfredson H, et al. Heavy-load eccentric calf muscle training for chronic Achilles tendinosis. Am J Sports Med. 1998;26(3):360–6", url: "https://doi.org/10.1177/03635465980260030301" },
      { label: "Silbernagel KG, et al. Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy. Am J Sports Med. 2007;35(6):897–906", url: "https://doi.org/10.1177/0363546506298279" },
    ],
  },
  plantar: {
    id: "plantar",
    label: "Plantar fasciitis / nyeri tumit",
    effect: "Eccentric Calf Raise (penguatan betis) wajib di Lower/Full Body; peregangan betis di pendinginan.",
    rules: {
      requiredLower: ["Eccentric Calf Raise"],
      runNotes: ["Tumit: nyeri langkah pertama di pagi hari yang memburuk → kurangi volume lari. Regangkan betis setelah lari."],
    },
    sources: [
      { label: "Martin RL, et al. Heel pain—plantar fasciitis: revision 2014. Clinical Practice Guidelines. JOSPT. 2014;44(11):A1–33", url: "https://doi.org/10.2519/jospt.2014.0303" },
      { label: "Rathleff MS, et al. High-load strength training improves outcome in patients with plantar fasciitis. Scand J Med Sci Sports. 2015;25(3):e292–300", url: "https://doi.org/10.1111/sms.12313" },
    ],
  },
  shoulder: {
    id: "shoulder",
    label: "Nyeri bahu (subacromial pain / impingement)",
    effect: "Tanpa gerakan overhead (Seated Overhead Press, Overhead Triceps Extension, DB Floor Pullover) dan Close-Grip Push-Up; latihan scapula tetap jalan.",
    rules: {
      exclude: ["Seated Overhead Press", "Overhead Triceps Extension", "DB Floor Pullover", "Close-Grip Push-Up"],
      strengthNotes: ["Bahu: hindari posisi lengan di atas kepala yang memicu nyeri; fokus kontrol scapula (retraction, face pull). Dead Hang dihentikan bila nyeri."],
    },
    sources: [
      { label: "Diercks R, et al. Guideline for diagnosis and treatment of subacromial pain syndrome. Acta Orthop. 2014;85(3):314–22", url: "https://doi.org/10.3109/17453674.2014.920991" },
      { label: "Littlewood C, et al. Exercise for rotator cuff tendinopathy: a systematic review. Physiotherapy. 2012;98(2):101–9", url: "https://doi.org/10.1016/j.physio.2011.08.002" },
    ],
  },
};

export function isConditionId(x: unknown): x is ConditionId {
  return typeof x === "string" && (CONDITION_IDS as readonly string[]).includes(x);
}

/** Gabungan aturan dari semua kondisi aktif (yang dipakai generator & validator). */
export interface ActiveRules {
  spineFriendly: boolean;
  requiredLower: string[];
  hipStability: boolean;
  exclude: string[];
  strengthNotes: string[];
  cadenceCue: boolean;
  crossoverCue: boolean;
  avoidSprints: boolean;
  runNotes: string[];
}

export function combineRules(active: readonly ConditionId[]): ActiveRules {
  const defs = CONDITION_IDS.filter((id) => active.includes(id)).map((id) => CONDITIONS[id].rules);
  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    spineFriendly: defs.some((r) => r.spineFriendly),
    requiredLower: uniq(defs.flatMap((r) => r.requiredLower ?? [])),
    hipStability: defs.some((r) => r.hipStability),
    exclude: uniq(defs.flatMap((r) => r.exclude ?? [])),
    strengthNotes: uniq(defs.flatMap((r) => r.strengthNotes ?? [])),
    cadenceCue: defs.some((r) => r.cadenceCue),
    crossoverCue: defs.some((r) => r.crossoverCue),
    avoidSprints: defs.some((r) => r.avoidSprints),
    runNotes: uniq(defs.flatMap((r) => r.runNotes ?? [])),
  };
}

/** Kondisi aktif yang mewajibkan / melarang sebuah gerakan (untuk label di Setting). */
export function conditionsRequiring(movement: string, active: readonly ConditionId[]): ConditionId[] {
  return active.filter((id) => CONDITIONS[id].rules.requiredLower?.includes(movement));
}

export function conditionsExcluding(movement: string, active: readonly ConditionId[]): ConditionId[] {
  return active.filter((id) => CONDITIONS[id].rules.exclude?.includes(movement));
}
