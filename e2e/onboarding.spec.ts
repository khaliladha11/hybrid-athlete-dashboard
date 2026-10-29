import { expect, test, type Page } from "@playwright/test";
import { ONBOARDED, ls, seed } from "./helpers";

/** Jalankan wizard sampai keluar dari /onboarding, dengan pilihan paling sederhana di setiap langkah. */
async function completeWizard(page: Page) {
  for (let i = 0; i < 30 && new URL(page.url()).pathname.startsWith("/onboarding"); i++) {
    const terms = page.getByRole("checkbox", { name: "Saya mengerti dan setuju." });
    if (await terms.isVisible().catch(() => false)) await terms.check();
    const name = page.getByRole("textbox", { name: /Nama/ });
    if ((await name.isVisible().catch(() => false)) && !(await name.inputValue())) {
      await name.fill("Atlet Uji");
      await name.blur();
    }
    const none = page.getByRole("button", { name: "Tidak ada kondisi" });
    if ((await none.isVisible().catch(() => false)) && (await none.getAttribute("aria-pressed")) !== "true") await none.click();
    const zones = page.getByRole("radiogroup", { name: "Cara mengisi zona lari" });
    if ((await zones.isVisible().catch(() => false)) && !(await zones.getByRole("radio", { checked: true }).count())) await zones.getByRole("radio").first().click();
    for (const label of ["Mulai", "Setuju dan lanjut", "Lanjut dengan Demo Mode", "Nanti saja", "Simpan dan lanjut", "Lewati tur", "Lanjut"]) {
      const b = page.getByRole("button", { name: label, exact: true });
      if ((await b.isVisible().catch(() => false)) && (await b.isEnabled())) {
        await b.click();
        break;
      }
    }
    await page.waitForTimeout(300);
  }
}

test.describe("onboarding", () => {
  test("pengguna baru: wizard sampai selesai, lalu Profil", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/onboarding/);
    await completeWizard(page);
    await expect(page).not.toHaveURL(/\/onboarding/);
    const state = JSON.parse((await ls(page, "hybrid-athlete.onboarding.v1")) ?? "{}");
    expect(state.completedAt).toBeTruthy();
    expect(state.termsVersion).toBe(2);
  });

  test("pengguna lama (data sebelum 0.11): hanya disclaimer, data tetap", async ({ page }) => {
    const log = [{ date: "2026-10-01", movement: "Glute Bridge", value: 12, valueUnit: "reps", target: { lo: 10, hi: 15 }, rpe: 6, targetRpe: 6, deload: false, blockIndex: 0 }];
    await seed(page, { "hybrid-athlete.onboarding.v1": null, "hybrid-athlete.log.v1": log });
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/onboarding/);
    await page.getByRole("checkbox", { name: "Saya mengerti dan setuju." }).check();
    await page.getByRole("button", { name: "Setuju dan buka aplikasi" }).click();
    await expect(page.locator("main")).toContainText(/Saran|Wellness/);
    const state = JSON.parse((await ls(page, "hybrid-athlete.onboarding.v1")) ?? "{}");
    expect(state.migrated).toBe(true);
    expect(JSON.parse((await ls(page, "hybrid-athlete.log.v1")) ?? "[]")).toHaveLength(1);
  });

  test("disclaimer versi baru: diminta setuju lagi", async ({ page }) => {
    await seed(page, { "hybrid-athlete.onboarding.v1": { ...ONBOARDED, termsVersion: 1 } });
    await page.goto("/");
    await page.getByRole("checkbox", { name: "Saya mengerti dan setuju." }).check();
    await page.getByRole("button", { name: "Setuju dan buka aplikasi" }).click();
    await expect(page.locator("main")).toContainText(/Saran|Wellness/);
    expect(JSON.parse((await ls(page, "hybrid-athlete.onboarding.v1")) ?? "{}").termsVersion).toBe(2);
  });
});
