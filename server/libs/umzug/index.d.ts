// Type declarations for the vendored umzug (compiled JS whose index re-exports via __exportStar, which TS
// cannot follow). Added by the TypeScript migration (workflow-b); runtime code here is unchanged.
// Only the exports used by TS code are declared; their types are inferred from the compiled sub-modules.
export { Umzug, MigrationError } from './umzug'
export { SequelizeStorage } from './storage/sequelize'
