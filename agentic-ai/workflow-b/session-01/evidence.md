# Workflow B, session 01: Evidence

Type of session: investigation + plan. **No production code changed.**

## Files added
* `agentic-ai/workflow-b/session-01/Investigation.md`
* `agentic-ai/workflow-b/session-01/migration.md` (the plan)
* `agentic-ai/workflow-b/session-01/evidence.md` (this file)
* `agentic-ai/workflow-b/evidence_summary.md`
* `agentic-ai/workflow-b/tools/dep-graph.js`: dependency graph / SCC / level script used for Investigation §3

## Commands run and results

| Command | Result |
|---|---|
| `npm test` | 354 passing, 0 failing, 0 pending (log: `../migration-evidence/workflow-b/session-logs/s01-npm-test.log`) |
| `npm run typecheck` (TS 7.0.2) | exit 0, 0 `error TS` lines (log: `s01-typecheck.log`) |
| `smoke.sh` | 13 pass / 0 fail, 0 server-log error lines (`session-logs/s01-smoke/`) |
| `node agentic-ai/workflow-b/tools/dep-graph.js . <scratch>` | 184 files, one 22-file SCC, 16 levels (L0 to L15) |
| grep surveys (export patterns, dynamic access, JSDoc density, globals) | counts quoted in Investigation §4 and §5 |

## Prototypes (scratchpad only, not in the repo)
Done with the worktree's `node_modules/.bin/tsc` (7.0.2) on a 3-file toy project:
1. `import X = require()` / `export =` / `import type` emit to plain CJS (`const X = require(...)`, `module.exports = ...`). A JS consumer `require()`s the emitted file and gets the right value. **Pass.**
2. A build config with `allowJs:false, noCheck:true` emits next to the source; the type-check config (`allowJs`, noEmit) ignores the generated `.js` when the `.ts` exists (`--listFilesOnly`). **Pass.**
3. A deliberate type error in a `.ts` file fails the type-check config (TS2363, exit 1). **Pass.**
4. `--alwaysStrict false` → `error TS5108: Option 'alwaysStrict=false' has been removed`. **Strict mode cannot be turned off in TS 7.**
5. The default (`target ES2022`) emits `name;` class fields, while `useDefineForClassFields:false` emits only constructor assignments. **Basis for the tsconfig decision.**

## TS file count
0 `.ts` in scope (unchanged).

## Problems
* Heredoc/`sed` escaping on Git Bash for Windows mangled a regex backslash in the graph script. Fixed by editing the file with the Edit tool. It did not affect the results.
