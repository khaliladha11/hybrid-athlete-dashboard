import type { ConditionId } from "../../conditions";

/**
 * Terjemahan Inggris konten keselamatan (1.2.0): katalog kondisi, cue preskripsi generator, dan catatan otot. Teks
 * Indonesia tetap di sumbernya (`lib/conditions.ts`, `lib/generator/meta.ts`, `lib/movements/muscle-regions.ts`).
 *
 * Diterjemahkan harfiah dan konservatif. Nama kondisi memakai istilah klinis Inggris dari sumber yang dikutip. Angka,
 * batas nyeri, derajat, durasi, dan persen harus sama persis (`__tests__/i18n-safety.test.ts`). Kalimat yang
 * padanannya belum pasti diberi `REVIEW:`.
 */
export interface ConditionEn {
  label: string;
  effect: string;
  strengthNotes?: string[];
  runNotes?: string[];
}

export const CONDITIONS_EN: Record<ConditionId, ConditionEn> = {
  apt: {
    label: "Anterior Pelvic Tilt / Hyperlordosis",
    effect: "Spine-Friendly Protocol: no heavy unsupported axial loading; Dead Bug (anti-extension) is required in Lower/Full Body.",
    strengthNotes: ["Spine-Friendly: no heavy unsupported axial loading. Rib cage down, core engaged in every movement."],
  },
  shin: {
    label: "History of Shin Splints (MTSS)",
    effect: "Tibialis Wall Raise + Eccentric Calf Raise prehab is required in Lower/Full Body; cadence reminder and shin pain warning signs.",
    runNotes: ["Shin pain that gets worse while running → stop and switch to walking. Avoid adding km and intensity in the same week."],
  },
  overpronation: {
    label: "Overpronation / Crossover Gait",
    effect: 'Gluteus medius stability is required in Lower/Full Body; cadence cue of 175–180 SPM and "train tracks" (anti-crossover) on every run.',
  },
  mcu: {
    // REVIEW: "MCU" (medical check-up) diterjemahkan "medical check-up".
    label: "24–48 hour break from weight training before a medical check-up / blood test",
    effect: "Note in strength sessions: weight training can raise CK, AST, and ALT for several days, so blood test results look abnormal.",
    strengthNotes: ["Take a 24–48 hour break from heavy weight training before a medical check-up or blood test (muscle and liver enzymes can rise temporarily)."],
  },
  lbp: {
    label: "Low back pain (non-specific)",
    effect: "Spine-Friendly, no Barbell Squat (axial loading), Dead Bug is required in Lower/Full Body; stay active.",
    strengthNotes: [
      "Low back pain: keep moving; mild pain (≤ 3/10) that settles after the session is still normal. Pain that spreads, numbness, or tingling → stop and see a health professional.",
    ],
  },
  pfp: {
    label: "Front knee pain (Patellofemoral Pain / runner's knee)",
    effect: "Hip strengthening (pelvic stability) is required in Lower/Full Body; cadence cue (up 5–10%); keep pain ≤ 3/10.",
    strengthNotes: ["Knee: combining hip and knee strengthening is most effective. Pain ≤ 3/10 during training is still fine, as long as it does not increase the next day."],
    runNotes: ["Front knee: reduce steep downhills; raise cadence by 5–10% to lower the load on the patellofemoral joint."],
  },
  itbs: {
    label: "IT Band Syndrome (outer knee pain)",
    effect: "Hip abductor strengthening (pelvic stability) is required in Lower/Full Body; anti-crossover and cadence cues; avoid long downhills.",
    runNotes: ["ITB: avoid long downhills and always running the same sloped road (camber); steps do not cross the midline."],
  },
  achilles: {
    label: "Achilles tendinopathy",
    effect: "Eccentric Calf Raise is required in Lower/Full Body; hard intervals use 4×4 (no 15/15 sprints); keep pain ≤ 5/10.",
    runNotes: ["Achilles: pain while running ≤ 5/10 and it must be back to normal the next morning (pain-monitoring model). Avoid sprints and steep hills."],
  },
  plantar: {
    label: "Plantar fasciitis / heel pain",
    effect: "Eccentric Calf Raise (calf strengthening) is required in Lower/Full Body; calf stretch in the cooldown.",
    runNotes: ["Heel: first-step pain in the morning that gets worse → reduce running volume. Stretch your calves after running."],
  },
  shoulder: {
    label: "Shoulder pain (subacromial pain / impingement)",
    effect: "No overhead movements (Seated Overhead Press, Overhead Triceps Extension, DB Floor Pullover) and no Close-Grip Push-Up; scapula work continues.",
    strengthNotes: [
      "Shoulder: avoid arm positions above your head that trigger pain; focus on scapula control (retraction, face pull). Stop Dead Hang if it hurts.",
    ],
  },
};

/** Label sumber yang memuat teks Indonesia (sisanya sudah kutipan berbahasa Inggris). Kunci = label Indonesia. */
export const SOURCE_EN: Record<string, string> = {
  "McGill S. Low Back Disorders, 3rd ed. Human Kinetics, 2016 (latihan spine-sparing & anti-ekstensi)":
    "McGill S. Low Back Disorders, 3rd ed. Human Kinetics, 2016 (spine-sparing & anti-extension exercises)",
};

