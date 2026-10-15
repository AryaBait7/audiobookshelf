# Workflow B, session 01: Investigation

Branch `migration-planned`, HEAD `dc3df2bf` (baseline `513a0679` plus the two shared type-check foundation commits).
No production code was changed in this session. Every number below came from a command run in this session. The raw logs are in `../migration-evidence/workflow-b/session-logs/` (s01-*).

## 1. Baseline state (re-measured in this worktree)

| Check | Command | Result |
|---|---|---|
| Unit tests | `npm test` (mocha) | **354 passing, 0 failing, 0 pending** (36 s wall clock) |
| Type check | `npm run typecheck` (`tsc --noEmit -p tsconfig.json`, TS 7.0.2, `allowJs`, `checkJs:false`, non-strict) | exit 0, **0 errors** |
| Smoke | `../migration-evidence/scripts/smoke.sh` | **13/13 pass**, 0 server-log error lines, startup 2 s |
| Lint | n/a | No ESLint in the project. `.prettierrc` exists, but prettier is not a dependency, so there is no lint gate |
| Build | n/a | The server has no compile step. `npm start` is `node index.js` |

Scope: 184 eligible JS files, 52,489 lines (my count, including trailing newlines; the baseline report says 52,305). **15 of them are Umzug runtime migrations** (`server/migrations/v*.js`), which stay JS by instruction. That leaves **169 convertible files**: 167 under `server/` plus `index.js` and `prod.js`.

## 2. Architecture

```
index.js / prod.js ── set globals and env, then new Server(...).start()
        │
   Server.js ── Express app, socket.io (SocketAuthority), Auth, cron, watcher, all managers
        │
   routers/ApiRouter ── 202 routes. Each handler is `XController.method.bind(this)`, so `this` inside a controller is the ApiRouter
   routers/HlsRouter, routers/PublicRouter
        │
   controllers/* (23 singletons, `module.exports = new XController()`)
        │
   managers/* (18), scanner/* (13), finders/* (3), providers/* (9)
        │
   Database.js (singleton) ── owns the Sequelize instance and lazily `require`s and `init`s 25 models
        │                      exposes `Database.<x>Model` getters (487 call sites in 48 files)
   models/* (25 Sequelize `Model` subclasses, each with `static init(sequelize)`)
        │
   objects/* (18 plain classes: settings, PlaybackSession, Stream, files/*, metadata/*)
   utils/* (46: pure helpers, parsers, generators, SQL query builders in utils/queries, legacy migrations)
   Logger.js (singleton, used by 101 of 184 files)
   libs/* (vendored third-party JS, out of scope)
```

How the application works:
* **Scanners** (`server/scanner`): `Scanner`, `LibraryScanner` → `LibraryItemScanner` → `BookScanner`/`PodcastScanner`, which use `AudioFileScanner` (ffprobe through `utils/prober`), `OpfFileScanner`, `NfoFileScanner`, `AbsMetadataFileScanner` and `LibraryItemScanData`/`LibraryScan`/`ScanLogger` as state carriers. This is the deepest dependency chain (levels 3 to 11) and has the **weakest tests** (6.2% statement coverage at baseline, no direct test file).
* **Parsers** (`server/utils/parsers`, 12 files): mostly pure string/XML → plain object functions. Five have direct tests (parseNameString, parseNfoMetadata, parseOpfMetadata, and indirectly parseFullName/parseSeriesString).
* **Managers** (`server/managers`): long-lived singletons or classes created by `Server` (Cron, Podcast, PlaybackSession, Backup, Cover, Rss, Share, Notification, Email, Migration, Binary, Cache, ApiCache, Task, AbMerge, AudioMetadata, Log, CoverSearch).
* **Controllers** (`server/controllers`, 9,409 lines): Express handlers. Requests are augmented ad hoc (`req.user`, `req.library`, `req.libraryItem`, `req.series`, ...; about 755 usages in 26 files). Types are already sketched in JSDoc `@typedef RequestWithUser` blocks repeated in every controller.
* **Routers**: `ApiRouter` wires the controllers and carries manager references (`this.playbackSessionManager` etc.) that controllers reach through `this` (`@this {import('../routers/ApiRouter')}`).
* **Models** (`server/models`, 7,709 lines): Sequelize v6 classes. Fields are documented in the constructor as `/** @type {string} */ this.name` expression statements. The real values are Sequelize attribute getters on the prototype.
* **Auth** (`Auth.js`, `auth/LocalAuthStrategy`, `auth/OidcAuthStrategy`, `auth/TokenManager`): passport, passport-jwt and openid-client. TokenManager and OidcAuthStrategy have focused tests.
* **Providers** (`server/providers`): HTTP metadata clients (axios). Audible has tests that stub HTTP.
* **Utils**: `utils/index.js` (36 dependants) and `utils/fileUtils.js` (34) are the main helper hubs. `utils/constants.js` holds enum-like frozen objects (LogLevel, ScanResult, ...).

