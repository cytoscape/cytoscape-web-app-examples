// Bans MUI subpath imports and @mui/icons-material in app sources.
//
// Why this exists (section 5.8, measured): the plugin resolves share keys by
// EXACT match, so with the key '@mui/material' an import of
// '@mui/material/Box' does not match and MUI is bundled into the remote
// instead of coming from the host. Measured on a probe: 67.14 kB of MUI and
// Emotion internals in the exposed chunk versus 0.58 kB with a root-barrel
// import. React and ReactDOM are excluded correctly either way — which is
// exactly why the defect hides. The singleton everyone tests for works, and
// only MUI/Emotion silently duplicate, producing a second Emotion cache:
// duplicated styles and broken theming.
//
// The trailing-slash key ('@mui/material/') is NOT the fix and was rejected on
// measurement: it materializes a share entry per subpath actually referenced,
// and the runtime looks providers up by exact key — so a subpath resolves only
// if the HOST imports it too. 9 of the apps' 20 subpaths are not among the
// host's, and they would fail at USE, not at load.
//
// @mui/icons-material is banned outright: the host does not share it at all,
// and one icon import pulled 148.7 kB of MUI/Emotion internals into the probe's
// exposed chunk. Apps needing an icon can inline an SVG.
//
// Gated on `bundler === 'vite'`. The ~90 offending imports are rewritten with
// each app's migration, so a repo-wide check now would fail on every app by
// construction. It applies to an app in the same commit that fixes it.
//
// Usage:  npm run check:imports [workspaceDir ...]

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { loadManifest, REPO_ROOT } from './manifest.mjs'

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']

const RULES = [
  {
    test: (specifier) => specifier.startsWith('@mui/material/'),
    message:
      "subpath import of @mui/material — use the root barrel: import { X } from '@mui/material'",
  },
  {
    test: (specifier) =>
      specifier === '@mui/icons-material' ||
      specifier.startsWith('@mui/icons-material/'),
    message:
      '@mui/icons-material is not shared by the host and drags MUI + Emotion in behind it — inline an SVG',
  },
]

/**
 * Matches import/export SPECIFIERS, not raw text.
 *
 * A bare grep for '@mui/material/' also hits comments, string literals and
 * documentation — including the design docs that explain this very rule.
 * Covers: `import ... from 'x'`, `import 'x'`, `export ... from 'x'`,
 * `import('x')`, and `require('x')`.
 */
const SPECIFIER_PATTERNS = [
  /\bimport\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
]

const collectSources = (dir) => {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      out.push(...collectSources(full))
    } else if (SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      out.push(full)
    }
  }
  return out
}

const lineOf = (source, index) => source.slice(0, index).split('\n').length

/** @returns {Array<{file: string, line: number, specifier: string, message: string}>} */
export const checkApp = (workspaceDir) => {
  const srcRoot = resolve(REPO_ROOT, workspaceDir, 'src')
  const violations = []

  for (const file of collectSources(srcRoot)) {
    const source = readFileSync(file, 'utf8')
    for (const pattern of SPECIFIER_PATTERNS) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(source)) !== null) {
        const specifier = match[1]
        const rule = RULES.find((r) => r.test(specifier))
        if (rule !== undefined) {
          violations.push({
            file: relative(REPO_ROOT, file),
            line: lineOf(source, match.index),
            specifier,
            message: rule.message,
          })
        }
      }
    }
  }
  return violations
}

const main = () => {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const { apps } = loadManifest()

  const scope = apps.filter(
    (a) =>
      a.bundler === 'vite' &&
      (only.length === 0 || only.includes(a.workspaceDir)),
  )
  for (const app of apps.filter((a) => a.bundler !== 'vite')) {
    if (only.length === 0 || only.includes(app.workspaceDir)) {
      console.log(`- ${app.workspaceDir}: skipped (bundler: ${app.bundler})`)
    }
  }

  if (scope.length === 0) {
    console.log('\nNo Vite apps to check yet.')
    process.exit(0)
  }

  let total = 0
  for (const app of scope) {
    const violations = checkApp(app.workspaceDir)
    total += violations.length
    if (violations.length === 0) {
      console.log(`✓ ${app.workspaceDir}: no banned MUI imports`)
    } else {
      console.error(
        `✗ ${app.workspaceDir}: ${violations.length} banned import(s)`,
      )
      for (const v of violations) {
        console.error(
          `    ${v.file}:${v.line}  '${v.specifier}'\n      ${v.message}`,
        )
      }
    }
  }

  process.exit(total === 0 ? 0 : 1)
}

if (process.argv[1]?.endsWith('check-imports.mjs')) main()
