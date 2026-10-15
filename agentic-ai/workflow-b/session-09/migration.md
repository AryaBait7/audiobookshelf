# Workflow B, session 09: utils/fileUtils (a hub module)

File: `server/utils/fileUtils` (579 lines; 34 dependants; tests: fileUtils.test, ffmpegHelpers.test, BinaryManager.test, which stubs `fileUtils.isWritable`).
Deviation from plan row 07 (fileUtils + utils/index + 7 more): during investigation of this file I found an export-routing hazard (below) that needed a recipe change and a probe, so this session is fileUtils alone. utils/index has the same hazard and comes next.

## Hazard found: module-level `this`
Several top-level **arrow functions** call `this.shouldIgnoreFile(...)`, `this.downloadFile(...)` and `this.filePathToPOSIX(...)`. In a CommonJS module, top-level `this === module.exports`, so these calls route through the export object, where tests and stubs see them. The plan's `export = { ... }` recipe would replace `module.exports` with a **new** object, and every `this.x` would be `undefined` at runtime. The tests for recurseFiles would probably have caught it, but downloadImageFile → downloadFile has no test.

## Recipe amendment (applies from now on)
For modules that build exports incrementally (`module.exports.x = …`), use **ES named exports** rather than `export =`:
* `module.exports.f = (…) => …` (no local binding; internal use only via `this.f`/`module.exports.f`) → `export const f = …`, with `this.f(…)` → `f(…)`. TS emits references to `export const` bindings as `(0, exports.f)(…)` (verified by probe and in the emitted fileUtils.js), so the routing through the export object is kept.
* `const f = …` / `function f` + `module.exports.f = f` (internal calls are direct) → `export { f }`. TS keeps these references local (probe-verified), which is again identical.
* The emitted module assigns onto the **original** `exports` object (identity kept for require cycles) and adds a non-enumerable `__esModule` flag.
* `export =` stays the rule for `module.exports = X` modules (classes, singletons, functions).
* One routing difference is accepted and documented: `getDirectoriesInPath` used `this.filePathToPOSIX`, while every other caller in the file used the local binding. It now uses the local binding. Nothing stubs `filePathToPOSIX` (grep of test/).

## Other typing decisions
* **axios 0.27** types declare only an ES default export, so `import axios from 'axios'`. At runtime `require('axios').default === require('axios')` (checked: `true`), so `(0, axios_1.default)(…)` calls the same function. The stream response is typed via `.then((response: AxiosResponse<Readable>) => …)`.
* **ssrf-req-filter@1.1.0** has no types: `types/ssrf-req-filter.d.ts` declares exactly what its `lib/index.js` exports (`(url) => http.Agent | https.Agent`, `requestFilterHandler`). It is referenced from the file so the strict reference check sees it too.
* The vendored `recursive-readdir-async` `list()` is compiled TS without typings, so a local `RraListItem` interface describes the items for the options used. `list` held raw items and was then reassigned to the mapped `FilePathItem[]`; the mapped result is now a separate `items` const (same values, same order).
* `getFileTimestampsWithIno(): Promise<FileTimestampsWithIno | false>` is now explicit (see the session 07 finding). `FilePathItem` is an exported interface.
