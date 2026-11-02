import { describe, expect, it } from "vitest";
import { DOCS } from "@/lib/docs-links";
import { HELP_DISCLAIMER, HELP_INTRO, HELP_LINKS, HELP_TOPICS } from "@/lib/help";
import { WATCH_BRANDS, WATCH_STEPS } from "@/lib/intervals/watch";

describe("teks Bantuan (1.0.0-rc.2)", () => {
  it("lima topik dengan id unik, judul, dan isi", () => {
    expect(HELP_TOPICS.map((t) => t.id)).toEqual(["saran", "program", "latihan", "jam", "data"]);
    for (const t of HELP_TOPICS) {
      expect(t.title.length).toBeGreaterThan(3);
      expect(t.items.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("copy mengikuti DESIGN-SYSTEM §7: tanpa tanda seru dan tanpa em dash", () => {
    const all = [HELP_INTRO, HELP_DISCLAIMER, ...HELP_TOPICS.flatMap((t) => [t.title, ...t.items]), ...HELP_LINKS.map((l) => l.label)];
    for (const s of all) {
      expect(s, s).not.toMatch(/!/);
      expect(s, s).not.toMatch(/—/);
    }
  });

  it("tautan memakai DOCS (panduan, keterbatasan, dasar ilmiah) dan langkah jam ada untuk setiap merek", () => {
    expect(HELP_LINKS.map((l) => l.href)).toEqual([DOCS.guide, DOCS.limitations, DOCS.references]);
    for (const b of WATCH_BRANDS) expect(WATCH_STEPS[b].length).toBeGreaterThan(0);
  });
});