## 3. Dependency graph (relative `require`s between in-scope files)

Computed with `agentic-ai/workflow-b/tools/dep-graph.js` (`node agentic-ai/workflow-b/tools/dep-graph.js . <outdir>`): Tarjan SCC, then the longest path to a leaf ("level").

| Level | Files | Content |
|---|---|---|
| L0 | 47 | 15 migrations; leaf utils (constants, globals, areEquivalent, longTimeout, notifications, htmlEntities, requestUtils, stringifySequelizeQuery), leaf parsers, generators (hls, opml), 10 small models with no first-party imports, objects (Task, Backup, Notification, TrackProgressMonitor, AudioTrack, AudioMetaTags, FileMetadata), OpenLibrary |
| L1 | 6 | **Logger**, AudioFile, EBookFile, MediaProbeData, htmlSanitizer, parseNameString |
| L2 | 21 | utils/index, fileUtils, prober, profiler, rateLimiterFactory, zipHelpers, abmetadataGenerator, oldDbFiles, parseOPML, parseOverdriveMediaMarkers, MigrationManager, models ApiKey/Author/Feed/Library, DeviceInfo, providers AudiobookCovers/FantLab/GoogleBooks/iTunes, ScanLogger |
| L3 | 23 | ffmpegHelpers, podcastUtils, comicBookExtractors, parseOpfMetadata, dbMigration (1,807 lines), BinaryManager, models Device/FeedEpisode/MediaProgress/Series, objects DailyLog/PlaybackSession/PodcastEpisodeDownload/LibraryFile/EmailSettings/NotificationSettings, providers Audible/Audnexus/MusicBrainz, PodcastFinder, scanner AbsMetadataFileScanner/LibraryScan/NfoFileScanner |
| L4 | 8 | AuthorFinder, LogManager, models/PlaybackSession, OpfFileScanner, absMetadataMigration, parseComicMetadata, parseEpubMetadata, scandir |
| L5 | 23 | **the 22-file cycle** (below) + parseEbookMetadata |
| L6 to L8 | 45 | most controllers and managers, Stream, HlsRouter, AudioFileScanner, LibraryItemScanData, the remaining queries, Watcher, BookScanner, PodcastScanner, PodcastManager |
| L9 to L15 | 11 | LibraryItemScanner → LibraryScanner → Scanner/CronManager → Library/LibraryItem/Podcast controllers → ApiRouter → Server → index.js/prod.js |

**Strongly connected component (22 files, the coupling core):**
`Database, Auth, SocketAuthority, auth/{LocalAuthStrategy, OidcAuthStrategy, TokenManager}, models/{User, Book, LibraryItem, Podcast, PodcastEpisode, Playlist, Setting}, objects/settings/ServerSettings, utils/queries/{libraryFilters, libraryItemsBookFilters, libraryItemsPodcastFilters, authorFilters}, managers/{ShareManager, CoverSearchManager}, finders/BookFinder, providers/CustomProviderAdapter`.
The cycle is real at runtime. It works only because most of these modules `require('../Database')` and dereference `Database.xModel` lazily inside functions. `Database.js` also requires the 25 models **inside** `buildModels()`, not at the top, and `absMetadataMigration` inside `loadData()`.

**Coupling hotspots (fan-in):** Logger 101, Database 53, utils/index 36, fileUtils 34, SocketAuthority 32, constants 18, htmlSanitizer 14.
**Fan-out hotspots:** Database 30, ApiRouter 28, Server 25, BookScanner 20, PodcastManager 17, LibraryController 16.

Consequence: the dependency order is clear only up to L4. Everything that touches `Database` is in, or depends on, the cycle. With `allowJs` this does not block a mixed migration, because TS reads types from the JS it has not converted yet. It does mean "convert all of a file's dependencies first" is impossible for the 22 cycle members, so they get their own batches (see the plan).

## 4. Module and export patterns (affect how TS is emitted)

