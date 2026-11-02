import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DOCS } from "@/lib/docs-links";
import { REQUIRED_ENV, UPSTREAM_REPO, deployButtonUrl } from "@/lib/env-schema";
// @ts-expect-error skrip Node tanpa deklarasi tipe
import { anchors, brokenLinks, docFiles, REPO_URL } from "../scripts/check-links.mjs";

describe("dokumen pemasangan (0.17)", () => {
  const readme = readFileSync("README.md", "utf-8");

  it("README memuat tombol Deploy dengan URL dari skema env", () => {
    expect(readme).toContain(`[![Deploy with Vercel](https://vercel.com/button)](${deployButtonUrl()})`);
    const urls = [...readme.matchAll(/https:\/\/vercel\.com\/new\/clone\?[^)\s]+/g)].map((m) => new URL(m[0]));
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u.searchParams.get("env")?.split(",")).toEqual(REQUIRED_ENV);
      expect(u.searchParams.has("envDefaults")).toBe(false);
    }
  });

  it("tabel variabel lingkungan di README mencantumkan semua env wajib", () => {
    const section = readme.slice(readme.indexOf("### Variabel lingkungan"), readme.indexOf("#### Membuat SESSION_SECRET"));
    for (const name of REQUIRED_ENV) expect(section).toMatch(new RegExp(`\\| \`${name}\` \\| Ya \\|`));
  });

  it("semua tautan lokal dan tautan ke repo ini di semua dokumen menunjuk ke tempat yang ada (scripts/check-links.mjs)", () => {
    const files: string[] = docFiles();
    for (const f of ["README.md", "docs/GUIDE.md", "docs/REFERENCES.md", "docs/LIMITATIONS.md", "docs/CREDITS.md", ".github/PULL_REQUEST_TEMPLATE.md"]) expect(files).toContain(f);
    expect(brokenLinks(files)).toEqual([]);
  });

  it("pemeriksa tautan menangkap file, anchor, dan tautan repo yang rusak", () => {
    const root = mkdtempSync(join(tmpdir(), "ha-links-"));
    try {
      mkdirSync(join(root, "docs"));
      writeFileSync(join(root, "README.md"), "# Judul\n\n## Mulai cepat\n");
      writeFileSync(
        join(root, "docs", "A.md"),
        `# A\n\n[ok](../README.md#mulai-cepat) [anchor](../README.md#tidak-ada) [file](HILANG.md) [repo](${REPO_URL}/blob/main/docs/B.md) [kode](\`x\`)\n\n\`\`\`\n[di-blok-kode](HILANG2.md)\n\`\`\`\n`,
      );
      expect(brokenLinks(["README.md", "docs/A.md"], root)).toEqual([
        "docs/A.md: ../README.md#tidak-ada (anchor tidak ada)",
        "docs/A.md: HILANG.md (file tidak ada)",
        `docs/A.md: ${REPO_URL}/blob/main/docs/B.md (file tidak ada)`,
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("tautan DOCS ke file di repo ada secara lokal", () => {
    for (const url of Object.values(DOCS)) {
      if (url.includes("/blob/main/")) expect(existsSync(url.split("/blob/main/")[1].split("#")[0]), url).toBe(true);
    }
  });

  it("tautan onboarding ke README memakai anchor yang ada", () => {
    const a: Set<string> = anchors(readme);
    for (const url of Object.values(DOCS)) {
      if (!url.startsWith(`${UPSTREAM_REPO}#`)) continue;
      expect(a.has(url.split("#")[1]), url).toBe(true);
    }
    for (const f of ["INSTALL-WITH-AI.md", "NOTICE.md"]) expect(existsSync(f), f).toBe(true);
  });

  it("LICENSE MIT atas nama pemilik; NOTICE menyebut setiap sumber pihak ketiga (1.0)", () => {
    const license = readFileSync("LICENSE", "utf-8");
    expect(license).toMatch(/^MIT License/);
    expect(license).toContain("Copyright (c) 2026 Muhammad Khalil Adha");
    expect(JSON.parse(readFileSync("package.json", "utf-8")).license).toBe("MIT");
    const notice = readFileSync("NOTICE.md", "utf-8");
    for (const src of ["free-exercise-db", "Unlicense", "MuscleMapJS", "melihcolpan/MuscleMap", "react-native-body-highlighter", "Archivo Project Authors", "Vercel, in collaboration with basement.studio", "SIL OPEN FONT LICENSE Version 1.1", "Cole Bemis", "Lucide Icons and Contributors", "openGym"])
      expect(notice, src).toContain(src);
    // Font yang dimuat di layout = font yang tercantum di NOTICE.
    const fonts = [...readFileSync("app/layout.tsx", "utf-8").matchAll(/import \{ ([^}]+) \} from "next\/font\/google"/g)].flatMap((m) => m[1].split(",").map((f) => f.trim()));
    expect(fonts.sort()).toEqual(["Archivo", "Geist_Mono"]);
  });

  it("berkas kontribusi ada; masukan logika latihan wajib sumber; PR memuat checklist PRD §3 (1.0)", () => {
    for (const f of ["CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md", ".github/ISSUE_TEMPLATE/bug.yml", ".github/ISSUE_TEMPLATE/ide-fitur.yml", ".github/ISSUE_TEMPLATE/config.yml"]) expect(existsSync(f), f).toBe(true);
    const logic = readFileSync(".github/ISSUE_TEMPLATE/logika-latihan.yml", "utf-8").replace(/\r\n/g, "\n");
    expect(logic).toMatch(/id: source\n\s+attributes:\n\s+label: Sumber[\s\S]*?required: true/);
    expect(readFileSync("CONTRIBUTING.md", "utf-8")).toContain("Logika latihan butuh sumber dan test");
    expect(readFileSync(".github/PULL_REQUEST_TEMPLATE.md", "utf-8")).toContain("Aturan PRD §3");
    expect(readFileSync("CODE_OF_CONDUCT.md", "utf-8")).toContain("Contributor Covenant");
    expect(readFileSync("CODE_OF_CONDUCT.md", "utf-8")).not.toContain("[INSERT CONTACT METHOD]");
    expect(readme).toContain("GitHub Discussions");
  });

  it("INSTALL-WITH-AI.md dan AGENTS.md memuat aturan rahasia", () => {
    const ai = readFileSync("INSTALL-WITH-AI.md", "utf-8");
    expect(ai).toContain("Jangan pernah meminta saya menempelkan rahasia ke chat ini");
    expect(ai).toContain("Jangan mengetik, membuat, atau mengisi rahasia atas nama saya");
    expect(ai).toMatch(/Health Sync/);
    expect(readFileSync("AGENTS.md", "utf-8")).toContain("never ask the user to paste secrets into the chat and never type secrets on their behalf");
  });
});
