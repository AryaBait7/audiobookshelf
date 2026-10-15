# Workflow B, session 07: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s07-*`.

## Files converted (5) + 1 revised
Converted: server/objects/metadata/AudioMetaTags.ts, server/objects/files/AudioTrack.ts, server/objects/files/EBookFile.ts, server/objects/files/LibraryFile.ts, server/scanner/MediaProbeData.ts. Revised: server/objects/metadata/FileMetadata.ts. `.gitignore` +5.

## Gate (`gate.sh 07 ...`)
| Gate | Result |
|---|---|
| build:server | exit 0 |
| typecheck | exit 0, **0 errors** |
| npm test (clean tree) | **354 passing, 0 failing, 0 pending**; 0 baseline titles missing |
| export shape (base 513a0679) | **6/6 identical** (including the revised FileMetadata) |
| emit diff (base 513a0679) | AudioTrack, EBookFile token-identical; AudioMetaTags/MediaProbeData/FileMetadata differ only by the `k`/`fields` locals of the key loops; LibraryFile by the import layout and one `metadata` local in the `fileType` getter |
| strict reference check | 28 TS files, **0 errors** |
| directives / `any` / `as unknown as` / `!.` | 0 / 0 / 0 / 0 |
| smoke | **13/13**, 0 error lines |

## Problems and how they were resolved
1. **I nearly changed behaviour myself.** In a first draft of `EBookFile.updateFromLibraryFile` I passed `libraryFile.metadata.toJSON()` instead of `libraryFile.metadata` to satisfy a parameter type. That would drop `wasModified` from the keys `FileMetadata.update()` iterates. I caught it on review before running anything and reverted it. The type was fixed at the callee instead (widened `FileMetadataPayload`).
2. Strict errors: TS2352 (shared `LibraryFileJSON.metadata` is `Record<string, any>`) and TS2345/TS2339 (`false | {...}` from `getFileTimestampsWithIno`). Fixed with precise `toJSON` types and one documented assertion (see the finding in migration.md).
3. **Tooling.** `gate.sh` was given `HEAD` as base, but FileMetadata's original JS is no longer at HEAD (converted in session 06), so `export-shape`/`emit-diff` crashed. I re-ran both against the baseline commit `513a0679` (results above; the summary file is annotated). From now on, the gate is run with base `513a0679`.
4. TS 7 probe: a class instance cannot be asserted to `Record<string, unknown>` (TS2352: no index signature). That is why the writable views use `Record<KnownKeys, unknown>`.

## Counts
TS files in scope: **28** / 169 convertible.
