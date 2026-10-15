# Workflow B: running evidence summary

Baseline (513a0679): 184 eligible JS files (169 convertible; 15 Umzug migrations stay JS), 354 passing / 0 failing, smoke 13/13.

| Session | Batch | TS files in scope | Tests passing / failing | Typecheck errors | Smoke | Notes |
|---|---|---|---|---|---|---|
| 01 | Investigation + plan | 0 | 354 / 0 | 0 | 13/13 | No production code changes. Plan approved by the human before session 02 |
| 02 | Toolchain (in-place emit, pre-hooks, Docker/CI build step) + 4 pilot leaves | 4 | 354 / 0 | 0 | 13/13 | Strict 0 errors, any 0. Export shape 4/4 same. Docker build unverified (daemon not running) |
| 03 | L0 pure utils (areEquivalent, globals, longTimeout, parseSeriesString, parseUserAgent) | 9 | 354 / 0 | 0 | 13/13 | Strict 0. Export shape 4/5 (benign `fn.name` change). TS found an unreachable branch condition (removed, behaviour unchanged) |
| 04 | htmlEntities (2,236 lines) + htmlSanitizer + parseComicInfoMetadata | 12 | 354 / 0 | 0 | 13/13 | Strict 0. Large-file rule applied: rest of plan row 04 moved to 05 |
| 05 | notifications, hls/opml generators, parseFullName, parseNameString; fsExtra subset d.ts + @types/fs-extra | 17 | 354 / 0 | 0 | 13/13 | Strict 0. parseFullName checked by differential test 6300/6300 identical |
| 06 | Logger + Task, Backup, Notification, TrackProgressMonitor, FileMetadata; dateAndTime d.ts, @types/uuid | 23 | 354 / 0 | 0 | 13/13 | Strict 0, export shape 6/6. Found undeclared `failedAt` field and undeclared `uuid` dependency (recorded, not changed) |
| 07 | AudioMetaTags, AudioTrack, EBookFile, LibraryFile, MediaProbeData (+FileMetadata revised) | 28 | 354 / 0 | 0 | 13/13 | Strict 0, export shape 6/6 vs baseline. Self-caught near-regression (toJSON vs instance) reverted before testing. Latent bug recorded (stat failure → ino undefined) |
| 08 | AudioFile, DeviceInfo, profiler, parseOPML (+AudioTrack revised) | 32 | 354 / 0 | 0 | 13/13 | Strict 0, export shape 5/5 vs baseline |
| 09 | utils/fileUtils (hub, 34 dependants) + ssrf-req-filter d.ts | 33 | 354 / 0 | 0 | 13/13 | Found module-level `this` export-routing hazard; recipe amended to ES named exports for incremental-export modules. Strict 0 |
| 10 | utils/index (hub, 36 dependants), zipHelpers, rateLimiterFactory | 36 | 354 / 0 | 0 | 13/13 | Named-export recipe; `this.x` routing verified in emit. Strict 0 |
| 11 | DailyLog, LogManager, MigrationManager; umzug d.ts, @types/semver | 39 | 354 / 0 | 0 | 13/13 | Export shape 3/3, strict 0. Found never-set `global.configPath` default (recorded) |
| 12 | Stop + final measure.sh + FINDINGS (BinaryManager deferred for a human decision) | 39 | 354 / 0 | 0 | 13/13 | Final: 39/169 convertible (23%), strict 0, any 0, directives 0. checkJs on remaining JS 4,056 first-party (baseline JS with today's deps: 4,114) |
| 13 | Models pilot: Session, LibraryFolder, CollectionBook, BookAuthor, BookSeries, PlaylistMediaItem | 45 | 354 / 0 | 0 | 13/13 | Resumed after relayed approval. `declare` + uncallable `this: never` init overload; model-shadow-check 6/6 (negative-tested). Strict 0 |
| 14 | Re-measure after session 13 + docs (no code) | 45 | 354 / 0 | 0 | 13/13 | measure.sh: 45 TS / 139 JS (24.5%; 45/169 convertible = 27%), strict 0, checkJs first-party 3,868. Stopped: shared 5-hour usage window at 58% |
