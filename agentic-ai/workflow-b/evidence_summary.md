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
