# Workflow B, session 03: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s03-*` (gate summary: `s03-gate-summary.txt`).

## Files converted (5)
server/utils/areEquivalent.ts, server/utils/globals.ts, server/utils/longTimeout.ts, server/utils/parsers/parseSeriesString.ts, server/utils/parsers/parseUserAgent.ts (+5 `.gitignore` lines)

## Gate (`bash agentic-ai/workflow-b/tools/gate.sh 03 HEAD <5 files>`, 35 s)
| Gate | Result |
|---|---|
| build:server | exit 0 |
| typecheck | exit 0, **0 errors** |
| npm test (from a clean tree, rebuilt by pretest) | **354 passing, 0 failing, 0 pending**; 0 baseline titles missing |
| export shape | **4/5 identical**. parseSeriesString differs only in `parse.name`: `""` → `"parse"` (see problem 3) |
| emit diff | 2/5 token-identical. Differences: export layout (areEquivalent, parseSeriesString); the removed unreachable `'function'` clause and the `obj1/obj2` locals (areEquivalent); `?? undefined` (longTimeout) |
| strict reference check | 9 TS files, **0 errors** |
| directives / `any` / `as unknown as` / `!.` | 0 / 0 / 0 / 0 |
| smoke (from a clean tree, rebuilt by prestart) | **13/13**, 0 error lines |

## Problems and how they were resolved
1. **CRLF line endings.** The checkout uses `core.autocrlf=true`, so my multi-line edit patterns did not match. The edit script refused to write (all-or-nothing per file), so nothing was half-applied. Fixed with a CRLF-normalising edit helper (scratchpad).
2. **Unreachable condition found by TS** (TS2367) in areEquivalent. Removed it, with a comment; behaviour is unchanged.
3. **The export-shape tool caught a real, if harmless, difference.** `module.exports.parse = (s) => …` gives an anonymous function (`name === ''`); `const parse = …` names it `parse`. I grepped `server/` for any `.name` use on this export: none. Accepted as benign and recorded, rather than adding contorted code to keep an empty name.
4. **Tooling fixes.** `strict-check.sh` with no argument tried to write `/dev/stdout.tmp` (fixed: now uses a temp file). `gate.sh` printed the exit code of `tail` instead of `export-shape.js` (fixed: the real exit code and the differing files are now listed).

## Counts
TS files in scope: **9** / 169 convertible.
