import { expect, test } from "@playwright/test";
import { E2E_PASSCODE } from "../playwright.config";
import { seed } from "./helpers";

// Server :3301 memakai sandi aplikasi FIKTIF khusus test (playwright.config.ts).
test.describe("sandi aplikasi", () => {
  test("halaman terkunci → /unlock → sandi salah → sandi benar → kembali ke tujuan", async ({ page }) => {
    await seed(page);
    await page.goto("/run");
    await expect(page).toHaveURL(/\/unlock\?next=%2Frun/);
    const input = page.getByLabel(/Sandi/);
    await input.fill("bukan-sandinya");
    await page.getByRole("button", { name: /Buka/ }).click();
    await expect(page.locator("#unlock-error")).toContainText("Sandi salah");
    // Isian dikosongkan setelah gagal; isi sandi benar sesudahnya.
    await expect(input).toHaveValue("");
    await input.fill(E2E_PASSCODE);
    await expect(page.getByRole("button", { name: /Buka/ })).toBeEnabled();
    await page.getByRole("button", { name: /Buka/ }).click();
    await expect(page).toHaveURL(/\/run$/);
    await expect(page.locator("main")).toContainText("Generator Lari");
  });

  test("API tanpa sesi: 401; aset PWA & service worker tetap terbuka", async ({ request }) => {
    expect((await request.get("/api/connection")).status()).toBe(401);
    expect((await request.get("/api/sync")).status()).toBe(401);
    for (const p of ["/manifest.json", "/sw.js", "/sw-rules.js", "/offline"]) expect((await request.get(p)).status(), p).toBe(200);
    const page = await request.get("/", { maxRedirects: 0 });
    expect(page.status()).toBe(307);
    expect(page.headers()["location"]).toContain("/unlock");
  });
});
