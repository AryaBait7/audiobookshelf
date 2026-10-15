# Workflow B, session 03: Remaining L0 pure utils (pilot 2)

Plan row 03, as planned. Five leaf modules with no first-party imports except the vendored `libs/uaParser`:
`utils/areEquivalent`, `utils/globals`, `utils/longTimeout`, `utils/parsers/parseSeriesString`, `utils/parsers/parseUserAgent`.
Batch size: 5 files, 386 lines, within the pilot limit (≤5 files, ≤600 lines).

## Why
They are the remaining pure L0 utils. The modules that consume them (utils/index, BookScanner, ShareManager, CoverManager, LibraryFile, MeController, AudioFileScanner, abmetadataGenerator) come in later batches, so converting these first gives those batches real types.

## Typing decisions
* **areEquivalent:** deep equality over arbitrary values, so `value1/value2: unknown`, `stack: unknown[]`. There are three kinds of scoped assertion, each commented:
  * `isNaN(x as number)`: `isNaN` deliberately coerces its argument;
  * `(x as Function).toString()`;
  * `Record<string, unknown>` for the final object case.
  
  TS found one **unreachable condition**: `type1 === 'function'` in the fast-fail branch can never be true, because function values already returned earlier (TS2367, which the project's non-strict typecheck also reports). I removed it with a comment. Behaviour is unchanged because the condition was always false there.
* **globals:** `export = globals`. The inferred `string[]` fields are enough.
* **longTimeout:** declared fields `timeout: number`, `timer: NodeJS.Timeout | null`. `clearTimeout(this.timer)` → `clearTimeout(this.timer ?? undefined)`, because @types/node does not accept `null`. Behaviour is unchanged: both are no-ops in Node.
* **parseSeriesString:** the parameter is `unknown`, because the function itself checks `typeof seriesString !== 'string'`. The return type is `{ name: string; sequence: string | null } | null`; the JSDoc had claimed `sequence: string`.
* **parseUserAgent:** new `UserAgentDeviceInfo` interface. The vendored UMD `libs/uaParser` is inferred as `(ua: any, extensions: any) => any` (checked with a throw-away probe file). That `any` comes from the out-of-scope lib, and the result is immediately typed through the interface. `for…in` keys are narrowed with `key as keyof UserAgentDeviceInfo`.
