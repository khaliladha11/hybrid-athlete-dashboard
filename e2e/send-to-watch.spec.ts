import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, ls, seed } from "./helpers";

// Demo Mode (tanpa INTERVALS_API_KEY): rute menjawab "demo" tanpa panggilan keluar.
test.describe("kirim ke jam (0.17)", () => {
  test.beforeEach(async ({ page }) => seed(page));

  test("generator lari: kirim di Demo Mode, catatan perangkat, aksesibel @smoke", async ({ page }) => {
    await page.goto("/run");
    const card = page.getByRole("region", { name: "Kirim ke jam" });
    await expect(card).toBeVisible();
    await expect(card.getByLabel("Tanggal")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    const res = page.waitForResponse((r) => r.url().endsWith("/api/intervals/workout"));
    await card.getByRole("button", { name: "Kirim ke jam" }).click();
    const body = await (await res).json();
    expect(body).toEqual({ status: "demo" });
    await expect(card.getByRole("status")).toContainText("Mode demo");
    await card.getByText("Apa ini?").click();
    await expect(card).toContainText("Custom Courses");
    await expect(card).toContainText("Upload planned workouts");
    await expectNoA11yViolations(page);
  });

  test("offline: kiriman masuk antrean, terkirim saat online lagi", async ({ page, context }) => {
    await page.goto("/run");
    const card = page.getByRole("region", { name: "Kirim ke jam" });
    await expect(card).toBeVisible();
    await context.setOffline(true);
    await card.getByRole("button", { name: "Kirim ke jam" }).click();
    await expect(card.getByRole("status")).toContainText("Sedang offline. Workout dikirim saat online lagi.");
    const queued = JSON.parse((await ls(page, "hybrid-athlete.send-queue.v1")) ?? "{}");
    expect(Object.keys(queued)).toHaveLength(1);
    expect(Object.keys(queued)[0]).toMatch(/^ha:g:\d{4}-\d{2}-\d{2}$/);
    const res = page.waitForResponse((r) => r.url().endsWith("/api/intervals/workout"));
    await context.setOffline(false);
    expect((await (await res).json()).status).toBe("demo");
    await expect.poll(async () => Object.keys(JSON.parse((await ls(page, "hybrid-athlete.send-queue.v1")) ?? "{}")).length).toBe(0);
  });

  test("rute menolak body tidak valid dan tidak membocorkan apa pun", async ({ request }) => {
    const bad = await request.post("/api/intervals/workout", { data: { action: "upsert", externalId: "evil", date: "x" } });
    expect(bad.status()).toBe(400);
    expect(await bad.json()).toEqual({ status: "error", code: "INVALID" });
  });
});
