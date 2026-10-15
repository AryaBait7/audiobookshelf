# Workflow B, session 13: Models pilot (Sequelize `declare` + `static init` pattern)

Resumed after Arya's second, detailed approval of the plan's §10 defaults (relayed by the parent session at 12:07; recorded in run-log.md, intervention 2).
Files: `models/Session`, `models/LibraryFolder`, `models/CollectionBook`, `models/BookAuthor`, `models/BookSeries`, `models/PlaylistMediaItem` (6 leaf models, 625 lines). This is plan row 12, as planned.

## Deviation from plan order
Plan rows 08 to 10 (xml2js parsers, providers, settings objects) are still partly open. I tried row 08 first and moved on after reading parseOpfMetadata: the xml2js-based parsers need a shared, honest xml2js node type, which I'd rather design once for all of them. The models pilot is the main open design risk in the plan (Investigation §5.1). Its files are dependency leaves, so moving it earlier breaks no ordering rule.

## The pattern (now part of the recipe for every model)
```ts
class Session extends Model<InferAttributes<Session>, InferCreationAttributes<Session>> {
  declare id: CreationOptional<string>     // attributes: `declare` only, so no emitted field shadows the Sequelize getters
  declare userId: ForeignKey<string>        // added by an association
  declare user?: NonAttribute<User>         // expanded/included associations
  constructor(values?, options?) { super(values, options) }   // kept so Function.length stays 2 (export-shape)
  static init(sequelize: Sequelize): void
  static init(this: never, attributes: never, options: never): never   // see below
  static init(sequelize: Sequelize): void { super.init({...}, { sequelize, modelName }) ... }
}
```
* **`static init(sequelize)` vs Sequelize's `Model.init(attributes, options)`:** a plain override fails with TS2417 (the class static side is incompatible). Probed alternatives: the second overload reproduces Sequelize's signature with `this: never`, so the static side is assignable (bivariant method check), while **any call in Sequelize's style fails to compile** (probe: TS2684). This avoids `any`, avoids a lying callable overload, and leaves runtime unchanged (overloads are erased).
* The old constructor bodies were bare `/** @type */ this.x` statements, which only read getters. They are removed; the constructor itself stays. A probe confirmed that these JSDoc declarations are invisible to TS 7 anyway (session 05).
* Typed creation attributes: `Session.create({ userId, ipAddress, userAgent, refreshToken, expiresAt })` now type-checks against `InferCreationAttributes`. The JSDoc had omitted `refreshToken`, which is a real attribute.
* **`AbsShared.AbsSequelize`** (added to types/shared.d.ts) describes `uppercaseFirst()`, which `Database.connect()` patches onto the Sequelize instance. It does **not** exist on `Sequelize.prototype` (checked at runtime). PlaylistMediaItem calls association mixins (`getBook`/`getPodcastEpisode`) through a typed `this & Record<string, …>` view.
* BookAuthor `getCountsForAuthors` uses `raw: true`, which sequelize's `findAll` type does not model. It has one commented downcast `as (BookAuthor & { count })[]`. A first draft used `as unknown[] as …`; I replaced it as a disguised double cast.

## New verification tool
`tools/model-shadow-check.js` initialises all 25 models in `Database.buildModels()` order on in-memory SQLite. For every TS model it checks: no own property named like an attribute, and an attribute write/read round-trips through `dataValues`. It is wired into `gate.sh`. Negative test: an `Object.defineProperty` shadow (what a define-semantics class field does) is reported as FAIL, and Sequelize itself prints its "class fields are shadowing" warning. A plain assignment does not shadow (it goes through the setter), which is why the check simulates define semantics.
