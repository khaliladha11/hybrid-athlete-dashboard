import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, ls, seed } from "./helpers";

/** Profil minimalis (1.1.0): Gita dilipat, carousel Wellness, kartu minggu ini, tanpa tombol Generate, ekspor PNG. */
test.describe("profil 1.1 @smoke", () => {
  test.beforeEach(async ({ page }) => seed(page));

  test("Gita dilipat, buka/tutup diingat hari ini", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("#saran");
    const toggle = card.getByRole("button", { name: /Lihat detail/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(card.getByRole("listitem")).toHaveCount(0);
    await toggle.click();
    const close = card.getByRole("button", { name: "Tutup detail" });
    await expect(close).toHaveAttribute("aria-expanded", "true");
    await expect(card.getByRole("listitem").first()).toBeVisible();
    expect(JSON.parse((await ls(page, "hybrid-athlete.coach-collapse")) ?? "{}")).toMatchObject({ open: true });
    await page.reload();
    await expect(page.locator("#saran").getByRole("button", { name: "Tutup detail" })).toHaveAttribute("aria-expanded", "true");
  });

  test("carousel Wellness, kartu minggu ini, tanpa tombol Generate, a11y", async ({ page }) => {
    // Isi minggu demo bergantung pada hari; satu sesi ST lokal hari ini (fiktif) menjamin minggu ini tidak kosong.
    const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
    const st = { id: "e2e-st", date: today, startedAt: `${today}T12:00:00.000Z`, type: "lower", title: "Lower", difficulty: "moderate", durationMin: 40, rpe: 6, setsDone: 12, setsPlanned: 12, movements: [], updatedAt: `${today}T13:00:00.000Z` };
    await page.addInitScript((v) => localStorage.setItem("hybrid-athlete.st-sessions.v1", v), JSON.stringify([st]));
    await page.goto("/");
    const carousel = page.getByRole("region", { name: "Info wellness" });
    await expect(carousel).toHaveAttribute("aria-roledescription", "carousel");
    const slides = carousel.locator('[aria-roledescription="slide"]');
    const n = await slides.count();
    expect(n).toBeGreaterThan(1);
    await expect(slides.first()).toHaveAttribute("aria-label", `1 dari ${n}`);
    await expect(carousel.getByRole("button", { name: "Info sebelumnya" })).toBeDisabled();
    await carousel.getByRole("button", { name: "Info berikutnya" }).click();
    await expect(carousel.getByRole("button", { name: "Info sebelumnya" })).toBeEnabled();

    await expect(page.getByRole("link", { name: /Generate lari|Generate ST/ })).toHaveCount(0);
    // 1.3.0: kartu "Minggu ini · latihan" bawaan, tabel per hari, lalu ganti ke kartu lari (tersimpan).
    const training = page.getByRole("region", { name: "Minggu ini · latihan" });
    await expect(training.getByRole("radio", { name: "Semua latihan" })).toBeChecked();
    await expect(training.getByRole("img", { name: /^Minggu ini (\d+ jam )?\d+ menit, \d+ sesi: .*strength .*\(indoor\)/ })).toBeVisible();
    await expect(training).toContainText(/\d+ SESI·\d+ (\w+ )?SAMPAI \d+ \w+/);
    await training.getByRole("button", { name: "Lihat tabel" }).click();
    const table = training.getByRole("table", { name: "Latihan per hari minggu ini" });
    await expect(table.getByRole("columnheader")).toHaveText(["Hari", "Olahraga", "Menit", "Tempat"]);
    await expect(table).toContainText("Indoor");
    await expectNoA11yViolations(page);

    await training.getByRole("radio", { name: "Lari" }).check({ force: true });
    const week = page.getByRole("region", { name: "Minggu ini · lari" });
    await expect(week.getByRole("img", { name: /Minggu ini, lari \d+\.\d{2} km/ })).toBeVisible();
    await expect(week).toContainText(/\d+ LARI·\d+ (\w+ )?SAMPAI \d+ \w+/);
    expect(JSON.parse((await ls(page, "hybrid-athlete.share-card")) ?? "{}")).toMatchObject({ kind: "run" });
    await page.reload();
    await expect(page.getByRole("region", { name: "Minggu ini · lari" })).toBeVisible();
    await expectNoA11yViolations(page);

    await week.getByRole("link").click();
    await expect(page).toHaveURL(/\/insight#minggu-ini$/);
    const detail = page.locator("#minggu-ini");
    await expect(detail.getByRole("heading", { name: "7 hari terakhir" })).toBeVisible();
    await expect(detail).toContainText("Intensitas · acuan 80/20");
    await expect(detail).toContainText("Total lari");
    await expectNoA11yViolations(page);
  });

  test("bagikan: Feed + Teks gelap → PNG transparan 1080×1350", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", { name: "Minggu ini · latihan" }).getByRole("button", { name: "Bagikan" }).click();
    const sheet = page.getByRole("dialog", { name: "Bagikan kartu minggu ini" });
    await expect(sheet.getByRole("radio", { name: "Semua latihan" })).toBeChecked();
    await sheet.getByRole("radio", { name: "Lari" }).check({ force: true });
    await expect(sheet).toContainText(/hybrid-athlete-minggu-/);
    await sheet.getByRole("radio", { name: "Semua latihan" }).check({ force: true });
    await expect(sheet).toContainText(/hybrid-athlete-latihan-/);
    await expect(sheet.getByRole("img", { name: /Pratinjau kartu 1080×1920/ })).toBeVisible();
    await sheet.getByRole("radio", { name: "Feed 4:5" }).check({ force: true });
    await sheet.getByRole("radio", { name: "Teks gelap" }).check({ force: true });
    // 1.2.0: bahasa kartu mengikuti bahasa app (ID di sini) dan baru disimpan bila diganti sendiri.
    await expect(sheet.getByRole("radio", { name: "ID" })).toBeChecked();
    await expect(sheet.getByRole("img", { name: /Pratinjau kartu 1080×1350/ })).toBeVisible();
    await expectNoA11yViolations(page);

    const [download] = await Promise.all([page.waitForEvent("download"), sheet.getByRole("button", { name: "Unduh PNG" }).click()]);
    expect(download.suggestedFilename()).toMatch(/^hybrid-athlete-latihan-\d{4}-\d{2}-\d{2}\.png$/);
    const png = readFileSync((await download.path())!);
    // IHDR: lebar, tinggi, color type 6 = RGBA.
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20), png[25]]).toEqual([1080, 1350, 6]);
    // Sudut kosong benar-benar transparan, bar oranye tidak.
    const alpha = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      return { corner: ctx.getImageData(10, 10, 1, 1).data[3], center: ctx.getImageData(540, 675, 1, 1).data[3] };
    }, png.toString("base64"));
    expect(alpha.corner).toBe(0);
    expect(JSON.parse((await ls(page, "hybrid-athlete.share-card")) ?? "{}")).toEqual(expect.not.objectContaining({ lang: expect.anything() }));
    expect(JSON.parse((await ls(page, "hybrid-athlete.share-card")) ?? "{}")).toMatchObject({ kind: "training", format: "feed", ink: "dark" });
  });
});
