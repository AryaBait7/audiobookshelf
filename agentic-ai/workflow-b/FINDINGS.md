# Workflow B (plan-first, human-reviewed, incremental): findings

Branch `migration-planned`, 13 numbered sessions: 01 = investigation + plan; 02–11 and 13 = migration batches; 12 = a stop/measure session. The run resumed after a second, detailed plan approval from Arya, relayed by the parent session.
Every number below comes from `../migration-evidence/workflow-b/measurements/final/` (the shared `measure.sh`) or from the per-session logs in `../migration-evidence/workflow-b/session-logs/`.

## 1. Outcome (measured, final)

| Metric | Baseline (513a0679) | Final (this branch) |
|---|---|---|
| TS files in scope | 0 | **45** (24.5% of in-scope files) |
| JS files in scope | 184 | 139 = **124 convertible not converted** + 15 Umzug migrations (stay JS by design) |
| Convertible files converted | – | **45 / 169 (27%)** |
| `npm test` | 354 passing / 0 failing | **354 passing / 0 failing / 0 pending**; every baseline test title still passes |
| Smoke (`smoke.sh`) | 13/13 | **13/13**, 0 server-log error lines |
| Branch tsconfig typecheck (pinned TS 7.0.2) | n/a | **0 errors** |
| Strict reference check of all `.ts` in scope | n/a | **0 errors** |
| checkJs on remaining JS, first-party | 3,471 | 3,868 (explained in §5: a dependency change, offset by the conversions) |
| explicit `any` / `as any` / `as unknown as` / `x!.` | – | **0 / 0 / 0 / 0** |
| `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error` | – | **0 / 0 / 0** |
| `as` type assertions | – | 128 (see §4) |
| interfaces / type aliases / `unknown` usages | – | 27 / 38 / 67 |
| Test files changed | – | **none** (`git diff 513a0679 -- test` is empty) |

**This is not a complete migration.** 45 of the 169 convertible files are TypeScript. The converted part covers the L0–L4 leaves the plan scheduled up to row 11 (utils, parsers, generators, objects), Logger, fileUtils, utils/index, LogManager and MigrationManager, and the **models pilot** (6 leaf models, which establishes the Sequelize pattern). Not converted: the 22-file Database cycle, all models, controllers, routers, most managers, the scanner, providers and the entry points.

## 2. What worked

1. **Plan before code.** The investigation found the 22-file require cycle and the main export patterns. It led to two compiler decisions made *before* any conversion: in-place CommonJS emit, and `useDefineForClassFields:false`. The second one later mattered concretely: `AudioMetaTags.toJSON()` iterates `for (key in this)`, and the other setting would have added `undefined` own properties.
2. **A gate that rebuilds from a clean tree** (`gate.sh`) every session: build, typecheck, tests (with the generated JS deleted first, so `pretest` must rebuild), a test-title diff against the baseline, an export-shape diff against the original JS, a token-level emit diff, a strict check, a directive/`any` count, and the smoke test. Every committed session passed it.
3. **Behaviour-preservation tooling found real issues the tests would not have found:**
   * **export-shape** caught function `name` changes. They are benign, but they are a measurable difference, and they are reported rather than hidden;
   * the **parseFullName differential test** (6,300 input combinations, original JS vs emitted JS) replaced a token diff that could not parse the file;
   * **checking the emitted JS** confirmed `this.x` → `(0, exports.x)` routing.
4. **No suppression shortcuts.** 0 `any`, 0 ignore directives, 0 `as unknown as`, 0 non-null assertions. Untyped vendored libraries got **exact-subset declaration files** instead of permissive ones (§3.4).
5. **Batch-size rule.** It grew after two clean sessions, the large-file rule split htmlEntities, and batches shrank when a hazard appeared (session 09 was fileUtils alone).

## 3. Failure modes and hazards observed

### 3.1 TypeScript silently changes JavaScript semantics (no compiler error in any case)
| Hazard | Where found | Effect if missed | How handled |
|---|---|---|---|
| `useDefineForClassFields` default (true for ES2022) emits `field;` declarations as own `undefined` properties | probe in session 01 | `for…in this` / `Object.keys(this)` / `this[key] !== undefined` checks change (AudioMetaTags, DeviceInfo, FileMetadata, MediaProbeData) | `useDefineForClassFields:false` |
| …but with `false`, a **field initializer moves after parameter defaults**: `defaultRequiredBinaries = [...]` + `constructor(x = this.defaultRequiredBinaries)` gives `undefined` | probe in session 12 (BinaryManager) | BinaryManager would have no required binaries; the server crashes at start | BinaryManager not converted (see §6); the pattern was grepped: it is the only occurrence |
| **Module-level `this`** (`this.shouldIgnoreFile(...)` in top-level arrows, where `this === module.exports`) | reading fileUtils (session 09) | `export = {…}` replaces `module.exports`, so `this.x` is `undefined` (downloadImageFile has no test) | recipe amended: ES named exports; `export const` references are emitted as `exports.x` |
| `export =` replaces the export **object identity** | session 09 | breaks modules in require cycles that captured the early object | named exports emit onto the original `exports` object |
| TS 7 forces `"use strict"` (`alwaysStrict:false` was removed, TS5108) | session 01 | sloppy-mode code behaves differently | class bodies were already strict; the converted function code was reviewed |
| `Sequelize.QueryTypes` exists at runtime but not in the types | session 11 | – | replaced with `QueryTypes` after verifying `===` at runtime |

