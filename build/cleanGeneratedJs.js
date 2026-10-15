/**
 * Deletes .js files that tsc generated next to a .ts source (see tsconfig.build.json).
 * Tracked .js files are never deleted.
 */
const fs = require('fs')
const Path = require('path')
const { execSync } = require('child_process')

const root = Path.join(__dirname, '..')

let tracked = new Set()
try {
  tracked = new Set(execSync('git ls-files', { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean))
} catch {
  // Not a git checkout (e.g. docker build context); nothing is tracked
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = Path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (full !== Path.join(root, 'server', 'libs')) walk(full)
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      removeSibling(full)
    }
  }
}

function removeSibling(tsPath) {
  const jsPath = tsPath.slice(0, -3) + '.js'
  const rel = Path.relative(root, jsPath).split(Path.sep).join('/')
  if (fs.existsSync(jsPath) && !tracked.has(rel)) {
    fs.unlinkSync(jsPath)
    console.log('removed', rel)
  }
}

walk(Path.join(root, 'server'))
for (const entry of ['index.ts', 'prod.ts']) {
  if (fs.existsSync(Path.join(root, entry))) removeSibling(Path.join(root, entry))
}
