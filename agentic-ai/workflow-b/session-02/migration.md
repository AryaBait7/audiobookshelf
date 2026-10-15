# Workflow B, session 02: Toolchain + pilot leaves

Plan reference: session-01/migration.md §2 (toolchain) and §5 row 02. The human approved the plan, **including the Dockerfile/CI build-step change**.

## What
1. **Toolchain for in-place CommonJS emit**
   * `tsconfig.build.json`: extends tsconfig.json, `allowJs:false`, `noCheck:true`, emits `server/**/*.ts` (+ `index.ts`/`prod.ts` when they exist) to sibling `.js`.
   * `tsconfig.json`: `useDefineForClassFields:false` (keeps JS assignment semantics for class fields).
   * `package.json` scripts: `build:server`, `build:watch`, `clean:ts`, plus `pretest`, `prestart`, `predev`, `prestart-dev`, `precoverage` (all run `build:server`). `prod`, `build-win` and `build-win-no-compress` now build the server before running or packaging.
   * `build/cleanGeneratedJs.js`: deletes generated `.js` that has a sibling `.ts`, never a git-tracked file.
   * `.gitignore`: a generated-files block with one explicit line per converted file.
2. **Deploy pipeline** (plan §10 decision 2):
   * `Dockerfile` build-server stage: also copies `tsconfig*.json` and `types/`, then runs `npm ci --include=dev && npm run build:server && npm prune --omit=dev`. `--include=dev` is needed because the stage sets `NODE_ENV=production`.
   * `.github/workflows/integration-test.yml` (pkg binary job): `npm ci && npm run build:server && npm prune --omit=dev`; also added `tsconfig*.json` and `types/**` to the path triggers.
   * `build/linuxpackager`: `npm run build:server` after the server `npm ci`.
   * `unit-tests.yml` needs no change, because `npm test` → `pretest` builds.
3. **Verification tools** (`agentic-ai/workflow-b/tools/`): `export-shape.js` (module export shape, base vs current), `emit-diff.js` (token-level diff of the original JS vs the emitted JS), `strict-check.sh` (the measure.sh strict reference config over all converted `.ts` with the pinned tsc, plus directive/any counts).
4. **Pilot conversions (4 files, all with direct tests):** `utils/constants`, `utils/stringifySequelizeQuery`, `utils/requestUtils`, `utils/parsers/parseNfoMetadata`.

## Why these files
They are leaf modules with no first-party imports, each has a direct test, and together they cover the three export shapes the recipe has to handle:
* `module.exports.x = …` sequence (constants);
* `module.exports = fn` (stringifySequelizeQuery);
* `module.exports = { … }` (requestUtils, parseNfoMetadata).

`constants` also has 18 consumers that destructure it, so it exercises JS→TS interop at load time.

## Typing decisions
* constants: each table is `as const` (readonly literal types for TS consumers; no runtime change).
* stringifySequelizeQuery: `findOptions: unknown`; `isClass` is a `func is Function` type guard; one scoped assertion `value as Record<symbol, unknown>` to index by Sequelize `Op` symbols (commented).
* requestUtils: `import type { Request } from 'express'`. The JSDoc said `host: string`, but `req.get('host')` can be `undefined`, so the return type now says `string | undefined` (type-only correction, behaviour unchanged).
* parseNfoMetadata: new `NfoMetadata` interface; `nfoText: string | null | undefined` matches the existing `if (!nfoText) return null` guard.
