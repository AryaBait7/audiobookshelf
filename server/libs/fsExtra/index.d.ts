// Type declarations for the vendored fs-extra subset in this folder (index.js).
// Added by the TypeScript migration (workflow-b); runtime code here is unchanged.
// Based on @types/fs-extra 11.0.4 minus the fs-extra modules that are NOT vendored
// here (json/*, output-file/*), so TS rejects calls that would fail at runtime.
import fse = require('fs-extra')

type NotVendored =
  | 'outputFile'
  | 'outputFileSync'
  | 'outputJSON'
  | 'outputJSONSync'
  | 'outputJson'
  | 'outputJsonSync'
  | 'readJSON'
  | 'readJSONSync'
  | 'readJson'
  | 'readJsonSync'
  | 'writeJSON'
  | 'writeJSONSync'
  | 'writeJson'
  | 'writeJsonSync'

declare const fsExtra: Omit<typeof fse, NotVendored>
export = fsExtra
