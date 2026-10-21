import { describe, expect, it } from "vitest";
import { dedupeActivities, isEmptyActivity } from "@/lib/intervals/dedupe";
import { normalizeActivity, normalizeActivityDetail, normalizeList } from "@/lib/intervals/normalize";
import { RUN_MOVING_SPEED, WALK_MOVING_SPEED, buildTrack, gpsDistance, isEvenlySpread, kmSplits, parseStreams, splitTotals, splitsFromStreams } from "@/lib/intervals/splits";
import { mockActivities, mockActivityDetail } from "@/lib/mock-data";

const TODAY = "2026-09-28";

/** Bentuk asli dari intervals.icu: rekaman Huawei lengkap + salinan Strava tanpa isi. */
const huaweiRun = { id: "i197556034", source: "HUAWEI", start_date_local: "2026-10-15T17:20:31", type: "Run", name: "Afternoon Run", distance: 4580, moving_time: 2722, average_heartrate: 152, average_cadence: 70, icu_training_load: 45 };
const stravaCopy = { id: "20593954795", source: "STRAVA", start_date_local: "2026-10-15T17:20:31", _note: "STRAVA activities are not available via the API" };
const huaweiST = { id: "i192214172", source: "HUAWEI", start_date_local: "2026-10-01T18:53:10", type: "WeightTraining", name: "Evening Workout", moving_time: 2100, average_heartrate: 114, icu_training_load: 13 };
const stravaST = { id: "20406166879", source: "STRAVA", start_date_local: "2026-10-01T18:53:10" };

const acts = (raw: unknown[]) => normalizeList(raw, normalizeActivity);

describe("dedupe aktivitas ganda (Huawei + Strava)", () => {
  it("salinan Strava tanpa isi dibuang, rekaman Huawei disimpan (urutan apa pun)", () => {
    expect(dedupeActivities(acts([huaweiRun, stravaCopy])).map((a) => a.id)).toEqual(["i197556034"]);
    expect(dedupeActivities(acts([stravaCopy, huaweiRun])).map((a) => a.id)).toEqual(["i197556034"]);
    expect(dedupeActivities(acts([stravaST, huaweiRun, huaweiST, stravaCopy])).map((a) => a.id)).toEqual(["i197556034", "i192214172"]);
  });

  it("salinan Strava tanpa pasangan tetap ada, dengan nama yang jelas", () => {
    const [a] = dedupeActivities(acts([stravaCopy]));
    expect(a).toMatchObject({ id: "20593954795", source: "STRAVA", name: "Aktivitas Strava", category: "other" });
    expect(isEmptyActivity(a)).toBe(true);
    // Salinan yang hanya ditandai _note juga dikenali.
    expect(normalizeActivity({ id: 1, start_date_local: "2026-10-15T17:20:31", _note: stravaCopy._note })?.source).toBe("STRAVA");
  });

  it("aktivitas berbeda tidak digabung", () => {
    const morning = { ...huaweiRun, id: "a", start_date_local: "2026-10-15T07:00:00" };
    expect(dedupeActivities(acts([huaweiRun, morning]))).toHaveLength(2);
    // Jam mulai sama tapi dua rekaman berisi beda jenis: dua sesi berbeda.
    const st = { ...huaweiST, id: "b", start_date_local: huaweiRun.start_date_local };
    expect(dedupeActivities(acts([huaweiRun, st]))).toHaveLength(2);
  });

  it("dua rekaman sejenis selisih < 5 menit: yang paling lengkap disimpan", () => {
    const phone = { id: "p", source: "UPLOAD", start_date_local: "2026-10-15T17:21:10", type: "Run", distance: 4500, moving_time: 2700 };
    expect(dedupeActivities(acts([phone, huaweiRun])).map((a) => a.id)).toEqual(["i197556034"]);
    const later = { ...phone, start_date_local: "2026-10-15T17:30:00" };
    expect(dedupeActivities(acts([later, huaweiRun]))).toHaveLength(2);
  });

  it("data demo tidak punya duplikat", () => {
    const list = mockActivities(TODAY);
    expect(dedupeActivities(list)).toHaveLength(list.length);
  });
});

