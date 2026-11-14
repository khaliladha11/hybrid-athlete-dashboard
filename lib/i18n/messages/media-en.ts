import type { ConditionId } from "../../conditions";

/**
 * Terjemahan Inggris info teknik gerakan (1.2.0). Teks Indonesia tetap di `lib/movements/media.ts` (dibaca script Node);
 * di sini hanya lapisan EN yang dikunci nama gerakan. Nama gerakan tidak diterjemahkan.
 *
 * Konten keselamatan: diterjemahkan harfiah dan konservatif. Angka, derajat, skala nyeri, dan durasi harus sama persis
 * dengan teks Indonesia (`__tests__/i18n-safety.test.ts`). Kalimat yang padanannya belum pasti diberi `REVIEW:`.
 */
export interface MediaEn {
  cues: string[];
  imageNote?: string;
  conditionNotes?: Partial<Record<ConditionId, string>>;
}

export const MEDIA_EN: Record<string, MediaEn> = {
  // ---------------- Upper Push ----------------
  "Floor Press": {
    cues: ["Elbows ±45° from your body, lower until your upper arms touch the floor.", "Lower back stays on the floor, knees bent."],
    conditionNotes: { apt: "Keep your knees bent so your lower back stays flat on the floor.", shoulder: "Stop at the point of pain; do not flare your elbows to 90°." },
  },
  "Seated Overhead Press": {
    cues: ["Sit fully supported against the backrest, rib cage down.", "Press the dumbbells up without arching your lower back."],
    conditionNotes: { apt: "Keep your back against the backrest; do not arch as you press." },
  },
  "Seated Lateral Raise": {
    cues: ["Raise to the sides only up to shoulder height.", "Elbows slightly bent, no swinging."],
    conditionNotes: { shoulder: "Keep the lift below the point of pain." },
  },
  "Overhead Triceps Extension": {
    cues: ["Sit supported, holding one dumbbell with both hands above your head.", "Keep your elbows pointing forward and lower behind your head slowly."],
    conditionNotes: { apt: "Rib cage down; do not arch your back while your arms are overhead." },
  },
  "High-Incline Push-Up": {
    cues: ["Body straight like a plank, glutes engaged.", "Lower your chest to the edge of the support, elbows ±45°."],
    imageNote: "The image uses a bench-height support; we use a higher support (chair, table, or wall), which is easier.",
    conditionNotes: { apt: "Do not let your hips sag. Keep a slight posterior pelvic tilt." },
  },
  "Lying DB Triceps Extension": {
    cues: ["Lie on a bench, arms straight up, palms facing each other.", "Bend your elbows and lower the dumbbells beside your head; upper arms stay still."],
    conditionNotes: { shoulder: "Limit the range; stop if it hurts.", apt: "Lower back stays on the bench; your feet may rest on the bench." },
  },
  "Close-Grip Push-Up": {
    cues: ["Hands shoulder-width or closer, elbows close to your body.", "Lower until your chest is near the floor, body straight from head to heels."],
    conditionNotes: { apt: "Glutes and abs engaged, hips do not sag." },
  },
  "Single-Arm DB Floor Press": {
    cues: ["Lie on the floor with one dumbbell, elbow ±45° from your body.", "Press up without your body rotating; lower back stays on the floor."],
    imageNote: "The image uses two dumbbells; our version uses one dumbbell, with the other hand on the floor or on your stomach.",
    conditionNotes: { shoulder: "Elbow ±45°, stop if it hurts." },
  },
  "Push-Up": {
    cues: [
      "Hands slightly wider than your shoulders, body straight from head to heels.",
      "Elbows ±45° from your body; lower until your chest is a fist away from the floor, then push back up.",
    ],
    conditionNotes: {
      apt: "Glutes and abs engaged so your hips do not sag and your lower back does not arch.",
      shoulder: "Reduce the depth if it hurts, or use Knee/Wall Push-Up.",
    },
  },
  "Knee Push-Up": {
    // REVIEW: "jangan menungging" diterjemahkan "do not pike your hips up".
    cues: ["Knees on the floor, hands slightly wider than your shoulders.", "Knees, hips, and shoulders in one line; do not pike your hips up."],
    conditionNotes: { apt: "Abs engaged so your lower back does not arch." },
  },
  "Wall Push-Up": {
    cues: ["Stand facing a wall, hands on the wall at shoulder height.", "Body straight, bend your elbows until your chest nears the wall, then push."],
  },
  // ---------------- Upper Pull ----------------
  "Dead Hang": {
    cues: ["Grip the bar shoulder-width apart and hang with your feet off the floor.", "Active shoulders: pull your shoulder blades slightly down, do not hang passively."],
    imageNote: "The first image shows hanging before the shoulders are engaged; hold the position in the second image (shoulder blades pulled down).",
    conditionNotes: { shoulder: "Stop if your shoulder hurts." },
  },
  "Negative Pull-Up": {
    cues: ["Jump or step up to the chin-over-bar position.", "Lower slowly over 3–5 seconds until your arms are straight."],
    imageNote: "The image order is reversed from the source: start above the bar and lower slowly until your arms are straight.",
  },
  "DB Farmer's Hold": {
    cues: ["Stand tall, dumbbells at your sides.", "Rib cage down, core tight, shoulders not shrugged."],
    imageNote: "The image shows a walking version with strongman handles; we stand still holding dumbbells.",
    conditionNotes: { apt: "Do not lean back; keep your pelvis neutral." },
  },
  "Prone Y-T-W Raise": {
    cues: ["Lie face down, forehead on a towel, thumbs pointing up.", "Lift your arms slightly off the floor into a Y, then T, then W; move from your shoulder blades."],
    conditionNotes: {
      apt: "Chest stays low; the movement comes from your shoulder blades, not from arching your lower back.",
      lbp: "Stay in a pain-free range; a thin pillow under your stomach is fine.",
      shoulder: "Start with T and W; use the Y position only if it is pain-free.",
    },
  },
  "Prone Reverse Snow Angel": {
    cues: ["Lie face down, arms beside your thighs and hovering slightly above the floor.", "Sweep your arms overhead and back, slowly, shoulder blades pulled down."],
    conditionNotes: { apt: "Glutes engaged, head and chest stay low.", shoulder: "Limit the overhead reach if it hurts." },
  },
  "Seated DB Scapular Retraction": {
    cues: ["Sit leaning slightly forward, arms hanging straight.", "Squeeze your shoulder blades back without bending your elbows, hold for 1 second."],
  },
  "Supported Single-Arm Row": {
    cues: ["One hand supported on a chair, back neutral.", "Pull the dumbbell to your hip, elbow close to your body."],
    imageNote: "The image uses a knee and hand on a bench; one hand supported on a chair is enough for us.",
    conditionNotes: { lbp: "Hand support is required; do not bend over without support." },
  },
  "DB Floor Pullover": {
    cues: ["Lie on the floor holding one dumbbell with both hands above your chest.", "Lower it behind your head with elbows slightly bent until it touches the floor."],
    imageNote: "The image is across a bench (deeper movement); we lie on the floor so the floor limits the movement.",
    conditionNotes: { apt: "Lower back stays on the floor as your arms go back." },
  },
  "Seated Bent-Over DB Face Pull": {
    cues: ["Sit bent forward, back neutral.", "Pull your elbows out and up, then rotate your forearms outward."],
    imageNote: "The image shows a rear delt raise (arms almost straight); our face pull bends the elbows and pulls toward the face while rotating outward.",
  },
  "Reverse Wrist Curl": {
    cues: ["Forearms on your thighs, palms facing down.", "Lift the back of your hands slowly, lower under control."],
  },
  "Band Reverse Fly": {
    cues: ["Band anchored at chest height, arms straight in front.", "Open your arms to the sides, squeeze your shoulder blades, shoulders stay down."],
    conditionNotes: { shoulder: "Stop if it hurts; reduce the width of the movement." },
  },
  "Seated DB Curl": {
    cues: ["Sit supported, dumbbells hanging at your sides, elbows close to your body.", "Lift to shoulder height without swinging, lower slowly."],
    conditionNotes: { apt: "Back stays against the backrest; do not swing.", lbp: "Sit supported; do not lean back as you lift." },
  },
  "Hammer Curl": {
    cues: ["Neutral grip, thumbs on top.", "Lift to shoulder height, elbows still at your sides; lower slowly."],
    conditionNotes: { apt: "Rib cage down, do not swing; sitting supported is fine." },
  },
  "Scapular Pull-Up": {
    cues: ["Hang with straight arms, shoulder-width grip.", "Pull your shoulder blades down until your body rises slightly, hold for 2 seconds, lower slowly."],
    conditionNotes: { shoulder: "Stop if your shoulder hurts." },
  },
  "Band-Assisted Pull-Up": {
    cues: ["Band loop wrapped around the bar, one knee inside the loop.", "Pull your chest to the bar without swinging, lower under control until your arms are straight."],
    conditionNotes: { shoulder: "Stop if your shoulder hurts." },
  },
  // ---------------- Lower ----------------
  "Barbell Sumo Deadlift / Hip Thrust": {
    cues: ["Upper back on the edge of a chair or bench, barbell and hip pad on your hips.", "Drive through your heels, posterior pelvic tilt at the top. Do not arch your back."],
    imageNote: "The image shows the Hip Thrust variant (the preferred variant).",
    conditionNotes: { apt: "At the top, hold with your glutes (posterior tilt), not by arching your lower back." },
  },
  "Barbell Squat": {
    cues: ["Light load on your upper back, spine neutral.", "Rib cage down, knees in line with your toes."],
    imageNote: "The image uses a rack and a heavy load; we use a light load of 10–16 kg without a rack.",
    conditionNotes: { apt: "Do not hyperextend your lower back at the bottom; go only as deep as needed.", pfp: "Limit the depth, pain ≤ 3/10." },
  },
  "DB RDL Wall-Tap Method": {
    // REVIEW: "sejengkal" diterjemahkan "a hand-span".
    cues: ["Stand a hand-span from a wall, push your hips back until they touch the wall.", "Back neutral, dumbbells close to your thighs."],
    imageNote: "The image shows the stiff-legged version (knees almost straight, lowering to the feet); we hip hinge until the glutes touch the wall, knees slightly bent.",
    conditionNotes: { lbp: "Keep your back neutral; stop if the pain spreads." },
  },
  "Reverse Lunge": {
    cues: ["Step back and lower until your back knee almost touches the floor.", "Front knee in line with your toes, do not let it cave in."],
    conditionNotes: { pfp: "A longer step reduces the load on the front knee.", overpronation: "Do not let your front knee collapse inward." },
  },
  "Glute Bridge": {
    cues: ["Drive through your heels, hold for 2 seconds at the top.", "Your glutes do the lifting, not your lower back."],
    conditionNotes: { apt: "Posterior pelvic tilt at the top, back does not arch." },
  },
  "Single-Leg Glute Bridge": {
    cues: ["One leg lifted, drive through the heel of the standing foot.", "Keep your pelvis level left and right."],
    conditionNotes: { apt: "Lower back does not arch at the top." },
  },
  "Rear-Foot-Elevated Split Squat": {
    cues: ["Top of your back foot on a chair, dumbbells at your sides.", "Lower straight down, front knee in line with your toes."],
    conditionNotes: { pfp: "Limit the depth, pain ≤ 3/10.", apt: "Rib cage down. The back leg also stretches the hip flexor." },
  },
  "DB Step-Up": {
    cues: ["A sturdy step at ±knee height or lower.", "Drive through the heel of the top foot; do not push off with the bottom foot."],
    conditionNotes: { pfp: "Use a low step.", overpronation: "Keep your knee in line with your toes as you step up." },
  },
  "DB Plié Squat": {
    cues: ["Wide stance, toes turned out.", "Dumbbell hanging in the middle, chest up, knees in line with your toes."],
    conditionNotes: { pfp: "Limit the depth.", lbp: "The load is in front and low, not on your back. Back stays neutral." },
  },
  "Seated Band Hamstring Curl": {
    cues: ["Band anchored low, wrapped behind your ankle.", "Pull your heel under the chair, return slowly."],
  },
  "Single-Leg DB RDL": {
    cues: [
      "Dumbbell in the hand opposite the standing leg, other hand on a wall.",
      "Hinge from the hips, back leg straight behind you; stop when your hamstring stretches.",
    ],
    imageNote: "The image uses a kettlebell without hand support; our version uses one dumbbell, with the other hand supported on a wall.",
    conditionNotes: {
      apt: "Back neutral; do not round over to chase depth.",
      lbp: "Hand support is required; stop if your lower back starts to round.",
    },
  },
  "Single-Leg Hip Thrust": {
    cues: ["Upper back on the edge of a bench, one foot on the floor, dumbbell on your hips.", "Drive through your heel until your hips are straight, posterior pelvic tilt at the top."],
    conditionNotes: { apt: "Rib cage down; do not arch your back at the top." },
  },
  "Lateral Band Walk": {
    cues: ["Band above your knees or ankles, half squat.", "Step to the side, knees kept pushed out."],
    imageNote: "The image shows a monster walk (stepping forward and back); our version steps to the side.",
    conditionNotes: { overpronation: "Do not let your feet cross the midline." },
  },
  "Dead Bug": {
    cues: ["Lower back stays on the floor throughout the movement.", "Slowly extend the opposite arm and leg, breathe out."],
    conditionNotes: {
      apt: "Lower back stays on the floor: this is the core of anti-hyperlordosis work.",
      lbp: "Make the movement smaller if your back starts to lift.",
    },
  },
  Clamshell: {
    cues: ["Lie on your side, knees bent, band above your knees.", "Open the top knee without rolling your pelvis back."],
  },
  "Side Plank": {
    cues: ["Elbow directly under your shoulder, body straight from head to feet.", "Do not let your hips drop; start with the knees-down version."],
    conditionNotes: { shoulder: "Limit the duration; stop if the supporting shoulder hurts." },
  },
  "Standing Band Hip Abduction": {
    cues: ["Band anchored low, wrapped around your outer ankle.", "Stand tall, lift your leg to the side without tilting your body."],
    imageNote: 'The source ID is named "Adductions", but the movement is abduction (leg out to the side against the band).',
  },
  Plank: {
    cues: ["Elbows under your shoulders, body straight.", "Slight posterior pelvic tilt, glutes engaged."],
    conditionNotes: { apt: "Lower back does not arch, hips do not sag.", shoulder: "Limit the duration if your shoulder hurts." },
  },
  "Tibialis Wall Raise": {
    cues: ["Back against a wall, heels a hand-span from the wall.", "Lift your toes as high as you can, lower slowly."],
    conditionNotes: { shin: "Core shin splint prehab, do not skip it." },
  },
  "Eccentric Calf Raise": {
    cues: ["Rise on both feet on the edge of a step.", "Lower on one foot over 3 seconds."],
    imageNote: "The image uses both feet and a dumbbell; our version rises on both feet and lowers slowly on one foot without load.",
    conditionNotes: { achilles: "Pain ≤ 5/10 is fine, as long as it settles by the next morning.", shin: "Core shin splint prehab." },
  },
  "Seated Single-Leg Calf Raise": {
    cues: ["Sit with a dumbbell on your thigh near the knee, ball of the foot on a step.", "Raise your heel as high as you can, lower slowly."],
    conditionNotes: { achilles: "Lower slowly; pain ≤ 5/10.", plantar: "Calf strengthening helps heel pain." },
  },
  "DB Scaption": {
    cues: ["Thumbs up, lift at an angle of ±30° in front of your body.", "Stop at shoulder height, shoulders not shrugged."],
    conditionNotes: { shoulder: "Only up to shoulder height; stop if it hurts." },
  },
  "Band External Rotation": {
    cues: ["Band anchored at elbow height, elbow at your side at 90°.", "Rotate your forearm outward, return slowly."],
  },
  "Standing DB Calf Raise": {
    cues: ["Balls of your feet on a step 5–8 cm high, dumbbells at your sides.", "Rise as high as you can, lower over 3 seconds until your heels are below the step."],
    conditionNotes: { shin: "Calf strengthening is part of shin splint prehab.", achilles: "Lower slowly; pain ≤ 5/10." },
  },
  "Seated Band Tibialis Raise": {
    cues: ["Sit with legs straight, band looped over the top of your foot and anchored low in front.", "Pull your toes toward your shin, lower over 2 seconds."],
    conditionNotes: { shin: "Loaded progression from Tibialis Wall Raise." },
  },
  // ---------------- Warmup & cooldown ----------------
  "Kneeling Hip Flexor Stretch": {
    cues: ["One knee on the floor, squeeze the glute of the back leg.", "Push your hips forward slightly until you feel a stretch at the front of the hip."],
    conditionNotes: { apt: "Posterior pelvic tilt first, then lean. Do not arch your back." },
  },
  "Cat-Cow": {
    cues: ["On all fours, round your back (cat), then arch it slowly (cow).", "Move with your breath, slowly."],
    imageNote: "The image only shows the cat phase (rounded back); alternate it with the cow phase.",
    conditionNotes: { apt: "Keep the cow phase modest, emphasize the cat phase." },
  },
  "Band Pull-Apart": {
    cues: ["Arms straight in front of your chest, holding the band.", "Pull the band to your chest by squeezing your shoulder blades."],
  },
  "Calf Stretch": {
    cues: ["Hands on a wall, back leg straight.", "Back heel stays on the floor, hold for 20–30 seconds."],
  },
  "Quadruped Hip Circles": {
    cues: ["On all fours, back neutral.", "Circle one knee in a large, slow circle."],
    conditionNotes: { apt: "Back stays neutral, do not arch." },
  },
};

