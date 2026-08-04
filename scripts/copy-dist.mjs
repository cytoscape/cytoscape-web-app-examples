// Copies each published app's dist/ into docs/<publishPath> for GitHub Pages.
//
// Replaces a chain of `cp -r <app>/dist docs/<app>`, which had two defects:
// because docs/<app> already existed, cp NESTED the build as
// docs/<app>/dist/ instead of replacing the directory, and stale hashed assets
// from previous builds accumulated alongside the new ones and were served
// indefinitely. The Pages workflow only avoided this by `rm -rf`ing first, so
// the script and the workflow disagreed; both now come through here.
//
// Order matters: validate EVERYTHING, stage into a temp directory, and only
// then swap. A manifest or build error caught on the fourth app must not leave
// docs/ half-emptied.
//
// See design/specifications/vite-migration/vite-migration.md section 8.

import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

import { DOCS_ROOT, loadManifest, REPO_ROOT } from './manifest.mjs'

/**
 * Publish classes for a Vite build. Mutually exclusive and exhaustive, matched
 * in order, with anything unmatched FAILING the copy — a future plugin version
 * must not be able to publish a new file class by default.
 *
 * The SSR entries are matched before the general assets/** rule because they
 * live in assets/ too; an unordered table makes that a precedence puzzle that
 * resolves differently depending on how the loop is written.
 */
const VITE_PUBLISH_CLASSES = [
  // Node-only SSR artifacts (~64 kB/app). Guarded by `typeof window ===
  // 'undefined'`, so none of it can execute in a browser. Section 8 Decision B
  // settles whether to publish them; recorded here as a single flag so the
  // answer is one edit.
  { test: (p) => p === 'remoteEntry.ssr.js', publish: false, why: 'SSR entry' },
  {
    test: (p) => /^assets\/ssrEntryLoader-/.test(p),
    publish: false,
    why: 'SSR loader',
  },
  {
    test: (p) => /^assets\/module-runner-/.test(p),
    publish: false,
    why: 'SSR module runner',
  },
  {
    test: (p) => /^assets\/virtual_mf-exposes-ssr/.test(p),
    publish: false,
    why: 'SSR exposes',
  },

  { test: (p) => p === 'remoteEntry.js', publish: true },
  { test: (p) => p === 'index.html', publish: true, why: 'remote-only stub' },
  { test: (p) => p.startsWith('assets/'), publish: true },

  // Build artifacts the verifier reads. Not published: nothing at runtime
  // fetches them, and they describe the build machine.
  {
    test: (p) => p === 'mf-manifest.json' || p === 'mf-stats.json',
    publish: false,
    why: 'build metadata',
  },
  { test: (p) => p.startsWith('.vite/'), publish: false, why: 'Vite metadata' },
]

const listFilesRecursive = (dir, prefix = '') => {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory())
      out.push(...listFilesRecursive(join(dir, entry.name), rel))
    else out.push(rel)
  }
  return out
}

/**
 * Decides, per file, whether it is published — and refuses anything the table
 * does not name.
 *
 * There used to be an exemption here for Webpack apps, whose output (`main.js`,
 * `152.js`, `src_components_*.js`) matched none of the classes above. Every app
 * builds with Vite now, so the allowlist applies to all of them and an
 * unclassified file is always a failure.
 */
const selectFiles = (app, files) => {
  const keep = []
  const skipped = []
  const unmatched = []

  for (const file of files) {
    const rule = VITE_PUBLISH_CLASSES.find((r) => r.test(file))
    if (rule === undefined) unmatched.push(file)
    else if (rule.publish) keep.push(file)
    else skipped.push(`${file} (${rule.why})`)
  }

  if (unmatched.length > 0) {
    throw new Error(
      `${app.workspaceDir}: dist/ contains files no publish class covers:\n` +
        unmatched.map((f) => `    ${f}`).join('\n') +
        `\n  Classify them in scripts/copy-dist.mjs before publishing. Failing ` +
        `is deliberate — a new plugin version must not publish a new file class by default.`,
    )
  }
  return { keep, skipped }
}

const main = () => {
  const { apps } = loadManifest()
  const published = apps.filter((a) => a.published)
  const unpublished = apps.filter((a) => !a.published)

  if (!existsSync(DOCS_ROOT)) {
    throw new Error(`docs/ not found at ${DOCS_ROOT}`)
  }

  // ---- Validate every app before touching docs/ -----------------------------
  const staged = []
  for (const app of published) {
    const distDir = resolve(REPO_ROOT, app.workspaceDir, 'dist')
    if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
      throw new Error(
        `${app.workspaceDir}: no dist/ — run \`npm run build\` before copy-dist`,
      )
    }
    const files = listFilesRecursive(distDir)
    if (files.length === 0)
      throw new Error(`${app.workspaceDir}: dist/ is empty`)
    staged.push({ app, distDir, ...selectFiles(app, files) })
  }

  // ---- Stage into a temp directory ------------------------------------------
  const stagingRoot = mkdtempSync(join(tmpdir(), 'cyweb-copy-dist-'))
  try {
    for (const { app, distDir, keep } of staged) {
      const target = join(stagingRoot, app.publishPath)
      for (const file of keep) {
        cpSync(join(distDir, file), join(target, file), { recursive: false })
      }
    }

    // ---- Swap ---------------------------------------------------------------
    // Delete then move, so stale hashed assets from an earlier build cannot
    // survive. The manifest loader has already asserted every publishPath
    // resolves to a direct child of docs/ and is not a reserved asset
    // directory, so these deletions are bounded.
    for (const { app, keep, skipped } of staged) {
      const target = resolve(DOCS_ROOT, app.publishPath)
      rmSync(target, { recursive: true, force: true })
      renameSync(join(stagingRoot, app.publishPath), target)
      const note =
        skipped.length > 0 ? ` (${skipped.length} not published)` : ''
      console.log(
        `  ✓ ${app.workspaceDir} → docs/${app.publishPath}  ${keep.length} files${note}`,
      )
      for (const s of skipped) console.log(`      - ${s}`)
    }

    // An app that has been un-published must actually stop being published,
    // rather than freezing its last build on the CDN forever.
    for (const app of unpublished) {
      const target = resolve(DOCS_ROOT, app.publishPath)
      if (existsSync(target)) {
        rmSync(target, { recursive: true, force: true })
        console.log(`  ✓ removed docs/${app.publishPath} (published: false)`)
      }
    }
  } finally {
    rmSync(stagingRoot, { recursive: true, force: true })
  }

  console.log(
    `\n✓ published ${staged.length} app(s) into ${relative(REPO_ROOT, DOCS_ROOT)}/`,
  )
}

try {
  main()
} catch (cause) {
  console.error(`✗ copy-dist: ${cause.message}`)
  process.exit(1)
}
