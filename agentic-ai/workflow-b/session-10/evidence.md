# Workflow B, session 10: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s10-*`.

## Files converted (3)
server/utils/index.ts, server/utils/zipHelpers.ts, server/utils/rateLimiterFactory.ts. Added `@types/xml2js@0.4.14` (package.json/lock). `.gitignore` +3.

## Gate (`gate.sh 10 513a0679 <3 files>`)
| Gate | Result |
|---|---|
| build:server | exit 0 |
| typecheck | exit 0, **0 errors**, on the first compile |
| npm test (clean tree) | **354 passing, 0 failing, 0 pending**; 0 baseline titles missing |
| export shape (vs baseline) | rateLimiterFactory identical. utils/index and zipHelpers: top-level key sets identical; **the only member differences are function `name`** (17 in index, 3 in zipHelpers; `""` → the export name). Checked with a script that compares every member with `name` masked out: no other difference |
| emitted routing | utils/index.js: `(0, exports.isObject)(val)` (l.153), `val.map(exports.copyValue)` (l.156), `(0, exports.copyValue)(val[key])` (l.161) |
| strict reference check | 36 TS files, **0 errors** |
| directives / `any` / `as unknown as` / `!.` | 0 / 0 / 0 / 0 |
| smoke | **13/13**, 0 error lines |

## Problems
1. Session 09's commit message was mangled: backticks inside a double-quoted `git commit -m` ran `export =` as a shell command substitution. I amended that unpushed commit's message (only the message) and now commit with `-F <file>`.
2. Self-review caught one `?.` that would have changed null handling (see migration.md). It was fixed before the first build.

## Counts
TS files in scope: **36** / 169 convertible.
