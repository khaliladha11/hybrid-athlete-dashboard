/**
 * Media & info teknik setiap gerakan di movement library (fitur 0.9).
 *
 * - Gambar dari free-exercise-db (Unlicense / public domain), diunduh & dikonversi ke WebP
 *   oleh `scripts/fetch-movement-media.mjs` ke public/movements/<slug>/{0,1}.webp.
 *   Pemilihan ID mengikuti audit di docs/movement-media-audit.md (✅ cocok + 🟡 yang disetujui).
 * - Gerakan tanpa padanan: `images: null` → UI menampilkan "Gambar belum tersedia".
 * - Cue ditulis sendiri (bukan salinan instruksi sumber).
 *
 * File ini sengaja tanpa import runtime ber-alias supaya bisa dibaca langsung oleh script Node.
 */
import type { ConditionId } from "../conditions";

export interface MovementMedia {
  /** Folder di public/movements/<slug>/. */
  slug: string;
  /** [posisi awal, posisi akhir], atau null bila belum ada gambar. */
  images: readonly [string, string] | null;
  source: "free-exercise-db" | null;
  sourceId: string | null;
  license: "Unlicense" | null;
  /** Perbedaan gambar dengan versi kita (untuk gerakan 🟡 yang disetujui). */
  imageNote?: string;
  /** 2–3 cue teknik singkat. */
  cues: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  /** Catatan teknik saat kondisi tertentu aktif. */
  conditionNotes?: Partial<Record<ConditionId, string>>;
}

type Info = Omit<MovementMedia, "slug" | "images" | "source" | "sourceId" | "license">;

const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const fromDb = (name: string, sourceId: string, info: Info): [string, MovementMedia] => {
  const slug = slugify(name);
  return [
    name,
    { slug, images: [`/movements/${slug}/0.webp`, `/movements/${slug}/1.webp`], source: "free-exercise-db", sourceId, license: "Unlicense", ...info },
  ];
};

const noImage = (name: string, info: Info): [string, MovementMedia] => [
  name,
  { slug: slugify(name), images: null, source: null, sourceId: null, license: null, ...info },
];

