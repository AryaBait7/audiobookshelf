# Workflow B, session 13: Evidence

Logs: `../migration-evidence/workflow-b/session-logs/s13-*`.

## Files converted (6)
server/models/{Session, LibraryFolder, CollectionBook, BookAuthor, BookSeries, PlaylistMediaItem}.ts. Also: types/shared.d.ts (+`AbsSequelize`), tools/model-shadow-check.js, gate.sh (model check step), `.gitignore` +6.

## Probes
| Probe | Result |
|---|---|
| `static init(sequelize: Sequelize): void` override (strict) | TS2417: class static side incompatible with `typeof Model` |
| Same + overload `init(this: never, attributes: never, options: never): never` | compiles (strict); calling `V2.init({} as never, {} as never)` → TS2684 |
| Runtime: Session/LibraryFolder init on in-memory SQLite, `create`, `createSession`, `cleanupExpiredSessions` | no own attribute keys; getters return the stored values; association FK set |
| `typeof require('sequelize').Sequelize.prototype.uppercaseFirst` | `undefined` (patched per instance in Database.js line 241) |
| model-shadow-check negative test (`Object.defineProperty(this, 'ipAddress', …)` in the built Session.js) | `FAIL Session … shadowed=[ipAddress]`, `5/6`; after rebuilding: 6/6 |

## Gate (`gate.sh 13 513a0679 <6 files>`)
| Gate | Result |
|---|---|
| build:server | exit 0 |
| typecheck | exit 0, **0 errors** |
| npm test (clean tree) | **354 passing, 0 failing, 0 pending**; 0 baseline titles missing |
| export shape (vs baseline) | **6/6 identical** (the constructors were kept, so `length` is unchanged) |
| model-shadow-check | **6/6 TS models OK** |
| emit diff | import layout, removed no-op `this.x` reads, PlaylistMediaItem `dataValues` local |
| strict reference check | 45 TS files, **0 errors** |
| directives / `any` / `as unknown as` / `!.` | 0 / 0 / 0 / 0 |
| smoke | **13/13**, 0 error lines (the server builds all 25 models at start-up) |

## Counts
TS files in scope: **45** / 169 convertible.
