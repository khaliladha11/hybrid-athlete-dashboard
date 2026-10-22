#!/usr/bin/env node
/**
 * Audit pencocokan movement library ↔ free-exercise-db (Fase 1, fitur 0.9).
 *
 *   node scripts/audit-movement-media.mjs [path/ke/exercises.json]
 *
 * - Mengunduh dist/exercises.json dari free-exercise-db (Unlicense) — atau membaca
 *   file lokal bila path diberikan.
 * - Mencocokkan setiap gerakan di config/athlete-profile.json (termasuk pemanasan &
 *   pendinginan) dengan keputusan kurasi di AUDIT di bawah (dinilai manual dari
 *   instruksi & gambar), lalu menampilkan kandidat otomatis sebagai pembanding.
 * - Gagal (exit 1) bila ada gerakan library tanpa keputusan, atau ID yang dirujuk
 *   tidak ada / tidak punya 2 gambar. Jadi gerakan baru wajib diaudit dulu.
 * - Menulis laporan ke docs/movement-media-audit.md.
 *
 * Tidak mengunduh gambar dan tidak mengubah kode aplikasi.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGE_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";
const OUT = path.join(ROOT, "docs", "movement-media-audit.md");

/**
 * Keputusan kurasi. verdict:
 *   "exact"   ✅ gerakan sama (posisi, alat, pola gerak)
 *   "similar" 🟡 mirip tapi berbeda — default TIDAK dipakai sampai disetujui
 *   "none"    ⬜ tidak ada padanan yang layak
 * `ids` = ID free-exercise-db (kandidat utama dulu).
 */
