import { describe, expect, it } from "vitest";
import { dedupeActivities, isEmptyActivity } from "@/lib/intervals/dedupe";
import { normalizeActivity, normalizeActivityDetail, normalizeList } from "@/lib/intervals/normalize";
import { gpsDistance, isEvenlySpread, kmSplits, parseStreams, splitsFromStreams } from "@/lib/intervals/splits";
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
    expect(splits.map((s) => s.movingTimeSec)).toEqual([400, 400, 200]);
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
    expect(splits.map((x) => x.movingTimeSec)).toEqual([400, 400]);
  });

  it("HR rata-rata berbobot waktu, jeda di sampel diabaikan", () => {
    const s = steady(1000, 2, {});
    const heartrate = s.time.map((t) => (t < 250 ? 140 : 160));
    const [split] = kmSplits({ ...s, heartrate });
    expect(split.avgHr).toBeCloseTo(150, 0);
  });

  it("sisa < 50 m tidak jadi split; data kosong/rusak aman", () => {
    expect(kmSplits(steady(1030, 2.5))).toHaveLength(1);
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
    const d = normalizeActivityDetail(huaweiRun, streams);
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
    const r = splitsFromStreams(s, 4580);
    expect(r).toEqual({ splits: [], issue: "no-gps" });
    expect(splitsFromStreams({}, 4580).issue).toBe("no-streams");
  });

  it("jarak dibagi rata + ada GPS: split dari GPS, diskalakan ke total jarak", () => {
    const v = varying(3000);
    const linear = v.time.map((t) => (t * 3000) / v.time.at(-1)!);
    // GPS 3% lebih panjang dari jarak jam; hasil tetap diskalakan ke 3000 m.
    const lat = toLat(v.distance.map((d) => d * 1.03));
    const lng = v.time.map(() => 106.8);
    const r = splitsFromStreams({ time: v.time, distance: linear, lat, lng }, 3000);
    expect(r.source).toBe("gps");
    expect(r.splits).toHaveLength(3);
    expect(r.splits.reduce((a, x) => a + x.distanceKm, 0)).toBeCloseTo(3, 3);
    const paces = r.splits.map((x) => x.avgPaceSecPerKm!);
    expect(Math.max(...paces) - Math.min(...paces)).toBeGreaterThan(5);
  });

  it("stream jarak asli dipakai apa adanya", () => {
    expect(splitsFromStreams(varying(2000), 2000).source).toBe("distance");
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