/** Nama otot kurasi (`media.ts`, kunci `MUSCLE_REGIONS`) → Inggris. Kunci tetap Indonesia karena dipakai sebagai data. */
export const MUSCLE_EN: Record<string, string> = {
  Dada: "Chest",
  Trisep: "Triceps",
  "Bahu depan": "Front delts",
  Bahu: "Shoulders",
  "Bahu samping": "Side delts",
  Core: "Core",
  "Perut (oblique)": "Abs (obliques)",
  "Lengan bawah (grip)": "Forearms (grip)",
  Latissimus: "Lats",
  Bisep: "Biceps",
  "Punggung tengah": "Mid back",
  Trapezius: "Trapezius",
  Perut: "Abs",
  "Punggung atas (trapezius tengah & bawah)": "Upper back (mid & lower trapezius)",
  "Bahu belakang": "Rear delts",
  "Rotator cuff": "Rotator cuff",
  "Punggung atas": "Upper back",
  "Punggung bawah (stabilisasi)": "Lower back (stabilization)",
  "Lengan bawah (ekstensor)": "Forearms (extensors)",
  Gluteus: "Glutes",
  Hamstring: "Hamstrings",
  "Paha depan": "Quads",
  "Punggung bawah": "Lower back",
  Betis: "Calves",
  Adduktor: "Adductors",
  "Gluteus medius": "Gluteus medius",
  "Gluteus medius (abduktor)": "Gluteus medius (abductor)",
  "Tulang kering (tibialis anterior)": "Shin (tibialis anterior)",
  "Betis (soleus)": "Calves (soleus)",
  "Hip flexor": "Hip flexors",
  "Abduktor pinggul": "Hip abductors",
};
