import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, seed } from "./helpers";

test.describe("Bantuan (1.0.0-rc.2)", () => {
  test("dibuka dari Setting, berisi lima topik dan langkah per merek jam @smoke", async ({ page }) => {
    await seed(page, { "hybrid-athlete.schema": "1" });
    await page.goto("/setting#tentang");
    await page.locator("#tentang").getByRole("link", { name: "Bantuan & panduan" }).click();
    await expect(page).toHaveURL(/\/bantuan$/);
    await expect(page.getByRole("heading", { level: 1, name: "Bantuan" })).toBeVisible();
    for (const t of ["Membaca saran Gita", "Program mingguan", "Mode latihan", "Kirim ke jam", "Cadangan & sinkron"])
      await expect(page.getByRole("region", { name: t })).toBeVisible();
    await expect(page.locator("#jam")).toContainText("Huawei");
    await expect(page.getByRole("link", { name: "Keterbatasan yang diketahui" })).toHaveAttribute("href", /docs\/LIMITATIONS\.md$/);
    await expectNoA11yViolations(page);
  });
});
