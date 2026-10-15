# Step 1: Repository Analysis and Parallel Migration Plan

Planning only. No production file was modified, no TypeScript file created, no sub-agent launched.
Date: 2026-10-15. Worktree: `wt-b-planned`. Evidence from earlier baseline runs is in `migration-evidence/baseline/` (commit 513a0679, 2026-10-08).

## 1. Baseline measurements

| Item | Value | Source |
|---|---|---|
| Branch / status | `migration-planned` @ `513a0679`; working tree clean before this report | `git status` today |
| Eligible first-party JS files | **184** (52,305 lines): utils 46, models 25, controllers 23, objects 18, managers 18, migrations 15, scanner 13, providers 9, server root 6, routers 3, finders 3, auth 3, entry points 2 | `eligible-js-files.txt`; per-directory counts re-confirmed today |
| TypeScript files | 0 `.ts` in first party; the only `.d.ts` is vendored `server/libs/fluentFfmpeg/index.d.ts` | `find` |
| Vendored (excluded) | `server/libs/`: 244 JS files, ~39.7k lines | `find` |
| Test files | 35 JS, 0 TS (`test/server/**`) | `find` |
| Node | v22.15.0 local (CI/Docker use Node 20) | `node -v` |
| TypeScript | **Not installed in the project** (no `typescript` dependency, no `tsconfig.json`). Reference compiler: TS 7.0.2 pinned in `migration-evidence/tools/` | `package.json`, BASELINE.md |
| Build | **No compile step**: `npm start` = `node index.js`; `pkg` config lists `server/**/*.js`, `server/migrations/*.js`. "Build passes" is measured by `smoke.sh`: **13/13** | BASELINE.md |
| Tests (`npm test`, mocha, `recursive: true`) | **354 passing, 0 failing, 0 pending** (4 s on this run; 31–56 s earlier) | `npm test` today |
| Lint | None configured (no ESLint config/dependency). `.prettierrc` present, Prettier not a dependency | BASELINE.md |
| Coverage (nyc) | server root 16.7%, auth 20.6, controllers 8.6, finders 57.8, managers 33.4, migrations 95.2, models 28.5, objects 13.1, providers 12.5, routers 88.0, **scanner 6.2**, utils 23.3 (Statements %) | BASELINE.md, run once on 2026-10-08 |
| `checkJs` (TS 7.0.2, non-strict) | 4,115 errors, **3,471 first-party** (TS2339 dominates: 2,716). Worst: models/Feed.js 173, scanner/BookScanner.js 154, models/LibraryItem.js 153, queries/libraryItemsBookFilters.js 122, managers/PodcastManager.js 121 | BASELINE.md |

Pre-existing issues (not fixed): the first smoke attempt failed only because `SKIP_BINARIES_CHECK=1` still needs `FFMPEG_PATH` (harness issue, fixed in `smoke.sh`). Coverage and lint are weak: a migration could break scanner or controller behaviour while unit tests still pass, so the smoke test and review matter more than green tests.

## 2. Architecture and dependencies

Stack: CommonJS, Express 4, Sequelize 6 on SQLite, socket.io, passport. Composition: `index.js` → `server/Server.js` (builds managers, routers, auth, Database, SocketAuthority) → `routers/ApiRouter.js` → `controllers/*` → `managers/*`, `finders/*`, `scanner/*` → `models/*` (Sequelize) and `objects/*` (plain classes).

Cross-directory `require` edges (counted by script, vendored `libs` excluded):

| From | Heavily depends on |
|---|---|
| routers | controllers 25, server-root 5 |
| controllers | server-root 56 (Database, Logger, SocketAuthority, Auth), utils 41, managers 16, scanner 6, finders 4 |
| managers | server-root 37, utils 26, objects 12, finders 2, scanner 1 |
| scanner | utils 36, server-root 16, objects 9, managers 6, models 4, finders 3 |
| finders | providers 10, utils 3, server-root 3 |
| models | utils 15, server-root 13, objects 6, auth 1 |
| objects | utils 15, server-root 6, models 1 |
| utils | server-root 30, libs 27, models 3, objects 2, managers 1, scanner 1 |
| auth | server-root 6, utils 2 |
| server root | models 25, managers 16, utils 10, auth 4, routers 3 |

Highest fan-in (the shared hubs): `Logger.js` 101, `Database.js` 53, `utils/fileUtils.js` 35, `SocketAuthority.js` 32, `utils/index.js` 37 (two require spellings), `utils/constants.js` 18, `utils/htmlSanitizer.js` 14, `package.json` 11, then `RssFeedManager`, `CacheManager`, `CoverManager`, `TaskManager`, `utils/globals.js` (7 each), `objects/files/LibraryFile.js` 7.

Relatively independent leaves: `providers/*` (depends on utils only), `utils/parsers/*`, `utils/generators/*`, `migrations/*` (own frozen DB snapshots, 95% covered), `auth/*` (small), `routers/*` (3 files).

