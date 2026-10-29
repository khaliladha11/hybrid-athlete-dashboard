import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { ls, seed } from "./helpers";

test.describe("insight @smoke", () => {
  test.beforeEach(async ({ page }) => seed(page));

  test("semua bagian tampil, Lihat tabel, ganti rentang", async ({ page }) => {
    await page.goto("/insight");
    for (const h of ["Kebugaran CTL/ATL", "Km mingguan 80/20", "Heatmap otot", "Tren PR", "Check-in", "Kalender aktivitas"]) {
      await expect(page.getByRole("heading", { name: h })).toBeVisible();
    }
    const card = page.locator("section", { has: page.getByRole("heading", { name: "Km mingguan 80/20" }) });
    await card.getByRole("button", { name: "Lihat tabel" }).click();
    await expect(card.getByRole("table")).toBeVisible();
    await expect(card.getByRole("button", { name: "Sembunyikan tabel" })).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("radio", { name: "12 minggu" }).first().click();
    await expect(page.getByText(/dalam 12 minggu/).first()).toBeVisible();
  });
});

test.describe("offline", () => {
  test.beforeEach(async ({ page }) => seed(page));

  test("service worker menyimpan tab utama; offline: banner, data terakhir, set tercatat", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // Tunggu salinan rute utama (termasuk mode latihan) tersimpan.
    await expect
      .poll(async () => page.evaluate(async () => {
        const names = (await caches.keys()).filter((n) => n.startsWith("ha-pages-"));
        let n = 0;
        for (const c of names) n += (await (await caches.open(c)).keys()).length;
        return n;
      }), { timeout: 30_000 })
      .toBeGreaterThanOrEqual(7);
    await context.setOffline(true);
    for (const [path, text] of [["/run", "Generator Lari"], ["/program", "Program Target"], ["/strength", "Generator Strength"]] as const) {
      await page.goto(path);
      await expect(page.locator("main")).toContainText(text);
      await expect(page.getByRole("status").filter({ hasText: "Sedang offline" })).toBeVisible();
      await expect(page.getByText(/^Data terakhir/)).toBeVisible();
    }
    await page.getByRole("button", { name: "Mulai sesi", exact: true }).click();
    await expect(page).toHaveURL(/\/strength\/sesi/);
    await page.getByRole("button", { name: /^Selesai set/ }).click();
    const active = JSON.parse((await ls(page, "hybrid-athlete.st-active.v1")) ?? "null");
    expect(active.sets.flat().length).toBe(1);
    await page.goto("/activity/belum-pernah-dibuka");
    await expect(page.getByText("Halaman ini belum tersimpan untuk offline")).toBeVisible();
    await context.setOffline(false);
    await page.goto("/");
    await expect(page.getByRole("status").filter({ hasText: "Sedang offline" })).toHaveCount(0);
  });
});

test.describe("cadangan", () => {
  test("ekspor JSON lalu impor di perangkat baru: log, sesi, check-in kembali", async ({ page, browser }) => {
    const session = { id: "s-uji", date: "2026-10-20", startedAt: "2026-10-20T12:00:00.000Z", type: "lower", title: "Lower", difficulty: "moderate", durationMin: 40, rpe: 6, setsDone: 6, setsPlanned: 6, movements: ["Glute Bridge"], updatedAt: "2026-10-20T13:00:00.000Z" };
    const checkin = { date: "2026-10-20", shin: 3, sleep: 4, updatedAt: "2026-10-20T01:00:00.000Z" };
    const log = [{ id: "l-uji", date: "2026-10-20", movement: "Glute Bridge", value: 12, valueUnit: "reps", target: { lo: 10, hi: 15 }, rpe: 6, targetRpe: 6, deload: false, blockIndex: 0, updatedAt: "2026-10-20T13:00:00.000Z" }];
    await seed(page, { "hybrid-athlete.st-sessions.v1": [session], "hybrid-athlete.checkins.v1": [checkin], "hybrid-athlete.log.v1": log });
    await page.goto("/setting");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Ekspor JSON" }).click();
    const file = await (await download).path();
    const data = JSON.parse(readFileSync(file, "utf-8"));
    expect(data.version).toBe(6);
    expect(data.checkins).toEqual([checkin]);

    const fresh = await browser.newContext();
    const p2 = await fresh.newPage();
    await seed(p2);
    await p2.goto("/setting");
    await p2.locator('input[type="file"]').setInputFiles(file);
    await expect(p2.getByText(/check-in baru/)).toBeVisible();
    expect(JSON.parse((await ls(p2, "hybrid-athlete.checkins.v1")) ?? "[]")).toEqual([checkin]);
    expect(JSON.parse((await ls(p2, "hybrid-athlete.st-sessions.v1")) ?? "[]")[0].id).toBe("s-uji");
    expect(JSON.parse((await ls(p2, "hybrid-athlete.log.v1")) ?? "[]").some((e: { id: string }) => e.id === "l-uji")).toBe(true);
    await fresh.close();
  });
});
