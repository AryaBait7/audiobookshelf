# Workflow B, session 06: Logger + L0 objects

Files: `server/Logger` (fan-in 101, 16 test files touch it), `objects/Task`, `objects/Backup`, `objects/Notification`, `objects/TrackProgressMonitor` (direct test), `objects/metadata/FileMetadata`. 6 files, about 710 lines.
Deviation from the plan table: row 05 paired Logger with L1 leaves, which were converted in sessions 04 and 05. Logger goes with the L0 objects instead. `AudioMetaTags`/`MediaProbeData` and the `files/*` objects go to session 07.

## New typing infrastructure
* **`server/libs/dateAndTime/index.d.ts`:** the vendored date-and-time is minified UMD, inferred as `{ res: any }`, so `date.format` did not exist for TS. The declaration covers **only `format`**, the only function the server calls (grep: 22 calls). Its arity was checked against the runtime (`format.length === 3`). Undeclared functions are rejected by TS, not guessed.
* **`@types/uuid@8.3.4`** (exact; matches the installed `uuid@8.3.2`). Finding, not fixed (unrelated to the migration): `uuid` is **not a declared dependency** of the server; it is only installed transitively via `sequelize` and `nyc`.
* **`/// <reference path=".../types/*.d.ts" />`** in Logger (uses the `isWin` global) and Task (uses `AbsShared`). The project tsconfig already includes `types/**`, but the strict reference check in `measure.sh` compiles only the in-scope files, so these globals were invisible to it (TS7017, TS2503). The reference directive declares the dependency explicitly. It is not a suppression.

## Typing decisions
* **Logger:**
  * `logManager: LogManager | null` via `import type LogManager = require(...)` (no new runtime edge; LogManager → Logger already exists at runtime);
  * `SocketListener` uses `Socket` from socket.io (types bundled with the package);
  * log args are `unknown[]`: the JSDoc said `string[]`, but the code `util.inspect`s non-strings;
  * `ConsoleMethods` is `as const`, so `console[consoleMethod]` is typed;
  * `LogLevelName = keyof typeof LogLevel`;
  * `Error().stack as string` (V8 always sets it; commented).
* **Task:** typed against the shared `AbsShared.TaskJSON`/`TaskString` from the foundation commit. `data` is `Record<string, unknown> | null`. **Finding:** `setFailed()` writes `this.failedAt`, which the constructor never initialises and `toJSON()` never serialises. It is declared as optional `failedAt?: number`, and behaviour is unchanged.
* **Backup:** `BackupData` interface. `if (this.key == 1)` (string key vs number, TS2367) → `if (Number(this.key) === 1)`. For a string/null/undefined left operand, `x == 1` is defined as `ToNumber(x) === 1`, so the result is identical. Commented.
* **Notification:** `NotificationJSON`, the `UpdatableKey` union, and `TemplateData`.
  * `update()` writes through a typed writable view (`this as Record<UpdatableKey, unknown>`) instead of `this[key]`.
  * `replace(match[0], data[key])` → `replace(match[0], String(data[key]))`. `String.prototype.replace` already applies ToString to a non-function replacement, so this is identical for the string/number values used.
* **TrackProgressMonitor:** the JSDoc `@callback`s became type aliases. `currentTrackProgress?` is declared optional because it is first assigned in `#outsideCurrentTrack`; there is one commented `as number` where `update()` guarantees it was set.
* **FileMetadata:** `FileMetadataJSON`. The `update`/`setData` key loops use the same writable-view pattern. Unknown keys are still skipped by the runtime `!== undefined` check.
