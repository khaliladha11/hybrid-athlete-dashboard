import { describe, expect, it } from "vitest";
import { checkText, uploadOffText, warningTexts, thresholdPaceText, CHECK_LABEL } from "@/lib/intervals/send-status";
import { WATCH_BRANDS, WATCH_STEPS, pushErrors, uploadEnabled } from "@/lib/intervals/watch";
import { defaultSettings, parseSettings } from "@/lib/athlete-settings";
import { baseProfile } from "@/lib/profile";

describe("langkah sampai di jam (0.17)", () => {
  it("setiap merek punya langkah; teks tanpa em dash dan tanpa tanda seru", () => {
    for (const b of WATCH_BRANDS) {
      expect(WATCH_STEPS[b].length, b).toBeGreaterThan(0);
      for (const t of [...WATCH_STEPS[b], uploadOffText(b)]) expect(t).not.toMatch(/[—!]/);
    }
    for (const t of [CHECK_LABEL, thresholdPaceText]) expect(t).not.toMatch(/[—!]/);
  });

  it("tidak pernah menjanjikan workout pasti sudah di jam", () => {
    const all = [...WATCH_BRANDS.flatMap((b) => WATCH_STEPS[b]), checkText({ status: "checked", found: true, errors: [] })];
    for (const t of all) expect(t).not.toMatch(/sudah (ada|masuk|terkirim) (di|ke) jam|pasti/i);
    expect(checkText({ status: "checked", found: true, errors: [] })).toMatch(/Kalau belum ada di jam/);
  });

  it("Huawei: jalur cadangan Upload to Huawei dan kirim dari Huawei Health", () => {
    const t = WATCH_STEPS.huawei.join(" ");
    expect(t).toContain("Upload to Huawei");
    expect(t).toContain("Custom Courses");
    expect(t).toContain("ikon jam");
  });

  it("sakelar unggah & error unggah dibaca dari data intervals.icu", () => {
    expect(uploadEnabled({ huawei_upload_workouts: true }, "huawei")).toBe(true);
    expect(uploadEnabled({ huawei_upload_workouts: false }, "huawei")).toBe(false);
    expect(uploadEnabled({ icu_garmin_upload_workouts: false }, "garmin")).toBe(false);
    expect(uploadEnabled({}, "coros")).toBeUndefined();
    expect(uploadEnabled({ huawei_upload_workouts: true }, "other")).toBeUndefined();
    expect(pushErrors({ push_errors: [{ service: "HUAWEI", message: "Workout has no suitable steps" }, { message: "" }, { service: "X", message: "y".repeat(300) }] })).toEqual([
      "HUAWEI: Workout has no suitable steps",
      `X: ${"y".repeat(157)}`,
    ]);
    expect(pushErrors(null)).toEqual([]);
  });

  it("teks hasil cek & peringatan", () => {
    expect(checkText({ status: "checked", found: false, errors: [] })).toMatch(/tidak ditemukan/);
    expect(checkText({ status: "checked", found: true, errors: ["HUAWEI: gagal"] })).toBe("intervals.icu mencatat unggah gagal: HUAWEI: gagal");
    expect(checkText({ status: "checked", found: true, uploadOn: false, errors: [] }, "huawei")).toBe(uploadOffText("huawei"));
    expect(warningTexts(["NO_THRESHOLD_PACE", "UPLOAD_OFF"], "huawei")).toEqual([thresholdPaceText, uploadOffText("huawei")]);
    expect(uploadOffText("huawei")).toContain("Settings › Connections › Huawei › Upload planned workouts");
  });

  it("merek jam tersimpan di pengaturan; nilai asing dibuang", () => {
    expect(parseSettings(JSON.stringify({ ...defaultSettings(baseProfile), watchBrand: "huawei" }), baseProfile).watchBrand).toBe("huawei");
    expect(parseSettings(JSON.stringify({ ...defaultSettings(baseProfile), watchBrand: "nokia" }), baseProfile).watchBrand).toBeUndefined();
  });
});
