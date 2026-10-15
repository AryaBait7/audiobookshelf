/**
 * Emit diff: token-level comparison of the original JS (at <base-rev>) with the
 * tsc-emitted JS for the same path. Comments, whitespace, semicolons and the
 * "use strict" prologue are ignored, so what remains are real code differences
 * (expected: only export/import shape changes).
 *
 * Usage: node agentic-ai/workflow-b/tools/emit-diff.js <base-rev> <path/to/module.js>...
 */
const fs = require('fs')
const os = require('os')
const Path = require('path')
const { execFileSync, spawnSync } = require('child_process')

const root = Path.join(__dirname, '..', '..', '..')
const [baseRev, ...files] = process.argv.slice(2)

function tokens(src) {
  const noBlock = src.replace(/\/\*[\s\S]*?\*\//g, '')
  const lines = noBlock.split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l))
  const text = lines.join('\n').replace(/^\s*["']use strict["'];?/, '')
  // identifiers, numbers, strings/regex chars and punctuation, one per line; drop ';'
  return (text.match(/[A-Za-z_$][\w$]*|\d+(\.\d+)?|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\S/g) || []).filter((t) => t !== ';').map((t) => (t.startsWith('"') && !t.includes("'") ? `'${t.slice(1, -1)}'` : t))
}

const tmp = fs.mkdtempSync(Path.join(os.tmpdir(), 'emitdiff-'))
let changed = 0
for (const rel of files) {
  const relPosix = rel.split(Path.sep).join('/')
  const base = execFileSync('git', ['show', `${baseRev}:${relPosix}`], { cwd: root, encoding: 'utf8' })
  const cur = fs.readFileSync(Path.join(root, relPosix), 'utf8')
  const a = Path.join(tmp, 'a.txt')
  const b = Path.join(tmp, 'b.txt')
  fs.writeFileSync(a, tokens(base).join('\n') + '\n')
  fs.writeFileSync(b, tokens(cur).join('\n') + '\n')
  const res = spawnSync('diff', ['-U2', a, b], { encoding: 'utf8' })
  if (res.status === 0) {
    console.log(`IDENTICAL-TOKENS  ${relPosix}`)
  } else {
    changed++
    const body = res.stdout.split('\n').slice(2).filter((l) => !l.startsWith('@@')).join(' ')
    console.log(`TOKEN-DIFF  ${relPosix}\n  ${body.replace(/\s+/g, ' ').slice(0, 2000)}`)
  }
}
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`emit-diff: ${files.length - changed}/${files.length} token-identical (differences listed above must be export/import shape only)`)
