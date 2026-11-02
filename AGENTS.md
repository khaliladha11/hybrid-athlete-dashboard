# AGENTS.md

Guidance for AI coding tools (Claude Code, Codex, Cursor, Copilot, etc.) working in this repository. Product docs and UI copy are in Indonesian; this file is in English.

## Project

Hybrid Athlete Dashboard: a personal coach PWA for runners (10K–21K) who also do home strength training. It reads training and wellness data from intervals.icu, generates run and strength workouts, runs a target-race program, and can send run workouts to the intervals.icu calendar (forwarded to the athlete's watch). One deploy per person on their own Vercel account; no accounts, no shared backend.

Stack: Next.js 16 (App Router, `proxy.ts` = middleware), React 19, Tailwind v4 semantic tokens, Vitest, Playwright, optional Upstash Redis for sync. Charts are hand-written SVG.

## Commands

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on http://localhost:3000 (Demo Mode without env) |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build |
| `npm run e2e` | Playwright end-to-end (run after `npm run build`; Demo Mode, no secrets) |
| `npm run check:bundle` | Fails if server secrets leak into the client bundle (build with sentinel values first) |
| `npm run lighthouse -- http://localhost:3400` | Lighthouse mobile budget against a running production server |
| `npm run secret` | Prints a random `SESSION_SECRET` to the terminal (never stored) |

Before proposing a change as done: `npm run typecheck`, `npm test`, and `npm run build` must pass. Run `npm run e2e` for UI changes.

## Where things are

- Product rules, roadmap, status: [docs/PRD.md](docs/PRD.md) (§3 rules always win).
- Architecture, modules, testing: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- Training logic and sources: [docs/TRAINING-LOGIC.md](docs/TRAINING-LOGIC.md).
- Design system "Tag": [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).
- Sync, offline, recovery: [docs/SYNC.md](docs/SYNC.md). Release plan: [docs/RELEASE-1.0.md](docs/RELEASE-1.0.md).
- Environment variables: single source of truth in [lib/env-schema.ts](lib/env-schema.ts) (README table and Deploy button are tested against it).
- Pure logic lives in `lib/` (no I/O, dates passed in, WIB via `lib/date.ts`); UI in `components/`; routes in `app/`.

## Non-negotiable rules

1. **PRD §3** training rules: strength RPE ≤ 7 on every set, loads within equipment and safety limits, only selected movements, long run +≤10% and ≤2 km/week, advice never blocks the athlete.
2. **Suggestion logic does not change** without a cited source and the owner's approval.
3. **DESIGN-SYSTEM §7–§8**: no em dash (—) or en dash (–) in UI text except inside numeric ranges (`6:15–6:30/km`); no exclamation marks; buttons name the outcome; semantic tokens only (no raw Tailwind colors); orange `#FC4C02` is the only accent; touch targets ≥ 44px, inputs ≥ 16px, AA contrast in both themes, reduced motion respected. No new UI, animation, or chart libraries.
4. **Secrets are server-only.** `INTERVALS_API_KEY`, `APP_PASSCODE`, `SESSION_SECRET`, Redis tokens are read only in server code (`import "server-only"`), never sent to the browser, never logged, never committed. Routes return status, not upstream payloads.
5. **User-facing strings in `lib/` ship with their tests** in the same commit, separate from logic commits. `__tests__/copy-lib-strings.test.ts` scans every `lib/` string.
6. **Privacy (public repo, health data):** never commit real intervals.icu/Strava activity IDs, session dates/times, HR/HRV/sleep values, or numbers taken from a live deploy. Tests and docs use fictitious data or Demo Mode. Screenshots only from Demo Mode. Never put the owner's deploy URL in docs.
7. `formatPace` in `lib/` is frozen; display pace through `formatPaceTag` (`components/ui/format.ts`).
8. **Stored data shapes are versioned.** Any change to the shape of device data, sync parts, or backup files adds a migration to `lib/migrations/schema.ts` (bump `DATA_SCHEMA_VERSION`, idempotent, never deletes unrecognized values) plus a fixture in `__tests__/fixtures/backups/`. Never edit an existing migration.
9. **Releases:** semver as in PRD §9; bump `package.json` and `RELEASE_DATE` in `lib/app-info.ts` together; actions the deployer must take go under `### Langkah manual` in CHANGELOG (the upstream update workflow lifts them into the PR). The update workflow never merges.
10. Third-party assets need a permissive license and an entry in [NOTICE.md](NOTICE.md). The project is MIT ([LICENSE](LICENSE)). Contribution rules: [CONTRIBUTING.md](CONTRIBUTING.md).

## Helping a user install

Point them to [INSTALL-WITH-AI.md](INSTALL-WITH-AI.md), the README section "Mulai cepat", and [docs/GUIDE.md](docs/GUIDE.md) "Memasang". The same secret rule applies to you: **never ask the user to paste secrets into the chat and never type secrets on their behalf.** They enter values directly in Vercel or intervals.icu; to verify, ask what the screen shows, not the value. If a secret was pasted, tell them to rotate it and redeploy. For `SESSION_SECRET`, give them a command to run themselves (`npm run secret` or `openssl rand -base64 32`).
