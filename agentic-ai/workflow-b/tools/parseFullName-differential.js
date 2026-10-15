// Differential test (session 05): original JS parseFullName (copied to server/utils/parsers/__base_pfn.js via `git show <base>:...`) vs the emitted TS build.
const base = require(process.cwd() + '/server/utils/parsers/__base_pfn.js')
const cur = require(process.cwd() + '/server/utils/parsers/parseFullName.js')
const names = ['', null, undefined, 42, 'John Smith', 'smith, john', 'JOHN SMITH', 'Dr. John Q. Public Jr.', 'Mr John "Johnny" Smith III', 'Smith, John, Jr., MD', 'Ludwig von Mises', 'Jean de la Fontaine', 'Mary & John Smith', "O'Brien, Conan (Coco)", 'Prof Sir Isaac Newton PhD', 'a b c d e', 'McDONALD ronald', 'Smith, Jon, Smith, Jane', ' , ', 'J. R. R. Tolkien', 'van der Berg, Anna', 'Sr. Juan y Maria', 'Mr. Mrs. X', 'X Jr Sr', "John 'J' [JJ] Smith"]
const parts = [undefined, 'all', 'first', 'LAST', 'error', 'bogus']
const flags = [undefined, true, false, 0, 1, -1, 'undefined']
let n = 0, bad = 0
for (const nm of names) for (const p of parts) for (const fc of flags) for (const se of [undefined, false, true]) for (const ll of [undefined, true]) {
  n++
  const run = (f) => { try { return JSON.stringify(f(nm, p, fc, se, ll)) } catch (e) { return 'THROW ' + String(e) } }
  const a = run(base), b = run(cur)
  if (a !== b) { bad++; if (bad < 5) console.log('MISMATCH', JSON.stringify([nm, p, fc, se, ll]), a, b) }
}
console.log(`parseFullName differential: ${n - bad}/${n} identical`)