const AUDIT = {
  // ---------- Upper Push ----------
  "Floor Press": { verdict: "exact", ids: ["Dumbbell_Floor_Press"], note: "Dumbbell floor press berbaring di lantai, sama persis." },
  "Seated Overhead Press": {
    verdict: "exact",
    ids: ["Seated_Dumbbell_Press"],
    note: "Duduk di bangku bersandaran, dua dumbbell — sama dengan versi kita.",
  },
  "Seated Lateral Raise": { verdict: "exact", ids: ["Seated_Side_Lateral_Raise"], note: "Duduk di ujung bangku, dua dumbbell ke samping." },
  "Overhead Triceps Extension": {
    verdict: "similar",
    ids: ["Seated_Triceps_Press", "Standing_Dumbbell_Triceps_Extension"],
    note: "Library kita tidak menyebut posisi. Seated_Triceps_Press = duduk bersandaran (lebih Spine-Friendly); Standing_Dumbbell_Triceps_Extension = berdiri. Pilih yang sesuai caramu.",
  },
  "High-Incline Push-Up": {
    verdict: "similar",
    ids: ["Incline_Push-Up"],
    note: "Pola sama, tetapi tumpuan di gambar setinggi bangku; versi kita high-incline (kursi/meja/dinding, lebih tinggi & lebih ringan).",
  },
  // ---------- Upper Pull ----------
  "Dead Hang": {
    verdict: "none",
    ids: [],
    note: "Tidak ada dead hang dua tangan menggantung penuh. Terdekat ditolak: One_Handed_Hang (satu tangan, kaki tetap di lantai), Scapular_Pull-Up (gerakan aktif scapula, bukan menggantung diam).",
  },
  "Negative Pull-Up": {
    verdict: "similar",
    ids: ["Pullups"],
    note: "Gambar pull-up penuh (naik dari bawah). Negative kita: mulai di atas, turun 3–5 detik — posisi sama tetapi urutan awal/akhir terbalik.",
  },
  "DB Farmer's Hold": {
    verdict: "similar",
    ids: ["Farmers_Walk"],
    note: "Versi berjalan dengan handle strongman; kita berdiri diam memegang dumbbell.",
  },
  "Seated DB Scapular Retraction": {
    verdict: "similar",
    ids: ["Middle_Back_Shrug"],
    note: "Retraksi scapula yang sama, tetapi telungkup di incline bench; kita duduk membungkuk.",
  },
  "Supported Single-Arm Row": {
    verdict: "similar",
    ids: ["One-Arm_Dumbbell_Row"],
    note: "Pola row sama; gambar memakai lutut + tangan di bangku, kita satu tangan bertumpu di kursi.",
  },
  "DB Floor Pullover": {
    verdict: "similar",
    ids: ["Straight-Arm_Dumbbell_Pullover", "Bent-Arm_Dumbbell_Pullover"],
    note: "Gambar melintang di bangku (pinggul menggantung, ROM lebih besar); kita di lantai — ROM dibatasi lantai, lebih aman untuk bahu & punggung.",
  },
  "Seated Bent-Over DB Face Pull": {
    verdict: "similar",
    ids: ["Seated_Bent-Over_Rear_Delt_Raise"],
    note: "Rear delt raise lengan hampir lurus ke samping; face pull kita menekuk siku menarik ke arah wajah dengan rotasi eksternal.",
  },
  "Reverse Wrist Curl": {
    verdict: "exact",
    ids: ["Seated_Dumbbell_Palms-Down_Wrist_Curl"],
    note: "Duduk, lengan bawah di paha, telapak menghadap bawah — sama.",
  },
  // ---------- Lower ----------
  "Barbell Sumo Deadlift / Hip Thrust": {
    verdict: "similar",
    ids: ["Barbell_Hip_Thrust", "Sumo_Deadlift", "Barbell_Glute_Bridge"],
    note: "Satu entri kita berisi dua gerakan; gambar hanya bisa satu. Cue kita mengutamakan Hip Thrust (Barbell_Hip_Thrust). Sumo_Deadlift di gambar memakai beban berat.",
  },
  "Barbell Squat": {
    verdict: "similar",
    ids: ["Barbell_Squat"],
    note: "Pola back squat sama, tetapi gambar memakai rack & plat besar (beban berat). Kita 10–16 kg tanpa rack — visual bisa memberi kesan beban berat yang berlawanan dengan Spine-Friendly.",
  },
  "DB RDL Wall-Tap Method": {
    verdict: "similar",
    ids: ["Stiff-Legged_Dumbbell_Deadlift"],
    note: "Stiff-legged: lutut hampir lurus, turun sampai kaki. Kita RDL hip hinge sampai pantat menyentuh dinding (lutut sedikit tekuk, ROM dibatasi).",
  },
  "Reverse Lunge": { verdict: "exact", ids: ["Dumbbell_Rear_Lunge"], note: "Langkah ke belakang dengan dua dumbbell — sama." },
  "Glute Bridge": { verdict: "exact", ids: ["Butt_Lift_Bridge"], note: "Glute bridge bodyweight berbaring di lantai — sama." },
  // ---------- Stabilitas & core ----------
  "Lateral Band Walk": {
    verdict: "similar",
    ids: ["Monster_Walk"],
    note: "Monster walk melangkah maju-mundur dengan band di pergelangan & lutut; kita melangkah ke samping.",
  },
  "Dead Bug": { verdict: "exact", ids: ["Dead_Bug"], note: "Sama, termasuk cue punggung bawah menempel lantai." },
  Clamshell: { verdict: "none", ids: [], note: "Tidak ada clamshell di database." },
  // ---------- Prehab ----------
  "Tibialis Wall Raise": {
    verdict: "none",
    ids: [],
    note: "Tidak ada. Terdekat ditolak: Anterior_Tibialis-SMR (foam rolling, bukan penguatan).",
  },
  "Eccentric Calf Raise": {
    verdict: "similar",
    ids: ["Standing_Dumbbell_Calf_Raise"],
    note: "Calf raise bilateral dengan dumbbell di papan; versi kita naik dua kaki, turun satu kaki perlahan, tanpa beban.",
  },
  // ---------- Pemanasan & pendinginan ----------
  "Kneeling Hip Flexor Stretch": { verdict: "exact", ids: ["Kneeling_Hip_Flexor"], note: "Sama." },
  "Cat-Cow": { verdict: "similar", ids: ["Cat_Stretch"], note: "Hanya fase cat (punggung membulat), tanpa fase cow." },
  "Band Pull-Apart": { verdict: "exact", ids: ["Band_Pull_Apart"], note: "Sama." },
  "Calf Stretch": { verdict: "exact", ids: ["Calf_Stretch_Hands_Against_Wall"], note: "Peregangan betis bertumpu di dinding — sama." },
  // ---------- Gerakan baru 0.9 (diambil dari free-exercise-db, lihat docs/movement-library-proposal.md) ----------
  "Band Reverse Fly": { verdict: "exact", ids: ["Back_Flyes_-_With_Bands"], note: "Ditambahkan dari database (0.9)." },
  "Single-Leg Glute Bridge": { verdict: "exact", ids: ["Single_Leg_Glute_Bridge"], note: "Ditambahkan dari database (0.9)." },
  "Rear-Foot-Elevated Split Squat": { verdict: "exact", ids: ["Split_Squat_with_Dumbbells"], note: "Ditambahkan dari database (0.9); kaki belakang di bangku." },
  "DB Step-Up": { verdict: "exact", ids: ["Dumbbell_Step_Ups"], note: "Ditambahkan dari database (0.9)." },
  "DB Plié Squat": { verdict: "exact", ids: ["Plie_Dumbbell_Squat"], note: "Ditambahkan dari database (0.9)." },
  "Seated Band Hamstring Curl": { verdict: "exact", ids: ["Seated_Band_Hamstring_Curl"], note: "Ditambahkan dari database (0.9)." },
  "Side Plank": { verdict: "exact", ids: ["Side_Bridge"], note: "Ditambahkan dari database (0.9); entri sumber tanpa teks instruksi." },
  "Standing Band Hip Abduction": { verdict: "exact", ids: ["Band_Hip_Adductions"], note: "Ditambahkan dari database (0.9); ID sumber bernama Adductions, gerakannya abduksi." },
  Plank: { verdict: "exact", ids: ["Plank"], note: "Ditambahkan dari database (0.9)." },
  "Seated Single-Leg Calf Raise": { verdict: "exact", ids: ["Dumbbell_Seated_One-Leg_Calf_Raise"], note: "Ditambahkan dari database (0.9)." },
  "DB Scaption": { verdict: "exact", ids: ["Dumbbell_Scaption"], note: "Ditambahkan dari database (0.9)." },
  "Band External Rotation": { verdict: "exact", ids: ["External_Rotation_with_Band"], note: "Ditambahkan dari database (0.9)." },
  "Quadruped Hip Circles": { verdict: "exact", ids: ["Hip_Circles_prone"], note: "Ditambahkan dari database (0.9)." },
  // ---------- 0.11.2 · tanpa alat ----------
  "Push-Up": { verdict: "exact", ids: ["Pushups"], note: "Ditambahkan dari database (0.11.2): push-up standar tanpa alat." },
  "Knee Push-Up": { verdict: "none", ids: [], note: "Tidak ada push-up bertumpu lutut di database (hanya Incline/Decline/variasi tangan). Tanpa gambar." },
  "Wall Push-Up": { verdict: "none", ids: [], note: "Tidak ada push-up ke dinding; Incline_Push-Up memakai bangku. Tanpa gambar." },
  "Prone Y-T-W Raise": { verdict: "none", ids: [], note: "Tidak ada gerakan Y/T/W tengkurap tanpa alat di database. Tanpa gambar." },
  "Prone Reverse Snow Angel": { verdict: "none", ids: [], note: "Tidak ada reverse snow angel di database; Superman (lumbar extension) sengaja tidak dipakai (Spine-Friendly). Tanpa gambar." },
};

