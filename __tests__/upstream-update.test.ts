import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
// @ts-expect-error skrip Node tanpa deklarasi tipe
import { changelogSection, changelogSections, compareSemver, manualSteps, sectionsBetween } from "../scripts/release-notes.mjs";
// @ts-expect-error skrip Node tanpa deklarasi tipe
import { decide, DEFAULT_UPSTREAM, prBody } from "../scripts/upstream-update.mjs";

/** Isi file tanpa CRLF (core.autocrlf di Windows). */
const read = (f: string) => readFileSync(f, "utf-8").replace(/\r\n/g, "\n");
const wf = (f: string) => read(`.github/workflows/${f}`);

describe("semver & catatan rilis", () => {
  it("urutan semver termasuk prarilis", () => {
    const order = ["0.17.0", "1.0.0-rc.1", "1.0.0-rc.2", "1.0.0-rc.10", "1.0.0", "1.0.1", "1.1.0", "2.0.0"];
    for (let i = 0; i + 1 < order.length; i++) {
      expect(compareSemver(order[i], order[i + 1])).toBe(-1);
      expect(compareSemver(`v${order[i + 1]}`, order[i])).toBe(1);
    }
    expect(compareSemver("v1.0.0", "1.0.0")).toBe(0);
    expect(compareSemver("main", "1.0.0")).toBeNull();
  });

  const md = [
    "# Changelog",
    "## [Unreleased]",
    "## [1.1.0] · 2026-12-01 · Dua",
    "### Ditambahkan",
    "- B",
    "### Langkah manual",
    "- Isi `ENV_BARU` di Vercel",
    "- Redeploy",
    "## [1.0.0] · 2026-11-20 · Satu",
    "- A",
    "## [0.17.0] · 2026-11-01 · Lama",
    "- C",
  ].join("\n");

  it("bagian per versi, langkah manual, dan rentang dasar..target", () => {
    expect(changelogSections(md).map((s: { version: string }) => s.version)).toEqual(["1.1.0", "1.0.0", "0.17.0"]);
    expect(changelogSection(md, "v1.0.0")?.body).toBe("- A");
    expect(manualSteps(changelogSection(md, "1.1.0")!.body)).toEqual(["Isi `ENV_BARU` di Vercel", "Redeploy"]);
    expect(manualSteps("- tanpa")).toEqual([]);
    expect(sectionsBetween(md, "v0.17.0", "v1.1.0").map((s: { version: string }) => s.version)).toEqual(["1.1.0", "1.0.0"]);
    expect(sectionsBetween(md, null, "v1.0.0").map((s: { version: string }) => s.version)).toEqual(["1.0.0", "0.17.0"]);
  });

  it("CHANGELOG repo ini terbaca dan versi package.json punya bagiannya", () => {
    const own = readFileSync("CHANGELOG.md", "utf-8");
    const version = JSON.parse(readFileSync("package.json", "utf-8")).version;
    expect(changelogSection(own, version), `CHANGELOG tanpa [${version}]`).not.toBeNull();
  });
});

describe("keputusan & badan PR", () => {
  const base = { repo: "orang/salinan", upstream: DEFAULT_UPSTREAM, baseVersion: "1.0.0" };
  it("lewati upstream sendiri, tanpa rilis, dan yang sudah terbaru; tag rusak = error", () => {
    expect(decide({ ...base, repo: DEFAULT_UPSTREAM.toUpperCase(), target: "v2.0.0" }).action).toBe("skip");
    expect(decide({ ...base, target: "" }).action).toBe("skip");
    expect(decide({ ...base, target: "v1.0.0" }).action).toBe("skip");
    expect(decide({ ...base, target: "v1.0.0-rc.1" }).action).toBe("skip");
    expect(decide({ ...base, target: "terbaru" }).action).toBe("error");
    expect(decide({ ...base, target: "v1.1.0" })).toEqual({ action: "update", branch: "upstream-update/v1.1.0", baseTag: "v1.0.0" });
  });

  it("langkah manual di atas, konflik dan workflow yang tidak ikut dijelaskan, tanpa ajakan merge otomatis", () => {
    const body = prBody({
      upstream: DEFAULT_UPSTREAM,
      baseTag: "v1.0.0",
      target: "v1.1.0",
      sections: [{ version: "1.1.0", heading: "[1.1.0] · 2026-12-01 · Dua", body: "### Langkah manual\n- Redeploy" }],
      conflicts: ["lib/a.ts"],
      skippedWorkflows: [".github/workflows/ci.yml"],
      baseMissing: false,
    });
    expect(body.indexOf("## Langkah manual")).toBeLessThan(body.indexOf("## Catatan rilis"));
    expect(body).toContain("- [ ] Redeploy (1.1.0)");
    expect(body).toContain("`lib/a.ts`");
    expect(body).toContain("UPSTREAM_UPDATE_TOKEN");
    expect(body).toContain("tidak pernah di-merge otomatis");
  });
});