export const MOVEMENT_MEDIA: Record<string, MovementMedia> = Object.fromEntries([
  // ---------------- Upper Push ----------------
  fromDb("Floor Press", "Dumbbell_Floor_Press", {
    cues: ["Siku ±45° dari badan, turun sampai lengan atas menyentuh lantai.", "Punggung bawah tetap menempel lantai, lutut ditekuk."],
    primaryMuscles: ["Dada", "Trisep"],
    secondaryMuscles: ["Bahu depan"],
    conditionNotes: { apt: "Lutut ditekuk supaya punggung bawah rata di lantai.", shoulder: "Hentikan di titik nyeri; siku jangan terbuka 90°." },
  }),
  fromDb("Seated Overhead Press", "Seated_Dumbbell_Press", {
    cues: ["Duduk bersandar penuh, rib cage turun.", "Dorong dumbbell ke atas tanpa melengkungkan punggung bawah."],
    primaryMuscles: ["Bahu"],
    secondaryMuscles: ["Trisep"],
    conditionNotes: { apt: "Punggung tetap menempel sandaran, jangan melengkung saat mendorong." },
  }),
  fromDb("Seated Lateral Raise", "Seated_Side_Lateral_Raise", {
    cues: ["Angkat ke samping sampai setinggi bahu saja.", "Siku sedikit ditekuk, badan tidak mengayun."],
    primaryMuscles: ["Bahu samping"],
    secondaryMuscles: [],
    conditionNotes: { shoulder: "Batasi tinggi angkatan di bawah titik nyeri." },
  }),
  fromDb("Overhead Triceps Extension", "Seated_Triceps_Press", {
    cues: ["Duduk bersandar, satu dumbbell dipegang dua tangan di atas kepala.", "Siku tetap mengarah ke depan, turunkan ke belakang kepala perlahan."],
    primaryMuscles: ["Trisep"],
    secondaryMuscles: [],
    conditionNotes: { apt: "Rib cage turun; punggung jangan melengkung saat lengan di atas kepala." },
  }),
  fromDb("High-Incline Push-Up", "Incline_Push-Up", {
    imageNote: "Gambar memakai tumpuan setinggi bangku; kita memakai tumpuan lebih tinggi (kursi/meja/dinding) yang lebih ringan.",
    cues: ["Badan lurus seperti papan, glute aktif.", "Dada turun ke tepi tumpuan, siku ±45°."],
    primaryMuscles: ["Dada"],
    secondaryMuscles: ["Bahu depan", "Trisep"],
    conditionNotes: { apt: "Panggul jangan turun. Jaga posterior pelvic tilt ringan." },
  }),
  // ---------------- Upper Pull ----------------
  // 0.11.2 — tanpa alat. Push-Up dari free-exercise-db; empat lainnya tidak ada padanannya.
  fromDb("Push-Up", "Pushups", {
    cues: ["Tangan sedikit lebih lebar dari bahu, badan lurus dari kepala ke tumit.", "Siku ±45° dari badan; turun sampai dada sekepalan dari lantai, dorong kembali."],
    primaryMuscles: ["Dada", "Trisep"],
    secondaryMuscles: ["Bahu depan", "Core"],
    conditionNotes: { apt: "Glute dan perut aktif supaya pinggul tidak turun dan punggung bawah tidak melengkung.", shoulder: "Kurangi kedalaman bila nyeri, atau pakai Knee/Wall Push-Up." },
  }),
  noImage("Knee Push-Up", {
    cues: ["Lutut di lantai, tangan sedikit lebih lebar dari bahu.", "Lutut, panggul, dan bahu segaris; jangan menungging."],
    primaryMuscles: ["Dada", "Trisep"],
    secondaryMuscles: ["Bahu depan", "Core"],
    conditionNotes: { apt: "Perut aktif supaya punggung bawah tidak melengkung." },
  }),
  noImage("Wall Push-Up", {
    cues: ["Berdiri menghadap dinding, tangan di dinding setinggi bahu.", "Badan lurus, tekuk siku sampai dada mendekati dinding, lalu dorong."],
    primaryMuscles: ["Dada", "Trisep"],
    secondaryMuscles: ["Bahu depan"],
  }),
  noImage("Dead Hang", {
    cues: ["Pegang palang selebar bahu, menggantung dengan kaki lepas dari lantai.", "Bahu aktif: tarik tulang belikat sedikit ke bawah, jangan menggantung pasif."],
    primaryMuscles: ["Lengan bawah (grip)", "Latissimus"],
    secondaryMuscles: ["Bahu"],
    conditionNotes: { shoulder: "Hentikan bila nyeri di bahu." },
  }),
  noImage("Negative Pull-Up", {
    cues: ["Lompat/naik ke posisi dagu di atas palang.", "Turun perlahan 3–5 detik sampai lengan lurus."],
    primaryMuscles: ["Latissimus"],
    secondaryMuscles: ["Bisep", "Punggung tengah"],
  }),
  fromDb("DB Farmer's Hold", "Farmers_Walk", {
    imageNote: "Gambar menunjukkan versi berjalan dengan handle strongman; kita berdiri diam memegang dumbbell.",
    cues: ["Berdiri tegak, dumbbell di samping badan.", "Rib cage turun, core kencang, bahu tidak terangkat."],
    primaryMuscles: ["Lengan bawah (grip)"],
    secondaryMuscles: ["Trapezius", "Perut"],
    conditionNotes: { apt: "Jangan condong ke belakang; panggul netral." },
  }),
  noImage("Prone Y-T-W Raise", {
    cues: ["Tengkurap, dahi di atas handuk, ibu jari menghadap ke atas.", "Angkat lengan sedikit dari lantai membentuk Y, lalu T, lalu W; gerak dari tulang belikat."],
    primaryMuscles: ["Punggung atas (trapezius tengah & bawah)", "Bahu belakang"],
    secondaryMuscles: ["Rotator cuff"],
    conditionNotes: {
      apt: "Dada tetap rendah; gerakan di tulang belikat, bukan dengan melengkungkan punggung bawah.",
      lbp: "Tetap dalam rentang tanpa nyeri; bantal tipis di bawah perut boleh.",
      shoulder: "Mulai dari T dan W; posisi Y hanya bila tanpa nyeri.",
    },
  }),
  noImage("Prone Reverse Snow Angel", {
    cues: ["Tengkurap, lengan di samping paha dan melayang sedikit di atas lantai.", "Sapukan lengan ke atas kepala dan kembali, perlahan, tulang belikat ditarik ke bawah."],
    primaryMuscles: ["Punggung atas", "Bahu belakang"],
    secondaryMuscles: ["Punggung bawah (stabilisasi)"],
    conditionNotes: { apt: "Glute aktif, kepala dan dada tetap rendah.", shoulder: "Batasi jangkauan di atas kepala bila nyeri." },
  }),
  noImage("Seated DB Scapular Retraction", {
    cues: ["Duduk sedikit membungkuk, lengan lurus menggantung.", "Rapatkan tulang belikat ke belakang tanpa menekuk siku, tahan 1 detik."],
    primaryMuscles: ["Punggung tengah"],
    secondaryMuscles: ["Trapezius"],
  }),
  fromDb("Supported Single-Arm Row", "One-Arm_Dumbbell_Row", {
    imageNote: "Gambar memakai lutut + tangan di bangku; kita cukup satu tangan bertumpu di kursi.",
    cues: ["Satu tangan bertumpu di kursi, punggung netral.", "Tarik dumbbell ke pinggang, siku dekat badan."],
    primaryMuscles: ["Punggung tengah"],
    secondaryMuscles: ["Latissimus", "Bisep"],
    conditionNotes: { lbp: "Tumpuan tangan wajib, jangan membungkuk tanpa tumpuan." },
  }),
  fromDb("DB Floor Pullover", "Bent-Arm_Dumbbell_Pullover", {
    imageNote: "Gambar melintang di bangku (gerak lebih dalam); kita berbaring di lantai sehingga gerakan dibatasi lantai.",
    cues: ["Berbaring di lantai, satu dumbbell dipegang dua tangan di atas dada.", "Turunkan ke belakang kepala dengan siku sedikit ditekuk sampai menyentuh lantai."],
    primaryMuscles: ["Latissimus", "Dada"],
    secondaryMuscles: ["Trisep"],
    conditionNotes: { apt: "Punggung bawah tetap menempel lantai saat lengan ke belakang." },
  }),
  fromDb("Seated Bent-Over DB Face Pull", "Seated_Bent-Over_Rear_Delt_Raise", {
    imageNote: "Gambar menunjukkan rear delt raise (lengan hampir lurus); face pull kita menekuk siku dan menarik ke arah wajah sambil memutar keluar.",
    cues: ["Duduk membungkuk, punggung netral.", "Tarik siku ke samping-atas, lalu putar lengan bawah keluar."],
    primaryMuscles: ["Bahu belakang"],
    secondaryMuscles: ["Punggung tengah", "Rotator cuff"],
  }),
  fromDb("Reverse Wrist Curl", "Seated_Dumbbell_Palms-Down_Wrist_Curl", {
    cues: ["Lengan bawah di paha, telapak menghadap bawah.", "Angkat punggung tangan perlahan, turun terkontrol."],
    primaryMuscles: ["Lengan bawah (ekstensor)"],
    secondaryMuscles: [],
  }),
  fromDb("Band Reverse Fly", "Back_Flyes_-_With_Bands", {
    cues: ["Band ditambatkan setinggi dada, lengan lurus ke depan.", "Buka lengan ke samping, rapatkan tulang belikat, bahu tetap turun."],
    primaryMuscles: ["Bahu belakang"],
    secondaryMuscles: ["Punggung tengah"],
    conditionNotes: { shoulder: "Hentikan bila nyeri; kurangi lebar gerakan." },
  }),
  // ---------------- Lower ----------------
  fromDb("Barbell Sumo Deadlift / Hip Thrust", "Barbell_Hip_Thrust", {
    imageNote: "Gambar menunjukkan varian Hip Thrust (varian yang diutamakan).",
    cues: ["Punggung atas di tepi kursi/bench, barbell + hip pad di pinggul.", "Dorong lewat tumit, posterior pelvic tilt di puncak. Jangan melengkungkan punggung."],
    primaryMuscles: ["Gluteus"],
    secondaryMuscles: ["Hamstring"],
    conditionNotes: { apt: "Di puncak, tahan dengan glute (posterior tilt), bukan dengan melengkungkan punggung bawah." },
  }),
  fromDb("Barbell Squat", "Barbell_Squat", {
    imageNote: "Gambar memakai rack & beban berat; kita memakai beban ringan 10–16 kg tanpa rack.",
    cues: ["Beban ringan di punggung atas, tulang belakang netral.", "Rib cage turun, lutut searah jari kaki."],
    primaryMuscles: ["Paha depan"],
    secondaryMuscles: ["Gluteus", "Hamstring"],
    conditionNotes: { apt: "Jangan hiperlordosis di posisi bawah; kedalaman secukupnya.", pfp: "Batasi kedalaman, nyeri ≤ 3/10." },
  }),
  fromDb("DB RDL Wall-Tap Method", "Stiff-Legged_Dumbbell_Deadlift", {
    imageNote: "Gambar versi stiff-legged (lutut hampir lurus, turun sampai kaki); kita hip hinge sampai pantat menyentuh dinding, lutut sedikit ditekuk.",
    cues: ["Berdiri sejengkal dari dinding, dorong pinggul ke belakang sampai menyentuh dinding.", "Punggung netral, dumbbell dekat paha."],
    primaryMuscles: ["Hamstring"],
    secondaryMuscles: ["Gluteus", "Punggung bawah"],
    conditionNotes: { lbp: "Jaga punggung netral; hentikan bila nyeri menjalar." },
  }),
  fromDb("Reverse Lunge", "Dumbbell_Rear_Lunge", {
    cues: ["Langkah ke belakang, turun sampai lutut belakang hampir menyentuh lantai.", "Lutut depan searah jari kaki, jangan masuk ke dalam."],
    primaryMuscles: ["Paha depan"],
    secondaryMuscles: ["Gluteus", "Hamstring"],
    conditionNotes: { pfp: "Langkah lebih panjang mengurangi beban lutut depan.", overpronation: "Lutut depan jangan collapse ke dalam." },
  }),
  fromDb("Glute Bridge", "Butt_Lift_Bridge", {
    cues: ["Dorong lewat tumit, tahan 2 detik di atas.", "Glute yang mengangkat, bukan punggung bawah."],
    primaryMuscles: ["Gluteus"],
    secondaryMuscles: ["Hamstring"],
    conditionNotes: { apt: "Posterior pelvic tilt di puncak, punggung tidak melengkung." },
  }),
  fromDb("Single-Leg Glute Bridge", "Single_Leg_Glute_Bridge", {
    cues: ["Satu kaki diangkat, dorong lewat tumit kaki tumpu.", "Panggul tetap rata kiri–kanan."],
    primaryMuscles: ["Gluteus"],
    secondaryMuscles: ["Hamstring"],
    conditionNotes: { apt: "Punggung bawah tidak melengkung di puncak." },
  }),
  fromDb("Rear-Foot-Elevated Split Squat", "Split_Squat_with_Dumbbells", {
    cues: ["Punggung kaki belakang di kursi, dumbbell di samping badan.", "Turun lurus ke bawah, lutut depan searah jari kaki."],
    primaryMuscles: ["Paha depan"],
    secondaryMuscles: ["Gluteus", "Hamstring"],
    conditionNotes: { pfp: "Batasi kedalaman, nyeri ≤ 3/10.", apt: "Rib cage turun. Kaki belakang ikut meregangkan hip flexor." },
  }),
  fromDb("DB Step-Up", "Dumbbell_Step_Ups", {
    cues: ["Pijakan kokoh ±setinggi lutut atau lebih rendah.", "Dorong lewat tumit kaki di atas, jangan menolak dengan kaki bawah."],
    primaryMuscles: ["Paha depan"],
    secondaryMuscles: ["Gluteus", "Hamstring", "Betis"],
    conditionNotes: { pfp: "Pakai pijakan rendah.", overpronation: "Lutut tetap searah jari kaki saat naik." },
  }),
  fromDb("DB Plié Squat", "Plie_Dumbbell_Squat", {
    cues: ["Kaki lebar, jari kaki serong keluar.", "Dumbbell menggantung di tengah, dada tegak, lutut searah jari kaki."],
    primaryMuscles: ["Paha depan"],
    secondaryMuscles: ["Adduktor", "Gluteus", "Hamstring"],
    conditionNotes: { pfp: "Batasi kedalaman.", lbp: "Beban di depan-bawah, bukan di punggung. Punggung tetap netral." },
  }),
  fromDb("Seated Band Hamstring Curl", "Seated_Band_Hamstring_Curl", {
    cues: ["Band ditambatkan rendah, dililit di belakang pergelangan kaki.", "Tarik tumit ke bawah kursi, kembalikan perlahan."],
    primaryMuscles: ["Hamstring"],
    secondaryMuscles: [],
  }),
  // ---------------- Stabilitas & core ----------------
  fromDb("Lateral Band Walk", "Monster_Walk", {
    imageNote: "Gambar menunjukkan monster walk (melangkah maju-mundur); versi kita melangkah ke samping.",
    cues: ["Band di atas lutut/pergelangan, setengah jongkok.", "Melangkah ke samping, lutut tetap terdorong keluar."],
    primaryMuscles: ["Gluteus medius (abduktor)"],
    secondaryMuscles: [],
    conditionNotes: { overpronation: "Kaki jangan menyilang garis tengah." },
  }),
  fromDb("Dead Bug", "Dead_Bug", {
    cues: ["Punggung bawah menempel lantai sepanjang gerakan.", "Luruskan lengan & kaki berlawanan perlahan, buang napas."],
    primaryMuscles: ["Perut"],
    secondaryMuscles: [],
    conditionNotes: { apt: "Punggung bawah tetap menempel lantai: ini inti anti-hiperlordosis.", lbp: "Perkecil gerakan bila punggung mulai terangkat." },
  }),
  noImage("Clamshell", {
    cues: ["Berbaring miring, lutut ditekuk, band di atas lutut.", "Buka lutut atas tanpa memutar panggul ke belakang."],
    primaryMuscles: ["Gluteus medius (abduktor)"],
    secondaryMuscles: [],
  }),
  fromDb("Side Plank", "Side_Bridge", {
    cues: ["Siku tepat di bawah bahu, badan lurus kepala–kaki.", "Panggul jangan turun; versi lutut di lantai untuk awal."],
    primaryMuscles: ["Perut (oblique)", "Gluteus medius"],
    secondaryMuscles: ["Bahu"],
    conditionNotes: { shoulder: "Batasi durasi; hentikan bila nyeri di bahu tumpu." },
  }),
  fromDb("Standing Band Hip Abduction", "Band_Hip_Adductions", {
    imageNote: "ID sumber bernama \"Adductions\", tetapi gerakannya abduksi (kaki ke samping melawan band).",
    cues: ["Band ditambatkan rendah, dililit di pergelangan kaki luar.", "Badan tegak, angkat kaki ke samping tanpa memiringkan badan."],
    primaryMuscles: ["Gluteus medius (abduktor)"],
    secondaryMuscles: [],
  }),
  fromDb("Plank", "Plank", {
    cues: ["Siku di bawah bahu, badan lurus.", "Posterior pelvic tilt ringan, glute aktif."],
    primaryMuscles: ["Perut"],
    secondaryMuscles: ["Bahu"],
    conditionNotes: { apt: "Punggung bawah tidak melengkung, pinggul jangan turun.", shoulder: "Batasi durasi bila bahu nyeri." },
  }),
  // ---------------- Prehab ----------------
  noImage("Tibialis Wall Raise", {
    cues: ["Punggung bersandar di dinding, tumit sejengkal dari dinding.", "Angkat jari kaki setinggi mungkin, turun perlahan."],
    primaryMuscles: ["Tulang kering (tibialis anterior)"],
    secondaryMuscles: [],
    conditionNotes: { shin: "Prehab inti shin splints, jangan dilewati." },
  }),
  fromDb("Eccentric Calf Raise", "Standing_Dumbbell_Calf_Raise", {
    imageNote: "Gambar memakai dua kaki dan dumbbell; versi kita naik dua kaki, turun satu kaki perlahan tanpa beban.",
    cues: ["Naik dengan dua kaki di tepi anak tangga.", "Turun dengan satu kaki selama 3 detik."],
    primaryMuscles: ["Betis"],
    secondaryMuscles: [],
    conditionNotes: { achilles: "Nyeri ≤ 5/10 boleh, asal reda besok pagi.", shin: "Prehab inti shin splints." },
  }),
  fromDb("Seated Single-Leg Calf Raise", "Dumbbell_Seated_One-Leg_Calf_Raise", {
    cues: ["Duduk, dumbbell di paha dekat lutut, ujung kaki di pijakan.", "Angkat tumit setinggi mungkin, turun perlahan."],
    primaryMuscles: ["Betis (soleus)"],
    secondaryMuscles: [],
    conditionNotes: { achilles: "Turun perlahan; nyeri ≤ 5/10.", plantar: "Penguatan betis membantu nyeri tumit." },
  }),
  fromDb("DB Scaption", "Dumbbell_Scaption", {
    cues: ["Ibu jari ke atas, angkat serong ±30° di depan badan.", "Berhenti setinggi bahu, bahu tidak terangkat."],
    primaryMuscles: ["Bahu"],
    secondaryMuscles: ["Trapezius"],
    conditionNotes: { shoulder: "Hanya sampai setinggi bahu; hentikan bila nyeri." },
  }),
  fromDb("Band External Rotation", "External_Rotation_with_Band", {
    cues: ["Band ditambatkan setinggi siku, siku menempel di samping badan 90°.", "Putar lengan bawah keluar, kembali perlahan."],
    primaryMuscles: ["Rotator cuff"],
    secondaryMuscles: ["Bahu belakang"],
  }),
  // ---------------- Pemanasan & pendinginan ----------------
  fromDb("Kneeling Hip Flexor Stretch", "Kneeling_Hip_Flexor", {
    cues: ["Satu lutut di lantai, glute kaki belakang dikencangkan.", "Dorong pinggul ke depan sedikit sampai terasa regang di depan pinggul."],
    primaryMuscles: ["Hip flexor"],
    secondaryMuscles: ["Paha depan"],
    conditionNotes: { apt: "Posterior pelvic tilt dulu, baru condong. Jangan melengkungkan punggung." },
  }),
  fromDb("Cat-Cow", "Cat_Stretch", {
    imageNote: "Gambar hanya menunjukkan fase cat (punggung membulat); lakukan bergantian dengan fase cow.",
    cues: ["Merangkak, bulatkan punggung (cat) lalu lengkungkan perlahan (cow).", "Gerak mengikuti napas, pelan."],
    primaryMuscles: ["Punggung bawah"],
    secondaryMuscles: ["Punggung tengah"],
    conditionNotes: { apt: "Fase cow secukupnya, tekankan fase cat." },
  }),
  fromDb("Band Pull-Apart", "Band_Pull_Apart", {
    cues: ["Lengan lurus di depan dada, pegang band.", "Tarik band ke dada dengan merapatkan tulang belikat."],
    primaryMuscles: ["Bahu belakang"],
    secondaryMuscles: ["Punggung tengah", "Trapezius"],
  }),
  fromDb("Calf Stretch", "Calf_Stretch_Hands_Against_Wall", {
    cues: ["Tangan di dinding, kaki belakang lurus.", "Tumit belakang tetap di lantai, tahan 20–30 detik."],
    primaryMuscles: ["Betis"],
    secondaryMuscles: [],
  }),
  fromDb("Quadruped Hip Circles", "Hip_Circles_prone", {
    cues: ["Posisi merangkak, punggung netral.", "Putar satu lutut membentuk lingkaran besar perlahan."],
    primaryMuscles: ["Abduktor pinggul"],
    secondaryMuscles: ["Adduktor"],
    conditionNotes: { apt: "Punggung tetap netral, jangan melengkung." },
  }),
]);

export const MEDIA_ATTRIBUTION = "Gambar: free-exercise-db (Unlicense / public domain)";

export function mediaFor(name: string): MovementMedia | undefined {
  return MOVEMENT_MEDIA[name];
}