| Sequelize `static init(sequelize)` overrides `Model.init(attributes, options)` | session 13 | TS2417 on every model | an uncallable overload (`this: never`) keeps `extends Model` type-correct without `any`; probe shows Sequelize-style calls are rejected (TS2684) |
| A Sequelize attribute shadowed by an own property (define-semantics class field) | session 13 | attribute reads `undefined`, writes are not persisted | `declare` fields, plus `model-shadow-check.js` in the gate (negative-tested) |

### 3.2 Hallucinated or over-broad APIs (prevented)
* The full `@types/fs-extra` would have let TS accept `readJson`, `outputFile` and 14 other functions that **do not exist** in the vendored `server/libs/fsExtra`. The declaration file excludes exactly those 16 (`@types` exports diffed against the runtime `Object.keys`).
* `libs/dateAndTime/index.d.ts` declares only `format`, the only function the server calls (checked by grep; arity checked at runtime). `ssrf-req-filter`'s declaration was written from its source; `libs/umzug/index.d.ts` re-exports only the three used symbols.
* TS 7 does **not** infer JS model fields declared as bare `/** @type */ this.x` statements. A local structural interface was used rather than pretending the model types were known.

### 3.3 Agent errors caught by self-review before running (honest list)
1. EBookFile: I passed `libraryFile.metadata.toJSON()` instead of the instance to satisfy a type. That would have dropped `wasModified` from the update loop. Reverted; the callee's type was widened instead.
2. zipHelpers: `error?.code` would have stopped throwing on a `null` error. Reverted to `.code`.
3. Backup: `1 as unknown as string` to silence TS2367. Rejected as a disguised suppression; replaced with the provably equivalent `Number(key) === 1`.
4. Notification: non-null assertions `payload.urls!`. Replaced with a scoped, commented assertion that keeps the original expression shape.
5. BookAuthor (session 13): `as unknown[] as …` for raw `findAll` rows, a disguised double cast. Replaced with a single commented downcast before running anything.

### 3.4 Tooling and process failures
* **CRLF checkout** (`core.autocrlf=true`) made multi-line edit patterns miss. The edit helper is all-or-nothing per file, so nothing was half-applied.
* **Shell quoting:** a bash heredoc failed to parse (nothing executed). Backticks in a `git commit -m "…"` ran `export =` as a command substitution and mangled the session 09 message; I amended only that unpushed commit's message and switched to `git commit -F`. A `;`-chained command ran the first-draft edit script after the corrected one failed (session 11); the gate ran on the final, corrected version.
* **Gate base revision:** `HEAD` stops working as the "original JS" once a file was converted in an earlier session (session 07 crash). The baseline `513a0679` is used from then on.
* The token-level emit diff cannot tokenize a regex containing quote characters (parseFullName). It was replaced there by a differential test.

### 3.5 Failure modes asked about
| Failure mode | Observed? | Evidence |
|---|---|---|
| Context loss | **No.** One continuous session (58% of a 1M window at the end, no compaction). Per-session `migration.md`/`evidence.md` carry the decisions forward (e.g. the session 09 recipe change is applied in 10 and 11) | run-log usage, session docs |
| Weakened / deleted / skipped tests | **No.** The test directory is untouched; 354/354 baseline titles pass after every session | `git diff 513a0679 -- test` empty; `sNN-passing-titles.txt` |
| Premature completion claims | **No.** The plan states coverage will be partial; this file reports 23% | §1 |
| Hallucinated APIs | **Prevented** (§3.2). One near miss in reasoning: I assumed `axios<T>(config)` was generic in 0.27; the compiler rejected it (TS2558) and the response was typed in `.then()` instead | session 09 evidence |

## 4. Type assertions (124): what they are
Assertions were allowed only where the plan permits them: dynamic APIs and invariants the compiler cannot see. Each one has a comment. The main groups (grep counts taken after session 11; session 13 added 4 more):
* `as string` (25) / `as number` (11): version strings guaranteed by `init()`, `isNaN(x as number)` coercion idiom, DP-table cells already filled, `process.env.X as string` for `parseInt`;
* `as FileMetadata` (12): "constructed" objects whose `metadata` is nullable only before population;
* `as Record<K, unknown>` (11): typed writable views for the original `this[key] = …` loops over known keys (a class cannot be asserted to `Record<string, unknown>`, TS2352; probe-verified);
* `as keyof typeof X` (4): lookups by user-supplied extension/level name;
* remaining: Node internals (`Module._compile`), `JSON.parse` of self-written lines, umzug/histogram views.

Inline assertions were preferred over introducing locals because they vanish from the emitted JS. The emitted code then stays token-identical to the original wherever possible (the emit-diff logs show this).

