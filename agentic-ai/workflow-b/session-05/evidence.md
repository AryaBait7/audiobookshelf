# Workflow B, session 05: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s05-*`.

## Files converted (5)
server/utils/notifications.ts, server/utils/generators/hlsPlaylistGenerator.ts, server/utils/generators/opmlGenerator.ts, server/utils/parsers/parseFullName.ts, server/utils/parsers/parseNameString.ts.
Also: server/libs/fsExtra/index.d.ts (new), package.json/package-lock.json (`@types/fs-extra@11.0.4`, exact), `.gitignore` (+5).

## Gate (`gate.sh 05 HEAD <5 files>`)
| Gate | Result |
|---|---|
| build:server | exit 0 |
| typecheck | exit 0, **0 errors** |
| npm test (clean tree) | **354 passing, 0 failing, 0 pending**; 0 baseline titles missing |
| export shape | 2/5 identical. Differences, all benign: function `name` `""` → `"generate"`/`"nameToLastFirst"`/`"parse"`; parseFullName is now a `function` declaration (name `parseFullName`, has a `prototype`) instead of an anonymous arrow. Nothing reads these properties (grep) |
| emit diff | 1/5 token-identical; export/import layout for notifications, opml, parseNameString. **parseFullName could not be token-compared**: my tokenizer breaks on the nickname regex, which contains quote characters. Replaced by the differential test below |
| **parseFullName differential test** | `agentic-ai/workflow-b/tools/parseFullName-differential.js`: original JS vs emitted JS over 25 names × 6 `partToReturn` × 7 `fixCase` (including the string `'undefined'`) × 3 `stopOnError` × 2 `useLongLists` = **6,300/6,300 identical** results (incl. thrown errors) |
| strict reference check | 17 TS files, **0 errors** |
| directives / `any` / `as unknown as` / `!.` | 0 / 0 / 0 / 0 |
| smoke | **13/13**, 0 error lines |

## Problems and how they were resolved
1. `fs.writeFile` was not found on the vendored fs-extra (spread exports defeat inference). Fixed with the exact-subset declaration file (see migration.md). I chose not to point TS at the full `@types/fs-extra`, because that would let TS accept `readJson`/`outputFile`, which do not exist in the vendored copy. That would be a hallucinated API that crashes at runtime.
2. TS 7 does not read JS model fields declared as bare `this.x` statements. Worked around with a local structural interface. The real fix comes when the models are converted with `declare` fields.
3. With `nameToParse: unknown`, narrowing was lost after the reassignment in the `else` branch (TS18046 ×4 under strict). Changed the parameter to `string | null | undefined`; the runtime `typeof` guard stays for JS callers.
4. The emit-diff tokenizer has a limitation (regex literals with quotes). Recorded here, and I used a differential test instead of trusting a broken diff.

## Counts
TS files in scope: **17** / 169 convertible.