/** Stream sampel tiap detik dengan kecepatan konstan. */
function steady(meters: number, speed: number, extra: { hr?: number; cadence?: number } = {}) {
  const n = Math.ceil(meters / speed);
  const time = Array.from({ length: n + 1 }, (_, i) => i);
  return {
    time,
    distance: time.map((t) => Math.min(meters, t * speed)),
    heartrate: extra.hr ? time.map(() => extra.hr!) : undefined,
    cadence: extra.cadence ? time.map(() => extra.cadence!) : undefined,
  };
}

/** Stream dengan kecepatan berganti 2.5 / 3 m/s tiap 400 detik (lari sungguhan, jarak tidak linear). */
function varying(meters: number) {
  const time = [0];
  const distance = [0];
  while (distance.at(-1)! < meters) {
    const t = time.length;
    time.push(t);
    distance.push(Math.min(meters, distance.at(-1)! + (Math.floor(t / 400) % 2 ? 3 : 2.5)));
  }
  return { time, distance };
}

/** Koordinat yang berjalan ke utara sesuai stream jarak (1° lintang ≈ 111.195 km). */
const toLat = (distance: (number | null)[]) => distance.map((d) => (d === null ? null : -6.2 + d / 111_195));

describe("split per km dari stream", () => {
  it("kecepatan konstan: km penuh + sisa parsial", () => {
    const splits = kmSplits(steady(2500, 2.5, { hr: 150, cadence: 80 }));
    expect(splits.map((s) => s.index)).toEqual([1, 2, 3]);
    expect(splits.map((s) => Math.round(s.distanceKm * 1000))).toEqual([1000, 1000, 500]);
    splits.forEach((s, i) => expect(s.movingTimeSec).toBeCloseTo([400, 400, 200][i], 6));
    for (const s of splits) {
      expect(s.avgPaceSecPerKm).toBeCloseTo(400, 5);
      expect(s.avgHr).toBeCloseTo(150, 5);
      expect(s.cadenceSpm).toBeCloseTo(80, 5);
    }
  });

  it("berhenti (jarak tidak bertambah) tidak dihitung ke waktu split", () => {
    const s = steady(2000, 2.5);
    // Sisipkan 120 detik diam di meter 500.
    const at = s.distance.findIndex((d) => d >= 500);
    const time = [...s.time.slice(0, at + 1), ...Array.from({ length: 120 }, (_, i) => s.time[at] + i + 1), ...s.time.slice(at + 1).map((t) => t + 120)];
    const distance = [...s.distance.slice(0, at + 1), ...Array(120).fill(s.distance[at]), ...s.distance.slice(at + 1)];
    const splits = kmSplits({ time, distance });
    splits.forEach((x) => expect(x.movingTimeSec).toBeCloseTo(400, 6));
  });

  it("HR rata-rata berbobot waktu, jeda di sampel diabaikan", () => {
    const s = steady(1000, 2, {});
    const heartrate = s.time.map((t) => (t < 250 ? 140 : 160));
    const [split] = kmSplits({ ...s, heartrate });
    expect(split.avgHr).toBeCloseTo(150, 0);
  });

  it("sisa < 50 m digabung ke split sebelumnya; data kosong/rusak aman", () => {
    const merged = kmSplits(steady(1030, 2.5));
    expect(merged).toHaveLength(1);
    expect(merged[0].distanceKm).toBeCloseTo(1.03, 6);
    expect(merged[0].movingTimeSec).toBeCloseTo(412, 6);
    expect(kmSplits({})).toEqual([]);
    expect(kmSplits({ time: [0, 1, 2], distance: [null, null, null] })).toEqual([]);
    const s = steady(1200, 2.5);
    s.distance[100] = null as unknown as number;
    expect(kmSplits(s).map((x) => x.index)).toEqual([1, 2]);
  });

  it("parseStreams membaca respons intervals.icu dan menolak sampah", () => {
    expect(parseStreams([{ type: "time", data: [0, 1] }, { type: "distance", data: [0, "x", 3] }, null, { data: [1] }])).toEqual({
      time: [0, 1],
      distance: [0, null, 3],
    });
    expect(parseStreams({ error: true })).toEqual({});
  });

  it("cadence stream per-kaki dikali 2 sesuai rata-rata aktivitas", () => {
    const v = varying(1500);
    const s = { ...v, cadence: v.time.map(() => 70) };
    const streams = Object.entries(s).map(([type, data]) => ({ type, data }));
    // Ringkasan aktivitas harus cocok dengan stream, kalau tidak split ditolak validasi.
    const d = normalizeActivityDetail({ ...huaweiRun, distance: 1500, moving_time: v.time.at(-1) }, streams);
    expect(d?.splits[0].cadenceSpm).toBe(140);
    // Strength tidak punya split walau ada stream.
    expect(normalizeActivityDetail(huaweiST, streams)?.splits).toEqual([]);
  });
});