## 5. The checkJs number went up: why
The final checkJs count on the remaining JS (3,868 first-party; 4,056 after session 11) is higher than the recorded baseline (3,471). This is **not** caused by the conversions:
* the baseline JS (all 184 files, untouched), checked with **today's dependencies**, gives **4,114** first-party errors (`measurements/checkjs-baseline-js-with-current-deps.log`, same compiler options as `measure.sh`);
* the increase from 3,471 to 4,114 comes from `@types/express`/`@types/node` (shared foundation commit 9307ee89, made after the baseline was measured), plus the `@types` added here. With `Request` resolvable, the controllers' JSDoc typedefs now resolve and expose the missing model fields (e.g. `Property 'media' does not exist on type 'LibraryItem'` ×60 in LibraryItemController);
* with dependencies held constant, the conversions **reduced** JS checkJs errors from 4,114 to 4,056 (after session 11) and then to 3,868 (after the models pilot, whose typed attributes help JS callers). The 45 converted files have 0 strict errors.

## 6. Files left unconverted, with reasons
| Group | Files | Reason |
|---|---|---|
| Umzug migrations `server/migrations/v*.js` | 15 | Out of scope by instruction. MigrationManager copies and `_compile`s them as JS at runtime |
| `managers/BinaryManager` | 1 | **Needs a human decision.** (a) Its catch block logs `binaryPath`, which is declared inside `try`: a latent `ReferenceError` (TS2304) that cannot be typed without either fixing the bug or deliberately reproducing it. (b) The field-initializer/parameter-default hazard (§3.1) needs a constructor rewrite. Both are recorded; nothing was changed |
| Database cycle core (Database, Auth, SocketAuthority, auth/*, models User/Book/LibraryItem/Podcast/PodcastEpisode/Playlist/Setting, ServerSettings, 4 query modules, ShareManager, CoverSearchManager, BookFinder, CustomProviderAdapter) | 22 | Plan rows 15–20; not reached. Needs the model `static init` typing pattern settled first (TS2417, Investigation §5) |
| Other models (outside the cycle) | 12 | Plan rows 13–14; not reached. The pattern is settled (session 13), so these are mechanical with the model-shadow check |
| Controllers (23), routers (3), Server, Watcher, Stream, libraryHelpers | 30 | Plan rows 27–32; not reached (they depend on the models and the cycle) |
| Managers outside the cycle (13), scanner (12), providers outside the cycle (8), finders AuthorFinder/PodcastFinder (2) | 35 | Plan rows 09–10 and 23–26; not reached |
| Utils still JS: prober, ffmpegHelpers, podcastUtils, comicBookExtractors, scandir, abmetadataGenerator, parseOverdriveMediaMarkers, parseOpf/Comic/Epub/EbookMetadata, queries adminStats/libraryItemFilters/seriesFilters/userStats, legacy `utils/migrations/*` (3) | 18 | Not reached. The xml2js parsers were grouped together on purpose; the legacy migrations were planned as lowest priority |
| Objects still JS: settings/EmailSettings, settings/NotificationSettings, PlaybackSession, PodcastEpisodeDownload | 4 | Not reached (ServerSettings is counted in the cycle row, Stream in the controllers row) |
| `index.js`, `prod.js` | 2 | Last in the plan (§10 decision 5 still open) |
| Total remaining convertible | **124** | |

Why the run stopped: after session 12 I stopped by choice (43% of the 5-hour plan window used). Arya then approved continuing; session 13 (the models pilot) was done. During it, the shared 5-hour window rose to 58%. That window is shared with the parent session and the other workflow sessions on the account, so I stopped at this clean checkpoint rather than risk exhausting it (it resets at 16:10 NZDT). Continuing means following plan row 13 onward with the same gate.

## 7. Open items for the human
1. **Docker / CI / Linux packager build step: unverified.** The Docker daemon was not running and CI is not run locally.
2. BinaryManager: approve fixing the `binaryPath` scope bug (or keep it), and the constructor rewrite.
3. Latent issues recorded with no behaviour change: `LibraryFile.setDataFromPath` stores `ino = undefined` when stat fails; `MigrationManager`'s default `global.configPath` is never set; `Task.failedAt` is never serialized; `uuid` is not a declared dependency (it is only present transitively); `LogManager.getMostRecentCurrentDailyLogs` returns `''` or an array, while its JSDoc says string.
4. Development workflow: `npm run dev` now builds once (`predev`). For live TS edits, run `npm run build:watch` alongside it.
5. Function `.name` changes (`""` → the export name) in modules that assigned anonymous arrows to `module.exports.x`. Nothing reads them, but they are a measurable difference.

## 8. Artefacts
* Plan and investigation: `session-01/{Investigation.md, migration.md}`. Per-session docs: `session-02 … session-13/{migration.md, evidence.md}`. Running table: `evidence_summary.md`.
* Tools: `tools/{dep-graph.js, gate.sh, export-shape.js, emit-diff.js, strict-check.sh, parseFullName-differential.js, model-shadow-check.js}`.
* Evidence (outside the repo): `../migration-evidence/workflow-b/{session-logs/, measurements/final/ (after session 13), measurements/final-after-s12/, measurements/checkjs-baseline-js-with-current-deps.log, run-log.md}`.
