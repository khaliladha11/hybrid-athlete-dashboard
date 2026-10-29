import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, seed } from "./helpers";

const TABS: [string, RegExp][] = [
  ["/", /Saran|Wellness/],
  ["/run", /Generator Lari/],
  ["/program", /Program Target/],
  ["/strength", /Generator Strength/],
  ["/setting", /Setting/],
  ["/insight", /Tren/],
];

test.describe("navigasi & aksesibilitas @smoke", () => {
  test.beforeEach(async ({ page }) => seed(page));

  for (const [path, heading] of TABS) {
    test(`halaman ${path} tampil tanpa pelanggaran a11y serius`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.locator("main")).toContainText(heading);
      await expectNoA11yViolations(page);
      expect(errors).toEqual([]);
    });
  }

  test("tab bawah berpindah halaman", async ({ page }) => {
    await page.goto("/");
    for (const label of ["Lari", "Program", "Strength", "Setting", "Profil"]) {
      const nav = page.getByRole("navigation", { name: "Navigasi utama" });
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    }
  });
});