describe("sumber jarak split: stream asli, GPS, atau tidak ada", () => {
  it("jarak yang naik persis sebanding waktu dikenali sebagai dibagi rata", () => {
    const s = steady(4580, 4580 / 2722);
    expect(isEvenlySpread(s.time, s.distance)).toBe(true);
    const v = varying(4580);
    expect(isEvenlySpread(v.time, v.distance)).toBe(false);
  });

  it("jarak dibagi rata + tanpa GPS: tidak ada split palsu", () => {
    const s = steady(4580, 4580 / 2722, { hr: 150 });
    const r = splitsFromStreams(s, { distanceM: 4580 });
    expect(r).toEqual({ splits: [], issue: "no-gps" });
    expect(splitsFromStreams({}, { distanceM: 4580 }).issue).toBe("no-streams");
  });

  it("jarak dibagi rata + ada GPS: split dari GPS, diskalakan ke total jarak", () => {
    const v = varying(3000);
    const linear = v.time.map((t) => (t * 3000) / v.time.at(-1)!);
    // GPS 3% lebih panjang dari jarak jam; hasil tetap diskalakan ke 3000 m.
    const lat = toLat(v.distance.map((d) => d * 1.03));
    const lng = v.time.map(() => 106.8);
    const r = splitsFromStreams({ time: v.time, distance: linear, lat, lng }, { distanceM: 3000 });
    expect(r.source).toBe("gps");
    expect(r.splits).toHaveLength(3);
    expect(r.splits.reduce((a, x) => a + x.distanceKm, 0)).toBeCloseTo(3, 3);
    const paces = r.splits.map((x) => x.avgPaceSecPerKm!);
    expect(Math.max(...paces) - Math.min(...paces)).toBeGreaterThan(5);
  });

  it("stream jarak asli dipakai apa adanya", () => {
    expect(splitsFromStreams(varying(2000), { distanceM: 2000 }).source).toBe("distance");
  });

  it("gpsDistance: titik kosong atau (0,0) tidak menambah jarak", () => {
    const d = gpsDistance([null, -6.2, 0, -6.2 + 1000 / 111_195], [null, 106.8, 0, 106.8])!;
    expect(d[0]).toBeNull();
    expect(d[1]).toBe(0);
    expect(d[2]).toBe(0);
    expect(d[3]).toBeCloseTo(1000, 0);
    expect(gpsDistance([1, 1], [2, 2])).toBeUndefined();
  });

  it("parseStreams memecah latlng jadi lat & lng", () => {
    expect(parseStreams([{ type: "latlng", data: [-6.2, -6.3], data2: [106.8, 106.9] }])).toEqual({ lat: [-6.2, -6.3], lng: [106.8, 106.9] });
  });
});

/**
 * Bentuk data Afternoon Run 20 Okt (i199445873, 4,44 km, 44:01): 2 km jog dengan jarak halus,
 * lalu 2,44 km jalan kaki di mana jam hanya memperbarui jarak tiap 50 detik (datar lalu melompat).
 * Algoritma lama menilai bergerak per sampel, jadi bagian bertangga dihitung ~13 detik/km.
 */
