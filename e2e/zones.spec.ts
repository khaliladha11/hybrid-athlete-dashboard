import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, ls, seed } from "./helpers";

// Demo Mode: LTHR 168 dan HR maks 188 fiktif dari data demo.
test.describe("zona HR & RPE (0.17)", () => {
  test.beforeEach(async ({ page }) => seed(page));

  test("LTHR dari intervals.icu, manual menolak tumpang tindih, target dipakai generator @smoke", async ({ page }) => {
    await page.goto("/setting#zona");
    const card = page.locator("#zona");
    await expect(card).toContainText("140–159");
    await card.getByRole("radio", { name: "LTHR" }).click();
    await expect(card.getByLabel("LTHR lari (bpm)")).toHaveValue("168");
    await expect(card).toContainText("Dari pengaturan lari intervals.icu.");
    await expect(card).toContainText("160–167");
    await expectNoA11yViolations(page);

    await card.getByRole("radio", { name: "Manual" }).click();
    await card.getByLabel("Z2 sampai").fill("140");
    await card.getByLabel("Z3 sampai").fill("141");
    await expect(card).toContainText("tumpang tindih");
    await expect(card).toContainText("Belum disimpan");
    const saved = JSON.parse((await ls(page, "hybrid-athlete.settings.v1")) ?? "{}");
    expect(saved.hrZones.tops[2]).toBeGreaterThanOrEqual(saved.hrZones.tops[1] + 3);
    await card.getByLabel("Z2 sampai").fill("148");
    await card.getByLabel("Z3 sampai").fill("156");
    await expect(card).not.toContainText("Belum disimpan");

    await page.goto("/run");
    await page.getByRole("radio", { name: "Easy" }).first().click();
    await expect(page.locator("main")).toContainText("HR < 149");
  });

  test("RPE ST tidak bisa lebih dari 7", async ({ page }) => {
    await page.goto("/setting#zona");
    const up = page.getByRole("button", { name: "Naikkan RPE High" });
    await expect(up).toBeDisabled();
    await page.getByRole("button", { name: "Turunkan RPE High" }).click();
    await expect(page.getByRole("button", { name: "Naikkan RPE High" })).toBeEnabled();
    const saved = JSON.parse((await ls(page, "hybrid-athlete.settings.v1")) ?? "{}");
    expect(saved.strengthRpe).toEqual({ easy: 5, moderate: 6, high: 6 });
  });
});