describe("workflow", () => {
  it("upstream-update: terjadwal + manual, lewati upstream, izin yang dibutuhkan saja, tidak pernah merge", () => {
    const y = wf("upstream-update.yml");
    expect(y).toMatch(/schedule:\n\s+# [^\n]*\n\s+- cron: "0 1 \* \* 1"/);
    expect(y).toContain("workflow_dispatch:");
    expect(y).toContain("if: github.repository != (vars.UPSTREAM_REPO || 'khaliladha11/hybrid-athlete-dashboard')");
    expect(y.match(/^permissions:\n((?: {2}\S[^\n]*\n)+)/m)![1].trim().split("\n").map((l) => l.trim()).sort()).toEqual([
      "actions: write",
      "contents: write",
      "issues: write",
      "pull-requests: write",
    ]);
    const script = read("scripts/upstream-update.mjs");
    for (const src of [y, script]) {
      expect(src).not.toMatch(/pr["', ]+merge|--auto\b|enable-auto-merge|auto-merge@/);
    }
  });

  it("ci.yml bisa dipicu manual; release.yml hanya di upstream dan prarilis bertanda", () => {
    expect(wf("ci.yml")).toContain("workflow_dispatch:");
    const r = wf("release.yml");
    expect(r).toContain("if: github.repository == 'khaliladha11/hybrid-athlete-dashboard'");
    expect(r).toContain("--prerelease");
    expect(r).toContain('tags: ["v*"]');
  });
});

/** Uji nyata dengan repo git sementara: upstream bertag, fork (riwayat sama), salinan Deploy (riwayat berbeda). */
describe("upstream-update.mjs dengan repo git sementara (DRY_RUN)", () => {
  const root = mkdtempSync(join(tmpdir(), "ha-upstream-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const git = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "user.name=Uji", "-c", "user.email=uji@example.test", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", ...args], { cwd, encoding: "utf-8" }).trim();
  const write = (dir: string, files: Record<string, string>) => {
    for (const [f, c] of Object.entries(files)) {
      mkdirSync(join(dir, f, ".."), { recursive: true });
      writeFileSync(join(dir, f), c);
    }
  };
  const pkg = (v: string) => JSON.stringify({ name: "x", version: v }, null, 2) + "\n";
  const changelog = (extra = "") =>
    `# Changelog\n\n## [Unreleased]\n${extra}\n## [1.0.0] · 2026-11-20 · Satu\n\n- Awal\n`;

  const upstream = join(root, "upstream");
  mkdirSync(upstream);
  git(upstream, "init", "-q", "-b", "main");
  write(upstream, { "package.json": pkg("1.0.0"), "lib/a.ts": "export const a = 1;\nexport const b = 2;\n", "README.md": "Hai\n", ".github/workflows/ci.yml": "name: CI\n", "CHANGELOG.md": changelog() });
  git(upstream, "add", "-A");
  git(upstream, "commit", "-q", "-m", "1.0.0");
  git(upstream, "tag", "v1.0.0");
  write(upstream, {
    "package.json": pkg("1.1.0"),
    "lib/a.ts": "export const a = 10;\nexport const b = 2;\n",
    "lib/baru.ts": "export const c = 3;\n",
    ".github/workflows/ci.yml": "name: CI baru\n",
    "CHANGELOG.md": changelog("\n## [1.1.0] · 2026-12-01 · Dua\n\n- Lebih baik\n\n### Langkah manual\n- Isi `ENV_BARU` di Vercel\n"),
  });
  git(upstream, "add", "-A");
  git(upstream, "commit", "-q", "-m", "1.1.0");
  git(upstream, "tag", "v1.1.0");

  /** Salinan seperti dari tombol Deploy Vercel: isi v1.0.0, satu commit, riwayat berbeda. */
  const clone = (name: string, edit?: Record<string, string>) => {
    const dir = join(root, name);
    mkdirSync(dir);
    git(dir, "init", "-q", "-b", "main");
    write(dir, { "package.json": pkg("1.0.0"), "lib/a.ts": "export const a = 1;\nexport const b = 2;\n", "README.md": "Hai\n", ".github/workflows/ci.yml": "name: CI\n", "CHANGELOG.md": changelog(), ...edit });
    git(dir, "add", "-A");
    git(dir, "commit", "-q", "-m", "Initial commit");
    return dir;
  };
  const run = (cwd: string, extra: Record<string, string> = {}) =>
    spawnSync(process.execPath, [resolve("scripts/upstream-update.mjs")], {
      cwd,
      encoding: "utf-8",
      env: { ...process.env, DRY_RUN: "1", GITHUB_REPOSITORY: "orang/salinan", UPSTREAM_URL: upstream, INPUT_TAG: "v1.1.0", CAN_PUSH_WORKFLOWS: "false", GIT_AUTHOR_NAME: "Uji", GIT_AUTHOR_EMAIL: "uji@example.test", ...extra },
    });

  it("salinan tanpa perubahan sendiri: patch bersih, workflow tidak ikut dan dicatat, langkah manual dari CHANGELOG", () => {
    const dir = clone("bersih");
    const r = run(dir);
    expect(r.status, r.stderr).toBe(0);
    expect(git(dir, "rev-parse", "--abbrev-ref", "HEAD")).toBe("upstream-update/v1.1.0");
    expect(read(join(dir, "lib/a.ts"))).toContain("a = 10");
    expect(read(join(dir, "lib/baru.ts"))).toContain("c = 3");
    expect(JSON.parse(read(join(dir, "package.json"))).version).toBe("1.1.0");
    expect(read(join(dir, ".github/workflows/ci.yml"))).toBe("name: CI\n");
    expect(r.stdout).toContain("- [ ] Isi `ENV_BARU` di Vercel (1.1.0)");
    expect(r.stdout).toContain("`.github/workflows/ci.yml`");
    expect(r.stdout).not.toContain("Ada konflik");
    expect(git(dir, "status", "--porcelain")).toBe("");
  });

  it("perubahan sendiri di baris yang sama: commit dengan penanda konflik dan daftar file di PR", () => {
    const dir = clone("konflik", { "lib/a.ts": "export const a = 99;\nexport const b = 2;\n" });
    const r = run(dir);
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("Ada konflik");
    expect(r.stdout).toContain("`lib/a.ts`");
    expect(read(join(dir, "lib/a.ts"))).toMatch(/<<<<<<<[\s\S]*=======[\s\S]*>>>>>>>/);
    expect(read(join(dir, "lib/baru.ts"))).toContain("c = 3");
    expect(git(dir, "log", "-1", "--format=%s")).toContain("ada konflik");
  });

  it("dengan token Workflows: file workflow ikut diperbarui", () => {
    const dir = clone("token");
    const r = run(dir, { CAN_PUSH_WORKFLOWS: "true" });
    expect(r.status, r.stderr).toBe(0);
    expect(read(join(dir, ".github/workflows/ci.yml"))).toBe("name: CI baru\n");
  });

  it("sudah terbaru dan repo upstream sendiri: tidak ada branch baru", () => {
    const dir = clone("terbaru", { "package.json": pkg("1.1.0") });
    expect(run(dir).stdout).toContain("Sudah terbaru");
    expect(run(dir, { GITHUB_REPOSITORY: DEFAULT_UPSTREAM, UPSTREAM_REPO: DEFAULT_UPSTREAM }).stdout).toContain("repo upstream sendiri");
    expect(git(dir, "rev-parse", "--abbrev-ref", "HEAD")).toBe("main");
  });
});
