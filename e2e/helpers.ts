import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Status onboarding selesai (fiktif), supaya alur selain onboarding langsung masuk aplikasi. */
export const ONBOARDED = {
  version: 1,
  currentStep: "summary",
  completed: ["welcome", "terms", "connection", "protect", "profile", "conditions", "zones", "equipment", "install", "summary"],
  skipped: [],
  termsVersion: 2,
  termsAcceptedAt: "2026-10-26T00:00:00.000Z",
  completedAt: "2026-10-26T00:00:00.000Z",
  tourCompletedAt: "2026-10-26T00:00:00.000Z",
  conditionsChoice: "none",
  zonePath: "estimate",
};

/** Alat fiktif (dumbbell, band) supaya generator ST punya gerakan berbeban. */
export const SETTINGS = {
  version: 1,
  profile: { name: "Atlet Uji" },
  equipment: { dumbbell: { enabled: true, handleKg: 2, handles: 2 }, barbell: { enabled: false }, plates: [{ kg: 1.25, count: 4 }, { kg: 2, count: 4 }], bands: ["Light", "Medium"], pullUpBar: true, bench: true, bandAnchor: true, other: [], items: [] },
};

/** Isi localStorage sekali sebelum halaman pertama (tidak menimpa perubahan selama test). */
export async function seed(page: Page, data: Record<string, unknown> = {}) {
  const all = { "hybrid-athlete.onboarding.v1": ONBOARDED, "hybrid-athlete.settings.v1": SETTINGS, ...data };
  await page.addInitScript((entries) => {
    if (sessionStorage.getItem("e2e-seeded")) return;
    for (const [k, v] of Object.entries(entries)) {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
    sessionStorage.setItem("e2e-seeded", "1");
  }, all);
}

/** Pelanggaran aksesibilitas serius/kritis (axe, WCAG 2.1 A/AA). */
export async function expectNoA11yViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
}

export const ls = (page: Page, key: string) => page.evaluate((k) => localStorage.getItem(k), key);
