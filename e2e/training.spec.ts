import { expect, test } from "@playwright/test";
import { ls, seed } from "./helpers";

test.describe("latihan", () => {
  test.beforeEach(async ({ page }) => seed(page));

  test("generate lari, Variasi lain, Copy Set @smoke", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "izin clipboard hanya di Chromium");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/run");
    const main = page.locator("main");
    await expect(main).toContainText(/Pemanasan|WU/);
    const before = await main.innerText();
    await page.getByRole("button", { name: /Variasi/ }).click();
    await expect.poll(async () => (await main.innerText()) !== before).toBe(true);
    await page.getByRole("button", { name: "Copy Set" }).click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toMatch(/Run/);
    expect(text).not.toMatch(/[—]/);
  });

  test("generate ST → mode latihan → set → simpan sesi dengan RPE → beban session-RPE di Profil", async ({ page }) => {
    await page.goto("/strength");
    await page.getByRole("button", { name: "Mulai sesi", exact: true }).click();
    await expect(page).toHaveURL(/\/strength\/sesi/);
    // Centang beberapa set (pindah gerakan bila perlu).
    for (let i = 0; i < 8; i++) {
      const done = page.getByRole("button", { name: /^Selesai set/ });
      if (await done.isVisible().catch(() => false)) await done.click();
      else await page.getByRole("button", { name: /Berikutnya/ }).click();
      await page.waitForTimeout(200);
    }
    const active = JSON.parse((await ls(page, "hybrid-athlete.st-active.v1")) ?? "null");
    expect(active.sets.flat().length).toBeGreaterThan(0);
    await page.getByRole("button", { name: /Akhiri sesi|Selesai sesi/ }).click();
    await page.getByRole("radio", { name: /^6/ }).click();
    await page.getByRole("button", { name: "Simpan sesi" }).click();
    await expect.poll(async () => JSON.parse((await ls(page, "hybrid-athlete.st-sessions.v1")) ?? "[]").length).toBe(1);
    const [session] = JSON.parse((await ls(page, "hybrid-athlete.st-sessions.v1")) ?? "[]");
    expect(session.rpe).toBe(6);
    expect(session.sets.length).toBeGreaterThan(0);
    await page.goto("/");
    // Beban session-RPE (RPE × menit) dari sesi mode latihan ikut di ringkasan 7 hari.
    await expect(page.locator("main")).toContainText(/beban \d+/);
  });

  test("program: buat program dengan Hari H, lalu Sesi minggu ini", async ({ page }) => {
    await page.goto("/program");
    await page.getByRole("radio", { name: "HM" }).click();
    const grid = page.getByRole("grid", { name: "Pilih Hari H" });
    // Hari H dengan warna saran hijau bila ada dalam 8 bulan, selain itu hari pertama yang bisa disusun.
    let cell = grid.locator("button.bg-success-soft:not([disabled])").first();
    for (let i = 0; i < 8 && !(await cell.count()); i++) {
      await page.getByRole("button", { name: "Bulan berikutnya" }).click();
      cell = grid.locator("button.bg-success-soft:not([disabled])").first();
    }
    if (!(await cell.count())) cell = grid.locator("button:not([disabled])").first();
    await cell.click();
    const ack = page.getByRole("checkbox");
    if (await ack.first().isVisible().catch(() => false)) await ack.first().check();
    await page.getByRole("button", { name: /^Buat program/ }).click();
    expect(await ls(page, "hybrid-athlete.program")).toContain("raceDate");
    await page.goto("/");
    await expect(page.locator("main")).toContainText(/Sesi minggu ini|Minggu \d+/i);
  });
});
