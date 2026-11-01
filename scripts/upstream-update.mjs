#!/usr/bin/env node
/**
 * Pembaruan dari upstream untuk salinan & fork (1.0, `.github/workflows/upstream-update.yml`; panduan di README
 * "Menerima pembaruan"). Tidak pernah merge: hasilnya selalu pull request yang diputuskan pemilik.
 *
 * Alur:
 * 1. Tag target = input manual atau rilis stabil terbaru upstream (`releases/latest`). Tanpa rilis → selesai.
 * 2. Versi dasar = `version` di package.json repo ini (tag `v<versi>` di upstream). Target ≤ dasar → sudah terbaru.
 * 3. Patch = `git diff <dasar> <target>` dari upstream, diterapkan dengan `git apply --3way`. Cara ini jalan untuk
 *    fork (riwayat sama) maupun salinan dari tombol Deploy Vercel (riwayat berbeda), karena tidak butuh merge-base.
 *    Tag dasar tidak ada di upstream → isi disamakan dengan target (PR memberi tahu, perubahan sendiri terlihat di diff).
 * 4. Tanpa token berizin Workflows (`UPSTREAM_UPDATE_TOKEN`), perubahan `.github/workflows/` tidak ikut dan
 *    dicantumkan sebagai langkah manual (GITHUB_TOKEN tidak bisa mengubah workflow).
 * 5. Konflik → file dengan penanda konflik tetap di-commit dan PR dibuka sebagai draft dengan daftarnya.
 *    Patch gagal total → issue dibuka dan job gagal (tidak pernah diam-diam).
 * 6. CI dipicu lewat `workflow_dispatch`, karena event dari GITHUB_TOKEN tidak memicu workflow lain.
 *
 * Env: UPSTREAM_REPO, GITHUB_REPOSITORY, DEFAULT_BRANCH, INPUT_TAG (opsional), CAN_PUSH_WORKFLOWS ("true"/"false"),
 * GH_TOKEN (dipakai `gh`), DRY_RUN=1 (tanpa push, PR, issue; untuk uji lokal).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { compareSemver, manualSteps, sectionsBetween, TAG_RE } from "./release-notes.mjs";

export const DEFAULT_UPSTREAM = "khaliladha11/hybrid-athlete-dashboard";
export const BRANCH_PREFIX = "upstream-update/";
const WORKFLOWS = ".github/workflows";

/** Keputusan awal (murni). */
export function decide({ repo, upstream, target, baseVersion }) {
  if (repo.toLowerCase() === upstream.toLowerCase()) return { action: "skip", reason: "Ini repo upstream sendiri; tidak ada yang diperbarui." };
  if (!target) return { action: "skip", reason: `Upstream ${upstream} belum punya rilis stabil.` };
  if (!TAG_RE.test(target)) return { action: "error", reason: `Tag "${target}" bukan versi (contoh: v1.0.0).` };
  const cmp = compareSemver(target, baseVersion);
  if (cmp === null) return { action: "error", reason: `Versi package.json "${baseVersion}" tidak valid.` };
  if (cmp <= 0) return { action: "skip", reason: `Sudah terbaru: v${baseVersion} (rilis upstream ${target}).` };
  return { action: "update", branch: `${BRANCH_PREFIX}${target}`, baseTag: `v${baseVersion}` };
}

/** Badan PR (murni). */
export function prBody({ upstream, baseTag, target, sections, conflicts, skippedWorkflows, baseMissing }) {
  const manual = sections.flatMap((s) => manualSteps(s.body).map((m) => `${m} (${s.version})`));
  if (skippedWorkflows.length)
    manual.push(
      `File workflow berubah tetapi tidak ikut, karena token bawaan tidak boleh mengubah \`${WORKFLOWS}/\`: ${skippedWorkflows.map((f) => `\`${f}\``).join(", ")}. Salin manual dari upstream, atau isi secret \`UPSTREAM_UPDATE_TOKEN\` (lihat README "Menerima pembaruan").`,
    );
  const lines = [
    `Pembaruan dari [${upstream}](https://github.com/${upstream}) **${baseTag} → ${target}**.`,
    "",
    "PR ini dibuat otomatis dan **tidak pernah di-merge otomatis**. Merge sendiri setelah CI hijau dan langkah manual di bawah selesai.",
    "",
  ];
  if (conflicts.length) {
    lines.push(
      "## ⚠️ Ada konflik",
      "",
      "File berikut berisi penanda konflik (`<<<<<<<`, `=======`, `>>>>>>>`) karena kamu mengubah bagian yang juga diubah upstream. CI akan gagal sampai diselesaikan:",
      "",
      ...conflicts.map((f) => `- \`${f}\``),
      "",
      "Cara menyelesaikan: buka branch ini (di GitHub: tombol ✏️ pada file, atau `git fetch && git checkout <branch>` di komputer), pilih isi yang benar, hapus penandanya, commit. Lalu tandai PR siap ditinjau.",
      "",
    );
  }
  if (baseMissing)
    lines.push(
      `> Tag ${baseTag} tidak ada di upstream, jadi isi repo disamakan dengan ${target}. Perubahan yang kamu buat sendiri ikut terlihat di diff sebagai baris yang dihapus: periksa sebelum merge.`,
      "",
    );
  lines.push("## Langkah manual", "", ...(manual.length ? manual.map((m) => `- [ ] ${m}`) : ["Tidak ada."]), "");
  lines.push("## Catatan rilis", "");
  if (sections.length) for (const s of sections) lines.push(`### ${s.heading}`, "", s.body, "");
  else lines.push("Lihat CHANGELOG.md di upstream.", "");
  lines.push("---", "Dibuat oleh `.github/workflows/upstream-update.yml`.");
  return lines.join("\n");
}