Hard-to-type or runtime-sensitive areas:
- **Sequelize models**: properties exist only via `this.x` in `init`/constructors and `Database.models`, causing most of the 2,716 TS2339 errors. Models are also reached through `Database.xModel` from ~58 files.
- **Globals**: `global.ServerSettings`, `Source`, `isWin`, `ConfigPath`, `MetadataPath`, `RouterBasePath`, `XAccel`, `AllowCors`, `DisableSsrfRequestFilter` set in `Server.js`/`Database.js`, read everywhere. Needs a single ambient `global.d.ts`.
- **CommonJS export shapes**: `module.exports = X` (class), `module.exports = { a, b }`, and mixed. `esModuleInterop`/`export =` choice affects every consumer.
- **Dynamic require**: `Server.js:408` (`require(nextPath)` for the client build), plus MigrationManager loading migration files by filename at runtime and `pkg` asset lists that reference `*.js` paths.
- **Circular/layering leaks**: `objects→models`, `utils→managers/scanner/models`, `models→auth`. These make "per directory" boundaries porous.
- **`index.js`/`prod.js` entry points** read `package.json` and global state; `pkg`, Dockerfile and `nodemon` all assume `.js` output.

## 3. Proposed workstreams

Tests refer to `test/server/<area>`; files in `test/` are frozen (not edited to pass).

| WS | Scope (files) | Cohesion | Depends on | Difficulty / risk | Verifying tests | Independent? |
|---|---|---|---|---|---|---|
| **WS0 Foundation** (prerequisite) | tooling only: `tsconfig`, TS devDependency, `global.d.ts`, shared types (`types/`: ServerSettings, User payloads, Task, LibraryFile, Sequelize model interface conventions), CJS interop decision, build-output decision | Single owner defines the contract everyone else compiles against | none | High design risk; touches build config that the task forbids changing "just to ease migration", so needs explicit sign-off | `npm test`, `smoke.sh` | Sequential, must come first |
| **WS1 Providers + parsers + generators** | `server/providers/*` (9), `utils/parsers/*` (12), `utils/generators/*` (3) | Pure functions and HTTP metadata clients; depend on `Logger` and a few utils | WS0 only | Low–medium (untyped external API JSON) | `test/server/providers`, `test/server/utils/parsers`, `test/server/utils` | Yes |
| **WS2 Migrations** | `server/migrations/*` (15), `utils/migrations/*` (3, incl. 1,807-line `dbMigration.js`) | Frozen schema-snapshot scripts, self-contained, 95% covered | WS0 (and file-name/`pkg` asset rules) | Medium: runtime loads files by name and glob `server/migrations/*.js`; extension change breaks `pkg` and umzug | `test/server/migrations`, `test/server/managers/migrations` | Yes, but lowest value and highest runtime-loading risk; defer |
| **WS3 Models** | `server/models/*` (25) | Sequelize classes with `init` | WS0, `Database.js` interface | **High**: ~3k first-party checkJs errors concentrate here; Feed 173, LibraryItem 153, User 1,027 lines | `test/server/models`, `test/server/objects`, controller/manager tests that use in-memory DB | Mostly; types are consumed by almost everyone else |
| **WS4 Objects + utils core** | `server/objects/**` (18), non-parser `utils/*` and `utils/queries/*` (≈31) | Plain classes and helpers; high fan-in (`fileUtils`, `constants`, `index`) | WS0; `utils/queries` needs WS3 model types | Medium; `htmlEntities.js` (2,236 lines, data table) is trivial but large | `test/server/objects`, `test/server/utils` | Partly: leaf utils yes, `queries/*` after WS3 |
| **WS5 Auth + server composition** | `server/Auth.js`, `auth/*` (3), `Server.js`, `Database.js`, `SocketAuthority.js`, `Logger.js`, `Watcher.js`, `index.js`, `prod.js` | Composition root and the global hubs | WS0, WS3, WS4 | High: globals, dynamic require, entry points, `pkg` | `test/server/auth`, full suite, `smoke.sh` | Sequential, last |
| **WS6 Managers + finders + scanner** | `managers/*` (18), `finders/*` (3), `scanner/*` (13) | Business logic over models and providers | WS1, WS3, WS4 | High: scanner has 6% coverage, `BookScanner` 154 errors, `PodcastManager` 121 | `test/server/managers`, `test/server/finders`, smoke | After prerequisites |
| **WS7 Controllers + routers** | `controllers/*` (23, 9.4k lines), `routers/*` (3) | Thin Express handlers over managers/models | WS3, WS4, WS6, WS5 types | Medium–high: 8.6% coverage on controllers, `LibraryController` 1,501, `LibraryItemController` 1,248 | `test/server/controllers`, smoke endpoints | After prerequisites |

