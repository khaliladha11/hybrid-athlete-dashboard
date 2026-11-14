import { describe, expect, it } from "vitest";
import { applyBackup, buildBackup, parseBackup, type BackupStore } from "@/lib/backup";
import { formatDateId } from "@/lib/date";
import { DAY_MONTH, formatDay, formatInstant, formatNumber, LONG_DATE, MONTH_YEAR, WEEKDAY_LONG } from "@/lib/i18n/format";
import { localeCookie, localeFromAcceptLanguage, resolveLocale } from "@/lib/i18n/locale";
import { baseProfile } from "@/lib/profile";
import { parseShareOptions } from "@/lib/share-card";
import { localFromParts, partsFromLocal, validatePart } from "@/lib/sync/parts";

/** Format & preferensi bahasa (1.2.0). Tanggal fiktif. */

describe("format tanggal", () => {
  it("Indonesia tetap seperti sebelum 1.2.0, Inggris en-GB", () => {
    expect(formatDay("id", "2026-11-14", DAY_MONTH)).toBe("14 Nov");
    expect(formatDay("en", "2026-11-14", DAY_MONTH)).toBe("14 Nov");
    expect(formatDay("id", "2026-11-14", WEEKDAY_LONG)).toBe("Sabtu");
    expect(formatDay("en", "2026-11-14", WEEKDAY_LONG)).toBe("Saturday");
    expect(formatDay("id", "2026-11-14", MONTH_YEAR)).toBe("November 2026");
    expect(formatDay("en", "2026-08-03", LONG_DATE)).toBe("3 August 2026");
  });

  it("September Inggris tiga huruf, bukan Sept", () => {
    expect(formatDay("en", "2026-09-07", DAY_MONTH)).toBe("7 Sep");
  });

  it("tanggal tidak valid atau kosong → ·", () => {
    expect(formatDay("en", "bukan-tanggal", DAY_MONTH)).toBe("·");
    expect(formatDay("id", undefined, DAY_MONTH)).toBe("·");
    expect(formatInstant("en", "x", DAY_MONTH)).toBe("·");
  });

  it("tanggal kalender tidak bergeser zona (UTC)", () => {
    expect(formatDay("en", "2026-01-01T23:30", DAY_MONTH)).toBe("1 Jan");
  });

  it("formatDateId memakai locale, bawaan Indonesia", () => {
    expect(formatDateId("2026-11-14")).toBe(formatDateId("2026-11-14", "id"));
    expect(formatDateId("2026-11-14", "en")).toBe("Sat 14 Nov");
  });

  it("jam di zona WIB", () => {
    expect(formatInstant("en", "2026-11-14T03:05:00Z", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false })).toBe("10:05");
  });
});

describe("format angka", () => {
  it("Indonesia memakai koma seperti toLocaleString id-ID, Inggris titik", () => {
    expect(formatNumber("id", 12.5)).toBe((12.5).toLocaleString("id-ID"));
    expect(formatNumber("id", 12.5)).toBe("12,5");
    expect(formatNumber("en", 12.5)).toBe("12.5");
    expect(formatNumber("en", 1234)).toBe("1,234");
  });
});

describe("pilihan bahasa", () => {
  it("tersimpan → browser → Indonesia", () => {
    expect(resolveLocale("en", "id-ID")).toBe("en");
    expect(resolveLocale(null, "en-US,en;q=0.9")).toBe("en");
    expect(resolveLocale(undefined, "fr-FR,de;q=0.8")).toBe("id");
    expect(resolveLocale("xx", null)).toBe("id");
  });

  it("Accept-Language mengikuti nilai q dan kode lama in", () => {
    expect(localeFromAcceptLanguage("fr;q=1, en;q=0.5, id;q=0.8")).toBe("id");
    expect(localeFromAcceptLanguage("in")).toBe("id");
    expect(localeFromAcceptLanguage("en;q=0, id;q=0.1")).toBe("id");
    expect(localeFromAcceptLanguage("")).toBeNull();
  });

  it("cookie hanya berisi kode bahasa", () => {
    expect(localeCookie("en")).toBe("ha-lang=en; Path=/; Max-Age=31536000; SameSite=Lax");
  });

  it("bahasa ikut sinkron di bagian preferensi", () => {
    const raw = { settings: null, program: null, theme: null, blockEnabled: null, lang: "en", onboarding: null };
    const parts = partsFromLocal(raw, [], baseProfile);
    expect(parts.preferences).toEqual({ lang: "en" });
    expect(localFromParts(parts, baseProfile).lang).toBe("en");
    expect(validatePart("preferences", { lang: "fr" }, baseProfile)).toEqual({});
  });

  it("bahasa ikut ekspor/impor cadangan", () => {
    const file = buildBackup({ log: [], settings: null, program: "", theme: "system", blockEnabled: true, lang: "en", onboarding: null, now: "2026-10-22T03:00:00.000Z" } as Parameters<typeof buildBackup>[0]);
    expect(file.preferences.lang).toBe("en");
    const parsed = parseBackup(JSON.parse(JSON.stringify(file)))!;
    expect(parsed.lang).toBe("en");
    let lang = "";
    const merged = { added: 0, skipped: 0 };
    const store: BackupStore = {
      getSettingsRaw: () => "",
      setSettingsRaw: () => {},
      getProgramRaw: () => "",
      setProgramRaw: () => {},
      getThemeRaw: () => "",
      setTheme: () => {},
      getBlockRaw: () => "",
      setBlockEnabled: () => {},
      getLangRaw: () => lang,
      setLang: (v: string) => (lang = v),
      setOnboarding: () => {},
      mergeLog: () => merged,
      mergePrs: () => merged,
      mergeSessions: () => merged,
      mergeCheckins: () => merged,
    } as unknown as BackupStore;
    applyBackup(parsed, store, baseProfile);
    expect(lang).toBe("en");
  });

  it("kartu bagikan: bawaan ikut bahasa app, pilihan tersimpan tetap menang", () => {
    expect(parseShareOptions(null, "id").lang).toBe("id");
    expect(parseShareOptions(null).lang).toBe("en");
    expect(parseShareOptions(JSON.stringify({ format: "feed" }), "id").lang).toBe("id");
    expect(parseShareOptions(JSON.stringify({ lang: "en" }), "id").lang).toBe("en");
  });
});