function staircaseRun() {
  const time: number[] = [];
  const distance: number[] = [];
  const heartrate: number[] = [];
  const cadence: number[] = [];
  let t = 0;
  let d = 0;
  for (; d < 2000; t++) {
    time.push(t);
    distance.push(d);
    heartrate.push(160);
    cadence.push(71);
    d = Math.min(2000, d + 2.1);
  }
  const walkStart = t;
  const walkSpeed = 2440 / 1680;
  let shown = d;
  for (let k = 0; k <= 1680; k++, t++) {
    // Jarak di jam hanya naik tiap 50 detik.
    if (k % 50 === 0) shown = 2000 + walkSpeed * k;
    time.push(t);
    distance.push(Math.min(4440, k === 1680 ? 4440 : shown));
    heartrate.push(135);
    cadence.push(50);
  }
  return { streams: { time, distance, heartrate, cadence }, walkStart, elapsed: time.at(-1)! };
}

describe("kasus tepi data jam", () => {
  it("jarak bertangga (bug 20 Okt): bagian jalan kaki tetap dapat waktu & pace yang benar", () => {
    const { streams, elapsed } = staircaseRun();
    const splits = kmSplits(streams);
    expect(splits.map((s) => (s.distanceKm >= 0.995 ? s.index : Number(s.distanceKm.toFixed(2))))).toEqual([1, 2, 3, 4, 0.44]);
    // Jog 2,1 m/s ≈ 476 detik/km, jalan 2440 m / 1680 detik ≈ 689 detik/km.
    expect(splits[0].avgPaceSecPerKm).toBeCloseTo(1000 / 2.1, 0);
    for (const s of splits.slice(2)) expect(Math.abs(s.avgPaceSecPerKm! - 1680 / 2.44)).toBeLessThan(8);
    // Jumlah split = total: jarak 4440 m, waktu bergerak = seluruh waktu (tidak ada jeda).
    const totals = splitTotals(splits);
    expect(totals.distanceM).toBeCloseTo(4440, 6);
    // Satu langkah 0,8 m/detik di akhir jog ada di bawah ambang Strava, jadi ±2 detik.
    expect(Math.abs(totals.movingSec - elapsed)).toBeLessThan(2);
    // Lolos validasi terhadap ringkasan aktivitas.
    expect(splitsFromStreams(streams, { distanceM: 4440, movingSec: elapsed }).source).toBe("distance");
  });

  it("berhenti sungguhan di tengah data bertangga tetap tidak dihitung", () => {
    const s = steady(2000, 2.5);
    const at = s.distance.findIndex((d) => d >= 1000);
    // 300 detik diam, lalu lanjut.
    const time = [...s.time.slice(0, at + 1), ...Array.from({ length: 300 }, (_, i) => s.time[at] + i + 1), ...s.time.slice(at + 1).map((t) => t + 300)];
    const distance = [...s.distance.slice(0, at + 1), ...Array(300).fill(s.distance[at]), ...s.distance.slice(at + 1)];
    const totals = splitTotals(kmSplits({ time, distance }));
    expect(totals.movingSec).toBeCloseTo(800, 0);
    expect(totals.distanceM).toBeCloseTo(2000, 6);
  });

  it("lonjakan jarak sesaat (glitch) dibuang, sisa sesi tetap dihitung", () => {
    const s = steady(2000, 2.5);
    s.distance[300] += 3000;
    // Hanya sampel lonjakan yang ditolak; sampel sesudahnya dibandingkan dengan nilai terakhir yang diterima.
    expect(buildTrack(s.time, s.distance)!.rejected).toBe(1);
    const splits = kmSplits(s);
    expect(splits).toHaveLength(2);
    splits.forEach((x) => expect(x.movingTimeSec).toBeCloseTo(400, 6));
    expect(splitTotals(splits).distanceM).toBeCloseTo(2000, 6);
  });

  it("jarak reset ke 0 di tengah sesi: lanjut dari nilai baru, waktu tidak hilang", () => {
    const s = steady(2000, 2.5);
    const at = s.distance.findIndex((d) => d >= 1200);
    const distance = s.distance.map((d, i) => (i > at ? d - s.distance[at + 1] : d));
    const splits = kmSplits({ time: s.time, distance });
    const totals = splitTotals(splits);
    // Hanya langkah saat reset (2,5 m) yang hilang; waktunya tetap dihitung bergerak.
    expect(totals.distanceM).toBeCloseTo(2000 - 2.5, 6);
    expect(totals.movingSec).toBeCloseTo(800, 6);
  });

  it("GPS hilang 2 menit saat berlari: jarak diratakan, waktu tetap bergerak", () => {
    const v = varying(3000);
    const linear = v.time.map((t) => (t * 3000) / v.time.at(-1)!);
    const lat = toLat(v.distance).map((x, i) => (i >= 300 && i < 420 ? null : x));
    const lng = v.time.map((_, i) => (i >= 300 && i < 420 ? null : 106.8));
    const r = splitsFromStreams({ time: v.time, distance: linear, lat, lng }, { distanceM: 3000, movingSec: v.time.at(-1)! });
    expect(r.source).toBe("gps");
    expect(splitTotals(r.splits).movingSec).toBeCloseTo(v.time.at(-1)!, 0);
    expect(r.splits[0].avgPaceSecPerKm).toBeGreaterThan(350);
  });

  it("hasil yang tidak cocok dengan ringkasan aktivitas tidak ditampilkan", () => {
    const v = varying(2000);
    expect(splitsFromStreams(v, { distanceM: 2000, movingSec: 2 * v.time.at(-1)! })).toEqual({ splits: [], issue: "inconsistent" });
    expect(splitsFromStreams(v, { distanceM: 3000 }).issue).toBe("inconsistent");
  });

  it("ambang bergerak: lari = 30:00/mil seperti Strava, jalan kaki lebih rendah", () => {
    expect(RUN_MOVING_SPEED).toBeCloseTo(0.894, 3);
    const slow = steady(1000, 0.7);
    expect(splitTotals(kmSplits(slow, 1000, RUN_MOVING_SPEED)).movingSec).toBe(0);
    expect(Math.abs(splitTotals(kmSplits(slow, 1000, WALK_MOVING_SPEED)).movingSec - 1000 / 0.7)).toBeLessThan(1);
  });
});