/**
 * Keputusan pemilik untuk gerakan 🟡 (2026-10-12): ID yang disetujui, atau null = ditolak
 * (tampil "Gambar belum tersedia"). Gerakan 🟡 tanpa entri di sini = belum diputuskan → tidak dipakai.
 */
const DECISIONS = {
  "Overhead Triceps Extension": "Seated_Triceps_Press",
  "High-Incline Push-Up": "Incline_Push-Up",
  "Negative Pull-Up": null,
  "DB Farmer's Hold": "Farmers_Walk",
  "Seated DB Scapular Retraction": null,
  "Supported Single-Arm Row": "One-Arm_Dumbbell_Row",
  "DB Floor Pullover": "Bent-Arm_Dumbbell_Pullover",
  "Seated Bent-Over DB Face Pull": "Seated_Bent-Over_Rear_Delt_Raise",
  "Barbell Sumo Deadlift / Hip Thrust": "Barbell_Hip_Thrust",
  "Barbell Squat": "Barbell_Squat",
  "DB RDL Wall-Tap Method": "Stiff-Legged_Dumbbell_Deadlift",
  "Lateral Band Walk": "Monster_Walk",
  "Eccentric Calf Raise": "Standing_Dumbbell_Calf_Raise",
  "Cat-Cow": "Cat_Stretch",
};

