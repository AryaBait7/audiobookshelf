# Workflow B, session 09: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s09-*`.

## Files
Converted: server/utils/fileUtils.ts. Added: types/ssrf-req-filter.d.ts. `.gitignore` +1.

## Gate (`gate.sh 09 513a0679 server/utils/fileUtils.js`)
| Gate | Result |
|---|---|
| build:server | exit 0 |
| typecheck | exit 0, **0 errors** |
| npm test (clean tree) | **354 passing, 0 failing, 0 pending**; 0 baseline titles missing (incl. BinaryManager.test's `sinon.stub(fileUtils, 'isWritable')`) |
| export shape (vs baseline) | top-level object identical (same 24 keys); **14 members differ only in `name`** (`""` → the export name, because `export const f = () => …` names the arrow). Same benign class as sessions 03 to 05 |
| emit-diff | not token-identical: `__importDefault`/`__esModule` prologue, `exports.x = …` assignments, `(0, exports.f)(…)` routing (expected, see migration.md) |
| routing check | emitted fileUtils.js line 218 `(0, exports.shouldIgnoreFile)(relpath)`, line 327 `(0, exports.downloadFile)(…)`, line 485 `filePathToPOSIX(fullPath)` (documented) |
| strict reference check | 33 TS files, **0 errors** |
| directives / `any` / `as unknown as` / `!.` | 0 / 0 / 0 / 0 |
| smoke | **13/13**, 0 error lines |

## Problems and how they were resolved
1. **Module-level `this` routing hazard.** Found by reading the code before converting. I probed the TS 7 emit and amended the recipe (migration.md).
2. Bash heredoc parsing failed on the edit script (exit 2, nothing executed); I wrote it with the file tool instead.
3. Typecheck round 1: the reused `list` variable (TS2322 ×2) and axios not callable (TS2349, ES-default-only types). Round 2: `axios<Readable>` is not generic in 0.27 (TS2558). The final version types the response in `.then()`.

## Counts
TS files in scope: **33** / 169 convertible.