describe("detail demo", () => {
  const byName = (name: string) => mockActivities(TODAY).find((a) => a.name === name)!;

  it("sesi steady: satu interval, split per km sampai total jarak", () => {
    const a = byName("Long Run Minggu Pagi");
    const d = mockActivityDetail(a.id, TODAY)!;
    expect(d.intervals).toHaveLength(1);
    expect(d.splits).toHaveLength(Math.ceil(a.distanceKm!));
    expect(d.splits.reduce((s, x) => s + x.distanceKm, 0)).toBeCloseTo(a.distanceKm!, 1);
    expect(d.splits.reduce((s, x) => s + x.movingTimeSec, 0)).toBeCloseTo(a.movingTimeSec!, -1);
    expect(d.splits.every((s) => s.avgHr && s.cadenceSpm && s.cadenceSpm > 150)).toBe(true);
  });

  it("sesi interval: struktur WORK/RECOVERY + split", () => {
    const d = mockActivityDetail(byName("Norwegian 4×4").id, TODAY)!;
    expect(d.intervals.filter((iv) => iv.type === "WORK")).toHaveLength(4);
    expect(d.splits.length).toBeGreaterThan(5);
  });

  it("strength: tanpa split dan tanpa interval", () => {
    const d = mockActivityDetail(byName("Lower Body ST").id, TODAY)!;
    expect(d.splits).toEqual([]);
    expect(d.intervals).toEqual([]);
  });
});
