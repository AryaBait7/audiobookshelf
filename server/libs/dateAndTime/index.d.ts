// Type declarations for the vendored date-and-time (minified UMD in index.js), which TS cannot infer.
// Added by the TypeScript migration (workflow-b); runtime code here is unchanged.
// Only the functions the server actually calls are declared (checked by grep: `format` only),
// so TS rejects calls to anything not reviewed here. Signature per date-and-time's format(dateObj, formatString, utc).
declare const date: {
  format(dateObj: Date, formatString: string, utc?: boolean): string
}
export = date
