import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";
import { DOCS } from "@/lib/docs-links";
import { REQUIRED_ENV, UPSTREAM_REPO, deployButtonUrl } from "@/lib/env-schema";

/** Dokumen yang tautannya diperiksa (0.17). */
const DOC_FILES = ["README.md", "INSTALL-WITH-AI.md", "AGENTS.md", "CLAUDE.md", "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md", "NOTICE.md", ".github/PULL_REQUEST_TEMPLATE.md", ...readdirSync("docs").filter((f) => f.endsWith(".md")).map((f) => `docs/${f}`)];

const stripCode = (md: string) => md.replace(/^(`{3,})[^\n]*\n[\s\S]*?\n\1\s*$/gm, "").replace(/`[^`\n]*`/g, "");

/** Slug heading ala GitHub: huruf kecil, tanda baca dibuang, spasi jadi "-", duplikat diberi akhiran -1, -2. */
function anchors(md: string): Set<string> {
  const out = new Set<string>();
  const seen = new Map<string, number>();
  for (const line of md.replace(/^(`{3,})[^\n]*\n[\s\S]*?\n\1\s*$/gm, "").split(/\r?\n/)) {
    const m = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const base = m[1]
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .replace(/ /g, "-");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.add(n ? `${base}-${n}` : base);
  }
  return out;
}

function links(md: string): string[] {
  return [...stripCode(md).matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1]);
}

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

  it("tautan relatif dan anchor di dokumen menunjuk ke tempat yang ada", () => {
    const broken: string[] = [];
    for (const file of DOC_FILES) {
      const md = readFileSync(file, "utf-8");
      for (const href of links(md)) {
        if (/^(https?:|mailto:)/.test(href)) continue;
        const [path, hash] = href.split("#");
        const target = path ? normalize(join(dirname(file), decodeURIComponent(path))) : file;
        if (!existsSync(target)) {
          broken.push(`${file}: ${href} (file tidak ada)`);
          continue;
        }
        if (hash && target.endsWith(".md") && !anchors(readFileSync(target, "utf-8")).has(hash.toLowerCase())) broken.push(`${file}: ${href} (anchor tidak ada)`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("tautan onboarding ke README memakai anchor yang ada", () => {
    const a = anchors(readme);
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
