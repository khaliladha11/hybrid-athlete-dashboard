// Sekali jalan, sebelum config/athlete-profile.json dinetralkan (0.11.0):
// salin profil di JSON menjadi file impor `owner-settings.local.json` (format cadangan v3,
// kind "defaults", tanpa log). File *.local.json diabaikan git, jadi data pribadi tidak ikut ter-commit.
//
// Pemakaian: node scripts/make-owner-settings.mjs [config/athlete-profile.json] [owner-settings.local.json]
import { readFileSync, writeFileSync } from "node:fs";

const [src = "config/athlete-profile.json", out = "owner-settings.local.json"] = process.argv.slice(2);
const p = JSON.parse(readFileSync(src, "utf8"));

if (!p.name) {
  console.error(`✕ ${src} sudah netral (nama kosong). Tidak ada yang perlu dimigrasi.`);
  process.exit(1);
}

const zones = {};
for (const [k, v] of Object.entries(p.runZones ?? {})) if (typeof v?.pace === "string") zones[k] = v.pace;

const movements = {};
for (const [cat, list] of Object.entries(p.movementLibrary ?? {})) {
  if (cat === "warmupAndCooldown" || !Array.isArray(list)) continue;
  for (const m of list) if (m.available === false) movements[m.name] = false;
}

const data = {
  app: "hybrid-athlete",
  version: 3,
  kind: "defaults",
  exportedAt: new Date().toISOString(),
  note: "Profil lama dari config/athlete-profile.json. Impor hanya mengisi bagian yang masih kosong di perangkat.",
  settings: {
    version: 1,
    profile: {
      name: p.name,
      ...(p.age ? { age: p.age } : {}),
      ...(p.occupation ? { occupation: p.occupation } : {}),
      ...(p.category ? { category: p.category } : {}),
      goals: p.targets?.goals ?? [],
      raceTargets: p.targets?.raceTargets ?? [],
      ...(p.training?.blockStart ? { blockStart: p.training.blockStart } : {}),
    },
    conditions: p.conditions ?? [],
    customConditions: [],
    runZones: zones,
    equipment: p.equipment,
    movements,
  },
  preferences: { blockEnabled: Boolean(p.training?.blockStart) },
};

writeFileSync(out, JSON.stringify(data, null, 2) + "\n");
console.log(`✓ ${out} dibuat dari ${src} (${Object.keys(zones).length} zona, ${p.conditions?.length ?? 0} kondisi, tanpa log).`);