/** ID gambar final per gerakan: cocok persis, atau 🟡 yang disetujui. null = tanpa gambar. */
function mediaId(name) {
  const a = AUDIT[name];
  if (a.verdict === "exact") return a.ids[0];
  if (a.verdict === "similar") return DECISIONS[name] ?? null;
  return null;
}

const CATEGORY_LABEL = {
  upperPush: "Upper Push",
  upperPull: "Upper Pull",
  lower: "Lower",
  stabilityAndCore: "Stabilitas & Core",
  prehab: "Prehab",
  warmupAndCooldown: "Pemanasan & Pendinginan",
};
const ICON = { exact: "✅", similar: "🟡", none: "⬜" };
const STOP = new Set(["db", "dumbbell", "barbell", "method", "with", "the", "seated", "supported", "high", "single", "arm"]);

const tokens = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));

/** Kandidat otomatis (pembanding, bukan keputusan): skor = token nama yang sama. */
function autoCandidates(name, exercises, n = 4) {
  const want = tokens(name);
  return exercises
    .map((e) => ({ e, score: tokens(e.name).filter((t) => want.some((w) => t.startsWith(w.slice(0, 5)))).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.e.name.length - b.e.name.length)
    .slice(0, n)
    .map((x) => x.e.id);
}

async function loadExercises() {
  const local = process.argv[2];
  if (local) return JSON.parse(await readFile(local, "utf8"));
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Gagal mengunduh ${DATA_URL}: HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const profile = JSON.parse(await readFile(path.join(ROOT, "config", "athlete-profile.json"), "utf8"));
  const exercises = await loadExercises();
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const lib = profile.movementLibrary;

  const rows = [];
  for (const cat of ["upperPush", "upperPull", "lower", "stabilityAndCore", "prehab"]) {
    for (const m of lib[cat] ?? []) rows.push({ cat, name: m.name, weight: m.weight, available: m.available !== false });
  }
  for (const name of lib.warmupAndCooldown ?? []) rows.push({ cat: "warmupAndCooldown", name, weight: "—", available: true });

  // Validasi: setiap gerakan diaudit, setiap ID ada & punya 2 gambar.
  const problems = [];
  for (const r of rows) {
    const a = AUDIT[r.name];
    if (!a) problems.push(`Gerakan "${r.name}" belum punya keputusan di AUDIT.`);
    for (const id of a?.ids ?? []) {
      const e = byId.get(id);
      if (!e) problems.push(`ID "${id}" (${r.name}) tidak ada di free-exercise-db.`);
      else if ((e.images ?? []).length < 2) problems.push(`ID "${id}" (${r.name}) tidak punya 2 gambar.`);
    }
  }
  for (const name of Object.keys(AUDIT)) if (!rows.some((r) => r.name === name)) problems.push(`AUDIT "${name}" tidak ada lagi di library.`);
  for (const [name, id] of Object.entries(DECISIONS)) {
    if (AUDIT[name]?.verdict !== "similar") problems.push(`DECISIONS "${name}" bukan gerakan 🟡.`);
    else if (id && !AUDIT[name].ids.includes(id)) problems.push(`DECISIONS "${name}" memilih ID di luar kandidat: ${id}.`);
  }
  if (problems.length) {
    console.error(problems.map((p) => `✕ ${p}`).join("\n"));
    process.exit(1);
  }

  const count = { exact: 0, similar: 0, none: 0 };
  for (const r of rows) count[AUDIT[r.name].verdict]++;

  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "# Audit media gerakan (free-exercise-db)",
    "",
    "> Fase 1 fitur 0.9. Dibuat oleh `node scripts/audit-movement-media.mjs` — jangan edit manual; ubah keputusan di `AUDIT` dalam script lalu jalankan ulang.",
    "",
    `- **Sumber:** [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (${exercises.length} gerakan), lisensi **Unlicense** (public domain).`,
    `- **Data:** \`${DATA_URL}\``,
    `- **Diperiksa:** ${today} · ${rows.length} gerakan (${rows.filter((r) => r.cat !== "warmupAndCooldown").length} gerakan inti + ${(lib.warmupAndCooldown ?? []).length} pemanasan/pendinginan).`,
    "- **Cara menilai:** instruksi setiap kandidat dibaca, dan gambar dicek untuk kasus yang meragukan. Cocok persis = posisi tubuh, alat, dan pola gerak sama.",
    "",
    "## Ringkasan",
    "",
    `- ✅ Cocok persis: **${count.exact}**`,
    `- 🟡 Mirip tapi berbeda: **${count.similar}** — default **tidak dipakai** sampai disetujui`,
    `- ⬜ Tidak ada: **${count.none}** — akan tampil "Gambar belum tersedia"`,
    "",
  ];

  for (const cat of Object.keys(CATEGORY_LABEL)) {
    const list = rows.filter((r) => r.cat === cat);
    if (!list.length) continue;
    lines.push(`## ${CATEGORY_LABEL[cat]}`, "");
    for (const r of list) {
      const a = AUDIT[r.name];
      const ids = a.ids.map((id) => `\`${id}\``).join(", ");
      const meta = a.ids[0] ? byId.get(a.ids[0]) : null;
      lines.push(`- ${ICON[a.verdict]} **${r.name}**${r.weight !== "—" ? ` (${r.weight})` : ""}${r.available ? "" : " · _belum aktif_"}`);
      if (ids) lines.push(`  - ID: ${ids}`);
      if (meta) lines.push(`  - Data: alat \`${meta.equipment ?? "—"}\`, level \`${meta.level}\`, otot utama ${meta.primaryMuscles.join(", ")}`);
      if (meta) lines.push(`  - Gambar: [awal](${IMAGE_BASE}${meta.images[0]}) · [akhir](${IMAGE_BASE}${meta.images[1]})`);
      lines.push(`  - Catatan: ${a.note}`);
      if (a.verdict !== "exact") {
        const auto = autoCandidates(r.name, exercises).filter((id) => !a.ids.includes(id));
        if (auto.length) lines.push(`  - Hasil pencarian nama lain (tidak dipilih): ${auto.map((id) => `\`${id}\``).join(", ")}`);
      }
    }
    lines.push("");
  }

  const similar = rows.filter((r) => AUDIT[r.name].verdict === "similar");
  const withMedia = rows.filter((r) => mediaId(r.name));
  lines.push(
    "## Keputusan pemilik (gerakan 🟡)",
    "",
    "Diputuskan 2026-10-12. ✓ = gambar kandidat dipakai; ✕ = ditolak, tampil \"Gambar belum tersedia\".",
    "",
    ...similar.map((r) => {
      const d = DECISIONS[r.name];
      if (d === undefined) return `- [ ] **${r.name}** → belum diputuskan (${AUDIT[r.name].ids.map((id) => `\`${id}\``).join(" / ")})`;
      return d ? `- ✓ **${r.name}** → \`${d}\`` : `- ✕ **${r.name}** → tanpa gambar`;
    }),
    "",
    "## Hasil akhir untuk Fase 3",
    "",
    `- Dengan gambar: **${withMedia.length}** gerakan`,
    `- Tanpa gambar (\"Gambar belum tersedia\"): **${rows.length - withMedia.length}** — ${rows
      .filter((r) => !mediaId(r.name))
      .map((r) => r.name)
      .join(", ")}`,
    "",
  );

  await writeFile(OUT, lines.join("\n"), "utf8");
  console.log(
    `✓ ${rows.length} gerakan: ${count.exact} cocok, ${count.similar} mirip, ${count.none} tidak ada; ${withMedia.length} dengan gambar → ${path.relative(ROOT, OUT)}`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