/** Cue preskripsi generator (`META[...].cue`). */
export const META_CUE_EN: Record<string, string> = {
  "Dead Hang": "Active shoulders (scapula pulled down), do not hang passively.",
  "Negative Pull-Up": "Jump up, lower slowly under control.",
  "DB Farmer's Hold": "Stand tall, rib cage down, core tight.",
  "Supported Single-Arm Row": "Other hand supported on a chair, back neutral.",
  "Reverse Lunge": "Front knee in line with your toes, do not let it collapse inward.",
  "Barbell Sumo Deadlift / Hip Thrust": "Prefer the Hip Thrust variant with a hip pad; posterior pelvic tilt at the top.",
  "Barbell Squat": "Light load, spine neutral, rib cage down. No hyperlordosis.",
  "DB RDL Wall-Tap Method": "Hip hinge until your glutes touch the wall, back neutral.",
  "Glute Bridge": "Hold for 2 seconds at the top, push your hips up without arching your back.",
  "Floor Press": "Elbows ±45°, lower back stays on the floor.",
  "Seated Overhead Press": "Sit supported, do not arch your lower back.",
  "High-Incline Push-Up": "Body straight like a plank, glutes engaged.",
  "Push-Up": "Body straight from head to heels, elbows ±45°; lower until your chest is a fist away from the floor.",
  "Knee Push-Up": "Knees on the floor, hips in line with your body. Do not pike your hips up.",
  "Wall Push-Up": "Hands on the wall at shoulder height; the farther your feet are from the wall, the harder it is.",
  "Prone Y-T-W Raise": "Lie face down, forehead on a towel; lift your arms by pulling your shoulder blades down and back, lower back still.",
  "Prone Reverse Snow Angel": "Lie face down, arms hovering slightly above the floor, sweep from beside your thighs to over your head; glutes engaged.",
  "Lateral Band Walk": "Gluteus medius: knees stay out, do not cross over.",
  Clamshell: "Your pelvis does not roll back with the movement.",
  "Dead Bug": "Lower back stays on the floor (anti-hyperlordosis).",
  "Tibialis Wall Raise": "Shin splint prehab: back against the wall, lift your toes.",
  "Eccentric Calf Raise": "Rise on both feet, lower slowly on one foot.",
  "Band Reverse Fly": "Arms at chest height, pull the band out to the sides. Shoulders down, do not shrug.",
  "Single-Leg Glute Bridge": "Keep your pelvis level left and right, lower back does not arch at the top.",
  "Rear-Foot-Elevated Split Squat": "Back foot on a chair, lower straight down; front knee in line with your toes.",
  "DB Step-Up": "Drive through the heel of the foot on the step, do not push off with the bottom foot.",
  "DB Plié Squat": "Wide stance, toes turned out; dumbbell hanging in the middle, chest up.",
  "Seated DB Curl": "Sit supported, elbows stay at your sides; you may start neutral and then turn your palms forward.",
  "Hammer Curl": "Neutral grip (thumbs on top), elbows still, no body swing.",
  "Lying DB Triceps Extension": "Upper arms vertical and still; lower the dumbbells beside your head, lower back on the bench.",
  "Close-Grip Push-Up": "Hands shoulder-width or closer, elbows close to your body; body straight from head to heels.",
  "Scapular Pull-Up": "Arms stay straight; pull your shoulder blades down until your body rises slightly, hold for 2 seconds.",
  "Band-Assisted Pull-Up": "Knee in the band loop, pull your chest to the bar without swinging; lower under control.",
  "Standing DB Calf Raise": "Balls of your feet on a step, lower your heels below the step, then rise as high as you can; hold a wall if needed.",
  "Seated Band Tibialis Raise": "Sit with legs straight, band over the top of your foot anchored in front; pull your toes toward your shin, lower over 2 seconds.",
  "Single-Leg DB RDL": "Dumbbell in the opposite hand, other hand supported on a wall; hinge from the hips, back neutral, pelvis level.",
  "Single-Leg Hip Thrust": "Upper back on the bench, dumbbell on your hips; posterior pelvic tilt at the top, rib cage down.",
  "Single-Arm DB Floor Press": "One dumbbell, elbow ±45°; keep your body from rotating, lower back on the floor.",
  "Seated Band Hamstring Curl": "Pull your heel under the chair, return slowly against the band.",
  "Side Plank": "Elbow directly under your shoulder, body straight from head to feet; do not let your hips drop.",
  "Standing Band Hip Abduction": "Stand tall, lift your leg to the side without tilting your body.",
  Plank: "Slight posterior pelvic tilt, glutes engaged. Lower back does not arch.",
  "Seated Single-Leg Calf Raise": "Dumbbell on your thigh near the knee, raise your heel as high as you can, lower slowly.",
  "DB Scaption": "Thumbs up, lift at an angle of ±30° in front of your body, only up to shoulder height.",
  "Band External Rotation": "Elbow at your side at 90°, rotate your forearm outward.",
};

export const TEXT_ONLY_MUSCLES_EN: Record<string, string> = {
  "Rotator cuff": "deep muscles under the deltoid, not shown in the image",
};

export const TEXT_ONLY_MOVEMENTS_EN: Record<string, string> = {
  "Band External Rotation": "Its main muscles are the rotator cuff (deep muscles), which are not shown in the image; see the muscle list.",
};
