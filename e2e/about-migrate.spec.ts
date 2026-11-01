import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, ls, seed } from "./helpers";

const VERSION = JSON.parse(readFileSync("package.json", "utf-8")).version as string;

test.describe("Tentang & versi (1.0)", () => {
  test("versi terpasang dan tautan; versi baru hanya bila rilis upstream lebih tinggi @smoke", async ({ page }) => {
    await seed(page, { "hybrid-athlete.schema": "1" });
    await page.route("**/api/app/latest", (r) => r.fulfill({ json: { latest: "v99.0.0" } }));
    await page.goto("/setting#tentang");
    const card = page.locator("#tentang");
    await expect(card.getByTestId("app-version")).toHaveText(VERSION);
    await expect(card.getByRole("link", { name: "Lisensi (MIT)" })).toHaveAttribute("href", /\/LICENSE$/);
    await expect(card.getByRole("link", { name: "Ada versi baru · v99.0.0" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("tanpa rilis atau gagal: tidak ada baris versi baru", async ({ page }) => {
    await seed(page, { "hybrid-athlete.schema": "1" });
    await page.route("**/api/app/latest", (r) => r.fulfill({ status: 500, body: "" }));
    await page.goto("/setting#tentang");
    await expect(page.locator("#tentang").getByTestId("app-version")).toHaveText(VERSION);
    await expect(page.getByText(/Ada versi baru/)).toHaveCount(0);
  });
});

test.describe("migrasi data perangkat (1.0)", () => {
  test("data bentuk lama dimigrasi sekali; salinan sebelum migrasi bisa diunduh lalu diimpor", async ({ page }) => {
    // Bentuk 0.12–0.14 (fiktif): log tanpa id, program dengan override geser tanpa Hari H.
    const oldLog = [{ date: "2026-01-05", movement: "Goblet Squat", load: 10, value: 10, valueUnit: "reps", target: { lo: 8, hi: 10 }, rpe: 6, targetRpe: 7, deload: false, blockIndex: 1 }];
    const oldProgram = { race: "10k", goal: "1:05:00", startDate: "2026-01-05", runsPerWeek: 3, overrides: [{ sessionId: "a", action: "move", toDate: "2026-01-08", decidedAt: "2026-01-06T00:00:00.000Z" }] };
    await seed(page, { "hybrid-athlete.log.v1": oldLog, "hybrid-athlete.program": oldProgram });
    await page.goto("/setting#data");
    await expect(page.getByText(/Cadangan sebelum pembaruan data/)).toBeVisible();
    expect(await ls(page, "hybrid-athlete.schema")).toBe("1");
    const log = JSON.parse((await ls(page, "hybrid-athlete.log.v1")) ?? "[]");
    expect(log[0].id).toBeTruthy();
    expect(JSON.parse((await ls(page, "hybrid-athlete.program")) ?? "{}").overrides).toBeUndefined();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Unduh" }).click();
    const file = await (await download).path();
    const backup = JSON.parse(readFileSync(file, "utf-8"));
    expect(backup).toMatchObject({ app: "hybrid-athlete", version: 7, schema: 0 });
    expect(backup.log[0].id).toBeUndefined();

    await page.locator('input[type="file"]').setInputFiles({ name: "lama.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
    await expect(page.getByRole("status").filter({ hasText: "Impor selesai" })).toContainText("0 entri log baru, 1 dilewati");
  });
});
