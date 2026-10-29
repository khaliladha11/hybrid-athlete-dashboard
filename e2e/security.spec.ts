import { expect, test } from "@playwright/test";
import { seed } from "./helpers";

test.describe("header keamanan & CSP @smoke", () => {
  test.beforeEach(async ({ page }) => seed(page));

  for (const path of ["/", "/run", "/strength", "/program", "/setting", "/insight", "/onboarding", "/offline"]) {
    test(`${path}: CSP dengan nonce, tanpa pelanggaran, header keamanan`, async ({ page }) => {
      const violations: string[] = [];
      page.on("console", (m) => {
        if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
      });
      const res = await page.goto(path);
      const h = res!.headers();
      const csp = h["content-security-policy"] ?? "";
      const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
      expect(nonce, "nonce di CSP").toBeTruthy();
      expect(csp).toContain("frame-ancestors 'none'");
      expect(h["x-content-type-options"]).toBe("nosniff");
      expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"]).toContain("camera=()");
      // Script inline di HTML (Next.js & tema) membawa nonce yang sama.
      const html = await res!.text();
      expect(html).toContain(`nonce="${nonce}"`);
      await page.waitForLoadState("networkidle");
      expect(violations).toEqual([]);
    });
  }
});
