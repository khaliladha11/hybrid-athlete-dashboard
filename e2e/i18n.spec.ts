import { expect, test, type Page } from "@playwright/test";
import { ONBOARDED, expectNoA11yViolations, seed } from "./helpers";

/**
 * Bahasa ID/EN (1.2.0). Spec lain berjalan dalam bahasa Indonesia (locale browser id-ID, cookie kosong); di sini
 * bahasa diganti lewat tombol AppBar lalu setiap tab dicek dalam bahasa Inggris. Nama aktivitas demo adalah data
 * (dinamai pengguna di intervals.icu), jadi tidak ikut diperiksa.
 */

// Kata Indonesia yang tidak boleh tersisa di teks UI berbahasa Inggris.
const ID_WORDS = /\b(yang|untuk|belum|sudah|tidak|minggu ini|hari ini|latihan|simpan|lewati|jangan|kemarin)\b/i;

async function toEnglish(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Ganti bahasa ke English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Switch language to Indonesian" })).toBeVisible();
}

async function expectEnglishMain(page: Page) {
  const text = await page.locator("main").innerText();
  const hit = text.split("\n").find((l) => ID_WORDS.test(l));
  expect(hit, `teks Indonesia tersisa: ${hit}`).toBeUndefined();
}

test.describe("bahasa", () => {
  test.beforeEach(async ({ page }) => seed(page));

  test("ganti ke English di AppBar, bertahan setelah reload, kembali ke Indonesia @smoke", async ({ page }) => {
    await toEnglish(page);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("hybrid-athlete.lang"))).toBe("en");
    expect((await page.context().cookies()).find((c) => c.name === "ha-lang")?.value).toBe("en");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: "Settings" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Switch language to Indonesian" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.getByRole("link", { name: "Setting" }).first()).toBeVisible();
  });

  test("setiap tab berbahasa Inggris", async ({ page }) => {
    await toEnglish(page);
    for (const path of ["/", "/run", "/program", "/strength", "/insight", "/setting", "/bantuan"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("main")).not.toBeEmpty();
      await expectEnglishMain(page);
    }
  });

  test("generator lari & ST dan saran Gita dalam bahasa Inggris", async ({ page }) => {
    await toEnglish(page);
    await expect(page.locator("main")).toContainText(/Gita/);
    await page.goto("/run");
    await expect(page.locator("main")).toContainText(/Warm-up|WU/);
    await expect(page.locator("main")).not.toContainText("Pemanasan");
    await expectEnglishMain(page);
    await page.goto("/strength");
    await expect(page.getByRole("button", { name: "Start session", exact: true })).toBeVisible();
    await expectEnglishMain(page);
  });

  test("kondisi dan disclaimer dalam bahasa Inggris", async ({ page }) => {
    await toEnglish(page);
    await page.goto("/setting#kondisi");
    const conditions = page.locator("main");
    await expect(conditions).toContainText("History of Shin Splints (MTSS)");
    await expect(conditions).toContainText("Patellofemoral Pain");
    await expect(conditions).not.toContainText("Nyeri lutut depan");
    // Disclaimer versi baru: gate meminta setuju lagi, dalam bahasa Inggris.
    await page.evaluate((s) => localStorage.setItem("hybrid-athlete.onboarding.v1", JSON.stringify(s)), { ...ONBOARDED, termsVersion: 1 });
    await page.goto("/");
    await expect(page.getByText("Not medical advice.")).toBeVisible();
    await expect(page.getByText("This text is not a legal document.")).toBeVisible();
    await page.getByRole("checkbox", { name: "I understand and agree." }).check();
    await page.getByRole("button", { name: "Agree and open the app" }).click();
    await expect(page.locator("main")).toContainText(/Gita|Wellness/);
  });

  test("kartu story mengikuti bahasa app", async ({ page }) => {
    await toEnglish(page);
    const week = page.getByRole("region", { name: "This week · training" });
    await expect(week.getByRole("img", { name: /^(This week .*sessions?: |No training yet this week)/ })).toBeVisible();
    await week.getByRole("button", { name: "Share" }).click();
    const sheet = page.getByRole("dialog", { name: "Share this week's card" });
    await expect(sheet.getByRole("img", { name: /Card preview 1080×1920/ })).toBeVisible();
    await expect(sheet.getByRole("radio", { name: "EN" })).toBeChecked();
  });

  test("aksesibilitas di kedua bahasa", async ({ page }) => {
    for (const path of ["/", "/run", "/strength", "/setting"]) {
      await page.goto(path);
      await expectNoA11yViolations(page);
    }
    await toEnglish(page);
    for (const path of ["/", "/run", "/strength", "/setting"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expectNoA11yViolations(page);
    }
  });
});