| Pattern | Count | Implication |
|---|---|---|
| `module.exports = new X()` (singletons) | 47 files (all controllers, most managers and scanners, Database, Logger, SocketAuthority, Watcher, finders) | Must stay a single instance exported as `module.exports`, so use `export = new X()`. ES `export default` would emit `exports.default` and break every `require()` consumer, including the tests |
| `module.exports.x = ...` named exports | 26 files (e.g. utils/index, fileUtils) | Tests stub these (`sinon.stub(fileUtils, 'isWritable')`). The module object must stay a plain, writable object, so use `export = { ... }`. Internal calls must keep the same routing they had (direct call vs `module.exports.x`) |
| Destructured first-party requires (`const { LogLevel } = require('./utils/constants')`) | common | ES `import { x }` would turn a load-time snapshot into a live `module.x` lookup. That changes behaviour under cycles and sinon stubs, so keep it as a snapshot |
| Lazy `require` inside functions | Database.js (25 models + absMetadataMigration), Server.js (`require(nextPath)`), TokenManager (`crypto`), index.js (`./dev`) | Must stay lazy to keep the cycle and load order |
| `const { Request, Response } = require('express')` used only for JSDoc | controllers and others | Becomes `import type`. The runtime value was `undefined` and never used |

## 5. Dynamic-typing hazards

1. **Sequelize models.** Attribute values are prototype getters/setters. Any TS class field (`name: string`) emitted as a real class field would create an own property that shadows the getter and silently breaks persistence. **Must use `declare`.** Also, `static init(sequelize)` has a different signature from `Model.init(attributes, options)`, so TS will report the static side as incompatible (TS2417). This needs a typed solution, not `any`/ignore. Candidates: overloads, or a typed `ModelStatic` helper. It will be prototyped on 2 small models first. Associations are created through `sequelize.models.x` (115 usages in 11 files), which is untyped string-keyed access.
2. **Class-field emit semantics.** With `target: ES2022`, TS defaults to `useDefineForClassFields: true`. Verified in a scratch prototype: `name: string` is emitted as a `name;` field, which creates an own property set to `undefined`. Code such as `objects/DeviceInfo.js` does `if (this[key] !== undefined)` over its own fields, and `toJSON`/`Object.keys` patterns exist. **Decision: set `useDefineForClassFields: false`.** Verified that it emits constructor assignments only, as the JS does now.
3. **Strict mode.** TS 7 always emits `"use strict"` (`alwaysStrict:false` was removed; verified, error TS5108). Class bodies are already strict. The risk is in top-level/function code: sloppy-mode `this`, writes to read-only properties, undeclared assignments. The type checker catches undeclared names. The others are covered by review, tests and smoke.
4. **Request augmentation.** `req.user`, `req.library`, ... are attached by middleware. A shared `RequestWithUser` type plus per-controller intersections are needed. Using `any` here would be easy, and that is exactly the shortcut to avoid.
5. **`this` rebinding.** Controller methods run with `this = ApiRouter` (`.bind(this)` × 202). Annotate with a `this: ApiRouter` parameter (type-only, erased), and take the type with `import type` to avoid adding a runtime cycle.
6. **String-keyed dynamic access.** `this[key]` (43 hits in 17 files), `obj[key] =` (107 hits in 34 files), `for (key in LogLevel)`. These need `keyof` narrowing or `Record<string, unknown>`.
7. **Globals.** `global.ServerSettings`, `Source`, `isWin`, `ConfigPath`, `MetadataPath`, `RouterBasePath`, `XAccel`, `AllowCors` and `DisableSsrfRequestFilter` are declared in `types/global.d.ts`. `global.appRoot`, `PodcastDownloadTimeout` and `MaxFailedEpisodeChecks` are **not** declared yet. `ServerSettings` is declared `any`, which should be narrowed once ServerSettings.ts exists.
8. **Duplicate members.** `Database.js` defines the `podcastEpisodeModel` getter twice (lines 96 and 106, identical bodies). TS reports a duplicate identifier. Removing one is behaviour-neutral.
9. **Stack-depth dependent code.** `Logger.source` reads `Error().stack.split('\n')[3]`. Emit keeps the call structure, and a test stubs this getter.
10. **Untyped dependencies.** No bundled types for passport, passport-jwt, express-session, cookie-parser, nodemailer, semver, xml2js, graceful-fs, ssrf-req-filter, p-throttle (v4), node-unrar-js. The non-strict project check tolerates this (implicit any). The **strict reference check in measure.sh** will report TS7016 for each such import. Fix: pinned `@types/*` devDependencies or small local declarations in `types/`, added only when a batch first imports the module. `server/libs/*` are JS and get inferred through `allowJs`.
11. **Existing JSDoc is a head start.** 1,661 `@param`, 437 `@returns`, 494 `@type`, 124 `@typedef`. Not all are accurate (checkJs at baseline reports 3,471 first-party errors; TS2339 "property does not exist" is the main code). They have to be verified, not transcribed blindly.

## 6. Runtime and tooling constraints for a CommonJS TS migration

