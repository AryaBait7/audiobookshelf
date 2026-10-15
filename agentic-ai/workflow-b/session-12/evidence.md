# Workflow B, session 12: Evidence

| Command | Result |
|---|---|
| `bash ../migration-evidence/scripts/measure.sh <wt> ../migration-evidence/workflow-b/measurements/final` (12:02:57 to 12:03:21) | exit 0; 39 TS / 145 JS in scope (21.2%); branch tsconfig 0 errors; reference strict 0 errors; checkJs on the remaining JS 4,651 total / 4,056 first-party; npm test 354 passing / 0 failing / 0 pending; smoke 13/13; explicit any 0, `as` assertions 124 |
| checkJs (measure.sh options) on the baseline 184 JS with today's node_modules | 4,746 total / **4,114 first-party** (`measurements/checkjs-baseline-js-with-current-deps.log`) |
| TS emit probe: field initializer + `constructor(x = this.field)` | `useDefineForClassFields:false` → `undefined`; `true` → `[1,2,3]` |
| `git diff --stat 513a0679 -- test` | empty |
| `git worktree remove` of the scratch worktree | done after removing the node_modules junction first (the real node_modules is intact: 373 entries) |