Natural layering: WS0 → (WS1, WS3, WS4-leaf in parallel) → WS4-queries → WS6 → WS7 → WS5.

## 4. Risks and shared-file conflicts

| Shared file(s) | Why it conflicts | Mitigation |
|---|---|---|
| `Logger.js` (101 importers), `Database.js` (53), `SocketAuthority.js` (32) | Every workstream imports them; their types decide everyone's code | Migrate (or hand-write `.d.ts`) in WS0 before any other agent starts; owners are frozen after |
| `utils/index.js`, `utils/fileUtils.js`, `utils/constants.js`, `utils/globals.js` | High fan-in hubs inside "utils" | Same: foundation owner, or type via `.d.ts` first |
| Global variables | Untyped globals produce errors in all areas | Single `global.d.ts` in WS0 |
| `package.json`, lockfile, `pkg` assets, Dockerfile, `nodemon` | Adding TS changes install/build/run; `server/**/*.js` globs go stale | Single owner (WS0 / integrator); agents never edit |
| Model typing convention | Inconsistent per-agent approaches multiply merge pain | Decided in WS0 with one worked example (e.g. `Setting.js`) |
| Circular-ish edges (`objects→models`, `utils→managers`) | Agents in different streams need the same file | Resolve ownership by "lowest layer wins"; others import only the declared type |
| Low coverage (scanner 6%, controllers 9%) | Green tests don't prove behaviour is preserved | Smoke test + diff review that is limited to type annotations/import syntax; no logic edits |
| Coincidental `checkJs` debt (3,471 errors) | Tempts agents to "fix" runtime code or add `any` | Rule: no behavioural changes; `any`/`@ts-ignore` counted and reported |

## 5. Coordination and verification strategy

1. **Explicit ownership**: a table `file → workstream` committed in WS0; an agent may only edit its own files and its own `types` additions. Anything else is raised to the integrator, not edited.
2. **One branch per workstream** off the foundation commit; rebase onto the integration branch, never cross-merge between workstream branches. Because file ownership is disjoint, conflicts should be limited to `package.json`, lockfile and shared types, which only the integrator edits.
3. **Interface-first**: shared hubs get `.d.ts` or finished TS before dependents start; dependents may import from not-yet-migrated JS through `allowJs`.
4. **Sequencing** is enforced by the plan: WS0 first; WS6, WS7, WS5 are not parallel with their prerequisites.
5. **Per-stream gate**: mocha for its directories, the strict `tsc` check restricted to its files, and a diff review. **Integration checkpoint** after each merge: full `npm test` (354 passing, 0 failing baseline; compare titles with `tests-passing-titles.txt`), `smoke.sh` 13/13, `tsc` error counts.
6. **Quality review**: track `any`, `as unknown as`, `@ts-ignore`/`@ts-expect-error` counts per stream; reject changes that alter runtime logic; require a reviewer pass of each stream's diff for behaviour preservation, not only successful compilation.
7. **Not weakened**: no test edits, no loosening of compiler options per stream, no changes under `server/libs`.

## 6. Recommended first implementation batch

**Prerequisite (single owner, sequential): WS0.** Needs: decision on build approach (compile to `dist` vs `ts-node`/type-strip at runtime) and its effect on `pkg`/Docker; `tsconfig` with `allowJs`; ambient globals; type stubs for `Logger`, `Database`, `SocketAuthority`, `fileUtils`, `constants`. These shared decisions require user approval because they touch build config.

**Batch 1 (parallel, 3 agents), after WS0:**

| Agent | Files | Count | Why safe in parallel |
|---|---|---|---|
| A | `server/providers/*` + `utils/generators/*` | 12 | Leaves: depend only on utils/Logger (typed in WS0), no model access; 10 inbound edges only from `finders` (still JS) |
| B | `server/utils/parsers/*` + parser-adjacent leaf utils (e.g. `parseNameString`, `htmlSanitizer`-free ones) | ~12 | Pure functions; 5 test files cover them |
| C | `server/objects/**` leaf classes without a model dependency (`objects/files/*`, `objects/metadata/*`, `objects/settings/*`, `Task`) | ~11 | Plain classes; heavily covered only lightly (13%), so reviewed by diff |

≈35 files (~19% of eligible) with disjoint ownership and no shared-file edits. Deliberately **excluded** from batch 1: models, managers, scanner, controllers, migrations, and all hubs (`Logger`, `Database`, `utils/index`, `fileUtils`), because they either have high fan-in, runtime-loading constraints, or need the WS3 model type convention first.

## Open decisions for the user
1. Approve a WS0 build/config change (task forbids altering config only to ease migration; this is required infrastructure, so it must be explicit).
2. Choose how hubs (`Logger`, `Database`) are typed first: full TS conversion in WS0 or `.d.ts` shims.
3. Confirm whether this experiment is a fourth workflow or the replacement for Workflow B in `wt-b-planned`.