// ---------- I/O ----------

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], ...opts }).trim();
const trySh = (cmd, args, opts) => {
  try {
    return { ok: true, out: sh(cmd, args, opts) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() };
  }
};
const log = (m) => console.log(m);
const notice = (m) => console.log(`::notice::${m}`);

export function main(env = process.env) {
  const upstream = env.UPSTREAM_REPO || DEFAULT_UPSTREAM;
  const repo = env.GITHUB_REPOSITORY ?? "";
  const dry = env.DRY_RUN === "1";
  const canPushWorkflows = env.CAN_PUSH_WORKFLOWS === "true";
  const defaultBranch = env.DEFAULT_BRANCH || "main";
  const upstreamUrl = env.UPSTREAM_URL || `https://github.com/${upstream}.git`;

  let target = (env.INPUT_TAG ?? "").trim();
  if (!target && repo.toLowerCase() !== upstream.toLowerCase()) {
    const r = trySh("gh", ["api", `repos/${upstream}/releases/latest`, "--jq", ".tag_name"]);
    target = r.ok ? r.out : "";
  }
  const baseVersion = JSON.parse(readFileSync("package.json", "utf-8")).version;
  const d = decide({ repo, upstream, target, baseVersion });
  if (d.action === "skip") return notice(d.reason);
  if (d.action === "error") throw new Error(d.reason);

  if (!dry) {
    const open = trySh("gh", ["pr", "list", "--head", d.branch, "--state", "all", "--json", "number,state", "--jq", ".[0].state // empty"]);
    if (open.ok && open.out) return notice(`PR ${d.branch} sudah ada (${open.out}). Hapus branch-nya untuk membuat ulang.`);
  }

  sh("git", ["fetch", "--no-tags", "--quiet", upstreamUrl, `+refs/tags/${target}:refs/tags/upstream/${target}`]);
  const hasBase = trySh("git", ["fetch", "--no-tags", "--quiet", upstreamUrl, `+refs/tags/${d.baseTag}:refs/tags/upstream/${d.baseTag}`]).ok;
  const from = hasBase ? `upstream/${d.baseTag}` : "HEAD";
  const to = `upstream/${target}`;
  const changed = sh("git", ["diff", "--name-only", from, to]).split("\n").filter(Boolean);
  const skippedWorkflows = canPushWorkflows ? [] : changed.filter((f) => f.startsWith(`${WORKFLOWS}/`));
  const pathspec = canPushWorkflows ? [] : ["--", ".", `:(exclude)${WORKFLOWS}`];
  const patchFile = join(tmpdir(), `upstream-${process.pid}.patch`);
  writeFileSync(patchFile, sh("git", ["diff", "--binary", "--full-index", from, to, ...pathspec], { maxBuffer: 64 * 1024 * 1024 }) + "\n");

  sh("git", ["checkout", "-B", d.branch]);
  const applied = trySh("git", ["apply", "--3way", "--index", "--whitespace=nowarn", patchFile]);
  const conflicts = sh("git", ["diff", "--name-only", "--diff-filter=U"]).split("\n").filter(Boolean);
  if (!applied.ok && !conflicts.length) {
    const body = `Pembaruan ${d.baseTag} → ${target} dari ${upstream} tidak bisa diterapkan otomatis.\n\n\`\`\`\n${applied.out.slice(0, 6000)}\n\`\`\`\n\nPerbarui manual: lihat README "Menerima pembaruan".`;
    if (!dry) trySh("gh", ["issue", "create", "--title", `Pembaruan ${target} gagal diterapkan`, "--body", body]);
    throw new Error(`git apply gagal tanpa konflik yang bisa ditandai:\n${applied.out}`);
  }
  sh("git", ["add", "-A"]);
  if (!sh("git", ["status", "--porcelain"])) return notice(`Tidak ada perubahan berkas untuk ${target}.`);
  const who = ["-c", "user.name=github-actions[bot]", "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com"];
  sh("git", [...who, "commit", "--quiet", "--no-verify", "-m", `chore: pembaruan dari upstream ${target}${conflicts.length ? " (ada konflik)" : ""}`]);

  const changelog = trySh("git", ["show", `${to}:CHANGELOG.md`]);
  const sections = changelog.ok ? sectionsBetween(changelog.out, hasBase ? d.baseTag : null, target) : [];
  const body = prBody({ upstream, baseTag: d.baseTag, target, sections, conflicts, skippedWorkflows, baseMissing: !hasBase });
  const bodyFile = join(tmpdir(), `upstream-${process.pid}.md`);
  writeFileSync(bodyFile, body);
  log(body);
  if (dry) return { branch: d.branch, conflicts, skippedWorkflows, body };

  sh("git", ["push", "--force", "origin", d.branch]);
  const title = `Pembaruan dari upstream: ${target}`;
  sh("gh", ["pr", "create", "--base", defaultBranch, "--head", d.branch, "--title", title, "--body-file", bodyFile, ...(conflicts.length ? ["--draft"] : [])]);
  const ci = trySh("gh", ["workflow", "run", "ci.yml", "--ref", d.branch]);
  if (!ci.ok) notice("CI tidak bisa dipicu otomatis; jalankan dari tab Actions atau push commit ke branch ini.");
  return { branch: d.branch, conflicts, skippedWorkflows, body };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (e) {
    console.error(`::error::${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}
