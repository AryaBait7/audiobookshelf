# Workflow B, session 06: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s06-*`.

## Files converted (6)
server/Logger.ts, server/objects/Task.ts, server/objects/Backup.ts, server/objects/Notification.ts, server/objects/TrackProgressMonitor.ts, server/objects/metadata/FileMetadata.ts.
Also: server/libs/dateAndTime/index.d.ts (new), `@types/uuid@8.3.4` (package.json/lock), `.gitignore` (+6).

## Gate (`gate.sh 06 HEAD <6 files>`)
| Gate | Result |
|---|---|
| build:server | exit 0 |
| typecheck | exit 0, **0 errors** |
| npm test (clean tree) | **354 passing, 0 failing, 0 pending**; 0 baseline titles missing (includes the 16 test files that load Logger, and the Logger.test stubs on `date.format` and the `source` getter) |
| export shape | **6/6 identical** |
| emit diff | 1/6 token-identical. Differences: import/export layout. Backup `Number(key) === 1`. Notification/FileMetadata writable-view locals and `String(...)`. Logger: with `useDefineForClassFields:false`, TS emits the static `ConsoleMethods` in a `static {}` block and reads it via an alias `_a = Logger`. The value and timing are the same (class definition time) |
| strict reference check | 23 TS files, **0 errors** (after the d.ts and reference fixes below) |
| directives / `any` / `as unknown as` / `!.` | 0 / 0 / 0 / 0 |
| smoke | **13/13**, 0 error lines |

## Problems and how they were resolved
1. The first strict check had 7 errors: `date.format` unknown (×4, the minified UMD lib) → exact d.ts; `global.isWin` TS7017 and `AbsShared` TS2503 → reference directives (the strict reference config only compiles in-scope files).
2. In my first Notification draft I used `payload.urls!` (non-null assertions). I replaced them with a commented `payload[key] as string[]`, which keeps the original expression shape, inside the existing `!== undefined` guard.
3. In my first Backup draft I used `1 as unknown as string` to silence TS2367. I rejected it as a disguised suppression and replaced it with the provably equivalent `Number(this.key) === 1`.

## Counts
TS files in scope: **23** / 169 convertible.