* Node 22.15 locally; Docker and CI use Node 20. Native type stripping is not usable: `import = require` needs transform, and it is not on by default in 22.15 or available in 20. **TS 7.0.2 is the native compiler and has no JS `transpileModule` API** (`node_modules/typescript/lib` only has `tsc.js`/`getExePath.js`), so a runtime require hook with TS is not an option without a new dependency.
* **Chosen approach, verified in a scratch prototype:** compile each `.ts` **in place** to a sibling `.js` with a dedicated `tsconfig.build.json` (`allowJs:false`, `noCheck:true`, only `**/*.ts`). TS 7 emits clean CJS: `import X = require('y')` → `const X = require("y")`, `export = X` → `module.exports = X`, `import type` is erased. Every existing `require('./foo')` (source and tests) keeps resolving with no path changes, and `__dirname`-relative paths (client/dist, migrations) are unchanged. The type-check config (`allowJs`) prefers `foo.ts` over a generated `foo.js` (verified with `--listFilesOnly`). A deliberate type error was caught (exit 1), so the gate works.
* Generated `.js` must be git-ignored. They must exist before `npm test`/`npm start`, so use `pretest`/`prestart` hooks (the measurement scripts call `npm test` and `npm start`, so they pick this up automatically). Docker's `npm ci --only=production` and CI's pkg job need a build step. Neither can be verified locally (see plan, risks).
* `pkg.scripts` (`server/**/*.js`) and the MigrationManager copy of `server/migrations/*.js` keep working because migrations stay JS and generated JS exists after the build.

## 7. Tests available per area (direct `require` of the module by a test file)

| Area | Files | Lines | Files with a direct test | Notes |
|---|---|---|---|---|
| root (Logger, Database, Auth, Server, SocketAuthority, Watcher) | 6 | 3,045 | 3 | Logger (16 test files touch it), Database (5), Auth (1). Server/Watcher/SocketAuthority untested |
| auth | 3 | 1,291 | 2 | TokenManager, OidcAuthStrategy |
| controllers | 23 | 9,409 | 3 | Library, LibraryItem, User (8.6% coverage) |
| finders | 3 | 807 | 1 | BookFinder |
| managers | 18 | 5,418 | 3 | Binary, Migration, ApiCache |
| migrations (stay JS) | 15 | 2,007 | 8 | n/a |
| models | 25 | 7,709 | 0 direct | Exercised through Database (in-memory SQLite) in the controller/migration tests and `oldJsonSerialization.test.js` |
| objects | 18 | 2,924 | 1 | TrackProgressMonitor |
| providers | 9 | 1,173 | 1 | Audible |
| routers | 3 | 707 | 1 | ApiRouter (through the LibraryItemController test) |
| scanner | 13 | 4,470 | **0** | 6.2% coverage, highest regression risk |
| utils (+ parsers, generators, queries, migrations) | 46 | 13,436 | 11 | constants, index, fileUtils, ffmpegHelpers, requestUtils, scandir, stringifySequelizeQuery, zipHelpers, parseNameString, parseNfoMetadata, parseOpfMetadata. queries and migrations untested |
| entry points | 2 | 93 | 0 | Smoke test only |

The smoke test covers start-up, init, login, authenticated API, library creation, the migration pickup and DB creation. It does **not** run a library scan, podcast download, streaming or OIDC.

## 8. Risks (ranked)

1. **Silent model breakage** from shadowing class fields: getters stop working and values read as `undefined`. Mitigation: `declare` only, plus `useDefineForClassFields:false` as a backstop.
2. **Untested areas** (scanner, controllers, queries, models) can regress without a failing test. Mitigation: smaller batches there, smoke test every session, behaviour-preserving mechanical edits only, and a diff review of the emitted `.js` against the original `.js` for each converted file (should differ only in whitespace, comments and `"use strict"`).
3. **Export-shape drift** (default vs `module.exports`) breaks `require` consumers. Mitigation: always `export =` with the original shape, plus an export-shape check script comparing `Object.keys(require(file))` before and after each batch.
4. **Load-order and cycle changes** from hoisting lazy requires or adding value imports. Mitigation: keep lazy requires lazy (typed through `typeof import()`), use `import type` for type-only needs.
5. **Strict-mode behaviour** in emitted code (TS 7 forces it). Mitigation: tests, smoke, and review of top-level functions for sloppy-mode reliance.
6. **Deployment pipeline** (Dockerfile, CI pkg job) needs a build step, which I cannot verify locally. Flag it to the human, keep the change minimal.
7. **Stale generated JS:** a deleted or renamed `.ts` leaves its `.js` behind. Mitigation: a `clean` script and building before every gate.
8. **Context loss across sessions:** mitigated by per-session `migration.md`/`evidence.md` and the running `evidence_summary.md`.
