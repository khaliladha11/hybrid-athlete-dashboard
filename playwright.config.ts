import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (0.16, docs/RELEASE-1.0.md #2). Selalu Demo Mode: tanpa rahasia asli, juga di CI.
 * - :3300 server produksi Demo Mode (tanpa sandi).
 * - :3301 server produksi dengan sandi aplikasi FIKTIF khusus test (bukan sandi siapa pun), tanpa Redis.
 * Jalankan setelah `npm run build`. Lokal memakai Microsoft Edge yang terpasang (tanpa unduh browser).
 */
const CI = !!process.env.CI;
export const E2E_PASSCODE = "e2e-sandi-uji-0000";
const E2E_SESSION_SECRET = "e2e-session-secret-uji-tidak-rahasia-0123456789abcdef";
// Kosong = Demo Mode, sekalipun ada .env.local di mesin pengembang.
const DEMO_ENV = { INTERVALS_API_KEY: "", APP_PASSCODE: "", SESSION_SECRET: "", UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "", KV_REST_API_URL: "", KV_REST_API_TOKEN: "" };

const browser = CI ? {} : { channel: "msedge" as const };

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: CI ? 1 : 0,
  workers: CI ? 2 : 3,
  reporter: CI ? [["github"], ["list"]] : "list",
  use: { trace: "retain-on-failure", screenshot: "only-on-failure", locale: "id-ID", timezoneId: "Asia/Jakarta", ...browser },
  webServer: [
    { command: "npx next start -p 3300", url: "http://localhost:3300/offline", reuseExistingServer: !CI, env: DEMO_ENV, timeout: 120_000 },
    {
      command: "npx next start -p 3301",
      url: "http://localhost:3301/offline",
      reuseExistingServer: !CI,
      env: { ...DEMO_ENV, APP_PASSCODE: E2E_PASSCODE, SESSION_SECRET: E2E_SESSION_SECRET },
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "mobile-dark",
      testIgnore: /locked\.spec/,
      use: { ...devices["Pixel 7"], ...browser, baseURL: "http://localhost:3300", viewport: { width: 375, height: 812 }, colorScheme: "dark" },
    },
    {
      name: "desktop-light",
      testIgnore: /locked\.spec/,
      grep: /@smoke/,
      use: { ...devices["Desktop Chrome"], ...browser, baseURL: "http://localhost:3300", viewport: { width: 1280, height: 800 }, colorScheme: "light" },
    },
    { name: "locked", testMatch: /locked\.spec/, use: { ...devices["Pixel 7"], ...browser, baseURL: "http://localhost:3301", viewport: { width: 375, height: 812 } } },
  ],
});
