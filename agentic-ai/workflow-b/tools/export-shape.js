/**
 * Export-shape check: compares what `require()` returns for a module at a base
 * revision (the original JS) against the current (tsc-emitted) JS.
 *
 * Usage: node agentic-ai/workflow-b/tools/export-shape.js <base-rev> <path/to/module.js>...
 * Run `npm run build:server` first. Exit code 1 if any shape differs.
 *
 * The base version is written to a temporary sibling file so its relative
 * requires resolve exactly as the original did, and deleted afterwards.
 */
const fs = require('fs')
const Path = require('path')
const { execFileSync } = require('child_process')

const root = Path.join(__dirname, '..', '..', '..')
const [baseRev, ...files] = process.argv.slice(2)
if (!baseRev || !files.length) {
  console.error('usage: export-shape.js <base-rev> <file.js>...')
  process.exit(2)
}

function describeValue(v) {
  if (typeof v === 'function') {
    const isClass = /^class[\s{]/.test(Function.prototype.toString.call(v))
    const proto = v.prototype ? Object.getOwnPropertyNames(v.prototype).sort() : []
    const statics = Object.getOwnPropertyNames(v)
      .filter((k) => !['length', 'name', 'prototype', 'arguments', 'caller'].includes(k))
      .sort()
    return { type: isClass ? 'class' : 'function', name: v.name, length: v.length, proto, statics }
  }
  if (v && typeof v === 'object') {
    const protoNames = []
    let p = Object.getPrototypeOf(v)
    while (p && p !== Object.prototype) {
      protoNames.push(...Object.getOwnPropertyNames(p))
      p = Object.getPrototypeOf(p)
    }
    return { type: Array.isArray(v) ? 'array' : 'object', ctor: v.constructor?.name, ownKeys: Object.keys(v).sort(), protoMembers: [...new Set(protoNames)].sort() }
  }
  return { type: typeof v, value: v }
}

function describeModule(exp) {
  const top = describeValue(exp)
  const members = {}
  if (exp && (typeof exp === 'object' || typeof exp === 'function')) {
    for (const k of Object.keys(exp).sort()) members[k] = describeValue(exp[k])
  }
  return { top, members }
}

let failed = 0
for (const rel of files) {
  const relPosix = rel.split(Path.sep).join('/')
  const abs = Path.join(root, relPosix)
  const tmp = abs.replace(/\.js$/, '.__shape_base__.js')
  let base, cur
  try {
    const src = execFileSync('git', ['show', `${baseRev}:${relPosix}`], { cwd: root, encoding: 'utf8' })
    fs.writeFileSync(tmp, src)
    base = JSON.stringify(describeModule(require(tmp)), null, 1)
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
  }
  cur = JSON.stringify(describeModule(require(abs)), null, 1)
  if (base === cur) {
    console.log(`SAME  ${relPosix}`)
  } else {
    failed++
    console.log(`DIFF  ${relPosix}\n--- base\n${base}\n--- current\n${cur}`)
  }
}
console.log(`export-shape: ${files.length - failed}/${files.length} identical`)
process.exit(failed ? 1 : 0)
