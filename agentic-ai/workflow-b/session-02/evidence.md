# Workflow B, session 02: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s02-*`.

## Files converted (4)
| File | Export shape | Direct tests |
|---|---|---|
| server/utils/constants.ts | `module.exports.x` ×6 → `export = { … }` (same keys, same order) | BookFinder.test, Logger.test |
| server/utils/stringifySequelizeQuery.ts | `export = fn` | stringifySequeslizeQuery.test |
| server/utils/requestUtils.ts | `export = { … }` | requestUtils.test |
| server/utils/parsers/parseNfoMetadata.ts | `export = { parseNfoMetadata }` | parseNfoMetadata.test |

Infrastructure files: tsconfig.json, tsconfig.build.json (new), package.json, .gitignore, build/cleanGeneratedJs.js (new), Dockerfile, .github/workflows/integration-test.yml, build/linuxpackager, agentic-ai/workflow-b/tools/{export-shape.js, emit-diff.js, strict-check.sh} (new).

## Gates
| Gate | Command | Result |
|---|---|---|
| Build | `npm run build:server` | exit 0 |
| Type check | `npm run typecheck` | exit 0, **0 errors** |
| Tests | `npm run clean:ts && npm test` (generated JS deleted first, so this also proves `pretest` builds) | **354 passing, 0 failing, 0 pending**; `s02-passing-titles.txt` is identical to the baseline title list (`diff` empty) |
| Smoke | `npm run clean:ts && smoke.sh` (proves `prestart` builds) | **13/13**, 0 server-log error lines |
| Export shape | `node agentic-ai/workflow-b/tools/export-shape.js HEAD <4 files>` | 4/4 SAME |
| Emit diff | `node agentic-ai/workflow-b/tools/emit-diff.js HEAD <4 files>` | 2/4 token-identical; constants and parseNfoMetadata differ only in export layout (`module.exports.X = {` → `const X = {` + final `module.exports = {…}`; `module.exports = {…}` moved to the end of the file) |
| Strict reference check (pinned TS 7.0.2, measure.sh options) | `bash agentic-ai/workflow-b/tools/strict-check.sh` | 4 TS files, **0 strict errors** |
| Directives / any | same script | `@ts-*` 0, explicit `any` 0, `as unknown as` 0, non-null `!.` 0. One scoped `as Record<symbol, unknown>` in stringifySequelizeQuery |
| Lint | n/a | no linter in the project |

## Problems and how they were resolved
1. **Checking the check tool.** To make sure `export-shape.js` actually catches differences, I removed `getRequestOrigin` from the generated `requestUtils.js` by hand. The tool reported `0/1 identical` (exit 1). After rebuilding: `1/1`.
2. **A `git diff -w` of emitted vs original JS is unreadable** (semicolons, 4-space indent, and `if (x) return` gets split onto two lines). Fix: wrote `emit-diff.js`, which compares token streams without comments or semicolons.
3. **My first Linux packager edit hit the wrong `npm ci`** (the client block comes first in the file and has the same text). I saw it in the diff, reverted the file and applied the edit to the server block.
4. **Docker build not verified.** `docker info` → `failed to connect to the docker API ... dockerDesktopLinuxEngine` (Docker Desktop is installed but not running). I did not start it. **The Dockerfile change is unverified.** The integration-test (pkg) job and the Linux packager are unverified too: they only run in CI or on Linux. What is known: package-lock.json contains `@typescript/typescript-linux-x64` and `-linux-arm64` optional binaries, so `npm ci` on Linux installs a native `tsc`.

## Counts
TS files in scope: **4** / 169 convertible (2.4%). JS remaining in scope: 180 (165 convertible + 15 migrations).

## Timing
Session wall clock 11:24 to about 11:35 NZDT (from `date` in the shell; the end is approximate).
