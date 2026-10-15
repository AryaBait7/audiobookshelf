# Workflow B, session 08: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s08-*`.

## Files converted (4) + 1 revised
server/objects/files/AudioFile.ts, server/objects/DeviceInfo.ts, server/utils/profiler.ts, server/utils/parsers/parseOPML.ts; revised server/objects/files/AudioTrack.ts. `.gitignore` +4.

## Gate (`gate.sh 08 513a0679 <5 files>`)
| Gate | Result |
|---|---|
| build:server | exit 0 |
| typecheck | exit 0, **0 errors** (the first run had 1 project error: `new FileMetadata(data.metadata \|\| {})` TS2345, fixed as described in migration.md) |
| npm test (clean tree) | **354 passing, 0 failing, 0 pending**; 0 baseline titles missing |
| export shape (vs baseline) | **5/5 identical** |
| emit diff | 0/5 token-identical: import layout; `k`/`fields` locals in the key loops; DeviceInfo's static `stringFields` emitted in a `static {}` block (same value, same time); AudioTrack `metadata` local |
| strict reference check | 32 TS files, **0 errors**. The first strict run had 110 errors: 104 from DeviceInfo, which had been renamed but not yet edited, the rest in AudioFile/AudioTrack. All fixed before the gate |
| directives / `any` / `as unknown as` / `!.` | 0 / 0 / 0 / 0 |
| smoke | **13/13**, 0 error lines |

## Problems
* Converting AudioFile made the strict check reach into AudioTrack (converted in session 07), where it found nullable `metadata` uses. Converted files can gain new strict errors when their dependencies become typed, so the strict check is run over **all** TS files every session, not only the new ones.

## Counts
TS files in scope: **32** / 169 convertible.
