// The single loader for apps.manifest.json. Every other consumer imports this
// rather than reading the JSON itself, so there is one place where the schema
// and its invariants live.
//
// Each validation below guards a failure that is otherwise silent. In
// particular copy-dist DELETES directories under docs/, so a typo in
// `publishPath` must not be able to delete something else.
//
// CLI:
//   node scripts/manifest.mjs --validate         print the inventory, exit 0/1
//   node scripts/manifest.mjs --needs-preflight  exit 0 iff any published app
//                                                is on the Vite bundler
//
// See design/specifications/vite-migration/vite-migration.md section 8.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const DOCS_ROOT = resolve(REPO_ROOT, 'docs')

const MANIFEST_PATH = resolve(REPO_ROOT, 'apps.manifest.json')
const ROOT_PACKAGE_PATH = resolve(REPO_ROOT, 'package.json')

// 'webpack' is retained although no app uses it: `bundler` is what Phase 8's
// release check asserts on ("every published app is 'vite'"), and an enum that
// cannot express the wrong answer cannot catch it.
const BUNDLERS = ['webpack', 'vite']

// docs/ is not only a publish target: these are tracked static assets that live
// alongside the app directories. "A single segment inside docs/" does not rule
// them out, and copy-dist deletes its target before copying.
const RESERVED_PUBLISH_PATHS = ['data', 'images', 'index.html']

// federationName, port and configuredShared are NOT here on purpose: they are
// DERIVED from each app's package.json (see deriveFromPackage) rather than
// written twice. Listing one of them is therefore an "unknown field" error,
// which is the point — a hand-written copy is exactly the drift this removes.
const APP_FIELDS = new Set([
  'workspaceDir',
  'publishPath',
  'bundler',
  'published',
  'exposes',
  'smokeObservable',
])

/** Fields the manifest used to carry that are now read from package.json. */
const DERIVED_FIELDS = ['federationName', 'port', 'configuredShared']

const SHARE_FIELDS = new Set(['singleton', 'import', 'requiredVersion'])

class ManifestError extends Error {}

const fail = (message) => {
  throw new ManifestError(message)
}

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Collects duplicates in `values`, reported as a sorted list. */
const duplicatesOf = (values) => {
  const seen = new Set()
  const dupes = new Set()
  for (const value of values) {
    if (seen.has(value)) dupes.add(value)
    seen.add(value)
  }
  return [...dupes].sort()
}

const validatePublishPath = (app) => {
  const { publishPath, workspaceDir } = app
  const where = `apps[${workspaceDir}].publishPath`

  if (typeof publishPath !== 'string' || publishPath === '') {
    fail(`${where}: must be a non-empty string`)
  }
  if (publishPath === '.' || publishPath === '..') {
    fail(`${where}: "${publishPath}" is not a directory name`)
  }
  if (publishPath.includes('/') || publishPath.includes('\\')) {
    fail(`${where}: "${publishPath}" must be a single path segment`)
  }
  if (RESERVED_PUBLISH_PATHS.includes(publishPath)) {
    fail(
      `${where}: "${publishPath}" is a tracked static asset in docs/ — ` +
        `publishing there would delete it`,
    )
  }

  // Belt and braces: assert on the RESOLVED path too. This rules out both
  // "escapes docs/" and "is docs/ itself", whatever the string looked like.
  const resolved = resolve(DOCS_ROOT, publishPath)
  if (dirname(resolved) !== DOCS_ROOT || resolved === DOCS_ROOT) {
    fail(
      `${where}: resolves to ${resolved}, which is not a child of ${DOCS_ROOT}`,
    )
  }
}

const validateShareRecords = (app) => {
  const { configuredShared, workspaceDir } = app
  if (!isPlainObject(configuredShared)) {
    fail(
      `apps[${workspaceDir}].configuredShared: must be an object (use {} for none)`,
    )
  }
  for (const [pkg, record] of Object.entries(configuredShared)) {
    const where = `apps[${workspaceDir}].configuredShared["${pkg}"]`
    if (!isPlainObject(record)) fail(`${where}: must be an object`)
    for (const key of Object.keys(record)) {
      if (!SHARE_FIELDS.has(key)) fail(`${where}: unknown field "${key}"`)
    }
    if (typeof record.singleton !== 'boolean') {
      fail(`${where}.singleton: must be a boolean`)
    }
    if (typeof record.import !== 'boolean') {
      fail(`${where}.import: must be a boolean`)
    }
    if (
      typeof record.requiredVersion !== 'string' ||
      record.requiredVersion === ''
    ) {
      fail(`${where}.requiredVersion: must be a non-empty string`)
    }
  }
}

const validateSmokeObservable = (app) => {
  const { smokeObservable, workspaceDir, published, bundler } = app
  const where = `apps[${workspaceDir}].smokeObservable`

  // Required only once the app is BOTH published and on Vite. The production
  // smoke that consumes it (section 11 step 14) selects on exactly that pair,
  // so requiring it earlier would mean four selectors nobody has ever run —
  // written against components that carry no test hooks yet. Each app gets a
  // real, exercised selector in the commit that migrates it.
  const required = published === true && bundler === 'vite'
  if (smokeObservable === undefined) {
    if (required) {
      fail(
        `${where}: required once an app is published AND on the Vite bundler ` +
          `— the production smoke has nothing to assert without it`,
      )
    }
    return
  }

  if (!isPlainObject(smokeObservable)) fail(`${where}: must be an object`)
  const { kind } = smokeObservable
  if (kind !== 'dom' && kind !== 'console') {
    fail(`${where}.kind: must be "dom" or "console"`)
  }
  if (kind === 'dom') {
    if (
      typeof smokeObservable.selector !== 'string' ||
      smokeObservable.selector === ''
    ) {
      fail(`${where}.selector: required for kind "dom"`)
    }
  } else {
    if (
      typeof smokeObservable.pattern !== 'string' ||
      smokeObservable.pattern === ''
    ) {
      fail(`${where}.pattern: required for kind "console"`)
    }
    try {
      new RegExp(smokeObservable.pattern)
    } catch (cause) {
      fail(
        `${where}.pattern: not a valid regular expression — ${cause.message}`,
      )
    }
  }
  if (
    smokeObservable.setup !== undefined &&
    !Array.isArray(smokeObservable.setup)
  ) {
    fail(`${where}.setup: must be an array when present`)
  }
}

/**
 * Cross-check each requiredVersion against that app's peerDependencies.
 *
 * Vite entries only: no app declares peerDependencies until its migration
 * lands (section 7.3), so this cannot apply earlier. The two are written by
 * hand in two files and nothing else would notice them diverging.
 */
/**
 * Fills in the fields that used to be hand-written, from the app's package.json.
 *
 * `federationName` and `port` come from the `cyweb` block — the same block
 * defineCyWebApp reads, so the manifest cannot disagree with the build.
 *
 * `configuredShared` is expanded from `peerDependencies`, which is already the
 * app's statement of "the host provides these": one record per peer, with the
 * two constant flags. An app with no peers (the non-React example) gets `{}`.
 *
 * This replaces a cross-check rather than removing one. The old code compared
 * the manifest's requiredVersions against peerDependencies — two hand-written
 * copies in one repository. What actually needs checking is whether the app's
 * declared peers match what the SDK really put in the bundle, and that check
 * already exists at the right layer: `verify:federation` compares this derived
 * `configuredShared` against the BUILT output, which came from the SDK's
 * CYWEB_SHARED. A divergence between the two now fails there, with the built
 * artifact as evidence.
 *
 * Reading the SDK's constant directly here was the alternative, and was
 * rejected: it would make `manifest:validate` depend on the SDK having been
 * built, which CI runs as a separate job.
 */
const SHARE_FLAGS = { singleton: true, import: false }

const deriveFromPackage = (app, index) => {
  const { workspaceDir } = app
  if (typeof workspaceDir !== 'string' || workspaceDir === '') {
    fail(`apps[${index}].workspaceDir: must be a non-empty string`)
  }

  const pkgPath = resolve(REPO_ROOT, workspaceDir, 'package.json')
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch (cause) {
    fail(`apps[${workspaceDir}]: cannot read ${pkgPath} — ${cause.message}`)
  }

  const block = pkg.cyweb
  if (!isPlainObject(block)) {
    fail(
      `apps[${workspaceDir}]: ${workspaceDir}/package.json has no "cyweb" block — ` +
        `federationName and port are read from it`,
    )
  }

  app.federationName = block.id
  app.port = block.port
  app.configuredShared = Object.fromEntries(
    Object.entries(pkg.peerDependencies ?? {}).map(([name, range]) => [
      name,
      { ...SHARE_FLAGS, requiredVersion: range },
    ]),
  )
}

const validateApp = (app, index) => {
  if (!isPlainObject(app)) fail(`apps[${index}]: must be an object`)

  for (const key of Object.keys(app)) {
    // An unknown field is usually a typo in a known one, which would otherwise
    // silently take its default.
    // DERIVED_FIELDS are on the object by now — deriveFromPackage put them
    // there. A hand-written copy was already rejected, by name, before
    // derivation ran.
    if (!APP_FIELDS.has(key) && !DERIVED_FIELDS.includes(key)) {
      fail(`apps[${index}]: unknown field "${key}"`)
    }
  }

  const { workspaceDir } = app
  // Derived, but still validated: the values come from package.json, so a bad
  // one is the app author's typo rather than the manifest's, and the message
  // has to say which file to open.
  if (typeof app.federationName !== 'string' || app.federationName === '') {
    fail(
      `apps[${workspaceDir}]: cyweb.id in ${workspaceDir}/package.json must be ` +
        `a non-empty string`,
    )
  }
  if (!Number.isInteger(app.port) || app.port < 1 || app.port > 65535) {
    fail(
      `apps[${workspaceDir}]: cyweb.port in ${workspaceDir}/package.json must ` +
        `be an integer in 1..65535`,
    )
  }
  if (!BUNDLERS.includes(app.bundler)) {
    fail(
      `apps[${workspaceDir}].bundler: must be one of ${BUNDLERS.join(' | ')}`,
    )
  }
  if (typeof app.published !== 'boolean') {
    fail(`apps[${workspaceDir}].published: must be a boolean`)
  }
  if (!Array.isArray(app.exposes) || app.exposes.length === 0) {
    fail(`apps[${workspaceDir}].exposes: must be a non-empty array`)
  }
  for (const key of app.exposes) {
    if (typeof key !== 'string' || !key.startsWith('./')) {
      fail(`apps[${workspaceDir}].exposes: "${key}" must be a "./Name" string`)
    }
  }
  const dupeExposes = duplicatesOf(app.exposes)
  if (dupeExposes.length > 0) {
    fail(`apps[${workspaceDir}].exposes: duplicate ${dupeExposes.join(', ')}`)
  }

  validatePublishPath(app)
  validateShareRecords(app)
  validateSmokeObservable(app)
}

/**
 * Workspaces that are libraries, not apps.
 *
 * `packages/*` is the SDK. It is a workspace so the apps can depend on it and
 * npm links it, but it has no federation name, no port, and nothing to publish
 * to Pages — so it has no manifest entry, and the parity check below must not
 * demand one. Matched as a path prefix rather than by name: a second package
 * should not require editing this file.
 */
const NON_APP_WORKSPACE_PREFIXES = ['packages/']

const isAppWorkspace = (dir) =>
  !NON_APP_WORKSPACE_PREFIXES.some((prefix) => dir.startsWith(prefix))

const validateWorkspaceParity = (apps) => {
  const declared =
    JSON.parse(readFileSync(ROOT_PACKAGE_PATH, 'utf8')).workspaces ?? []
  const inManifest = new Set(apps.map((a) => a.workspaceDir))
  const inWorkspaces = new Set(declared.filter(isAppWorkspace))

  // Both directions. An app in one and not the other is either built but never
  // verified, or verified but never built. Removing an entry is an ERROR, not a
  // cleanup trigger: an absent entry is indistinguishable from a typo, and
  // inferring "unpublish it" from a missing line is how a rename silently
  // unpublishes an app. To retire one, set published:false (copy-dist then
  // removes its docs/ directory), leave the entry for a release, then delete it.
  const missingFromManifest = [...inWorkspaces]
    .filter((d) => !inManifest.has(d))
    .sort()
  const missingFromWorkspaces = [...inManifest]
    .filter((d) => !inWorkspaces.has(d))
    .sort()

  if (missingFromManifest.length > 0) {
    fail(
      `apps.manifest.json is missing entries for workspaces: ` +
        `${missingFromManifest.join(', ')} — add them rather than deleting the workspace`,
    )
  }
  if (missingFromWorkspaces.length > 0) {
    fail(
      `apps.manifest.json lists directories that are not npm workspaces: ` +
        `${missingFromWorkspaces.join(', ')}`,
    )
  }
}

/**
 * Parses and fully validates apps.manifest.json.
 * @returns {{apps: Array<object>}}
 */
export const loadManifest = () => {
  let raw
  try {
    raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  } catch (cause) {
    fail(`cannot read ${MANIFEST_PATH} — ${cause.message}`)
  }

  if (!isPlainObject(raw) || !Array.isArray(raw.apps)) {
    fail('apps.manifest.json: expected { "apps": [...] }')
  }
  for (const key of Object.keys(raw)) {
    if (key !== 'apps' && key !== '$comment') {
      fail(`apps.manifest.json: unknown top-level field "${key}"`)
    }
  }
  if (raw.apps.length === 0) fail('apps.manifest.json: "apps" is empty')

  // A leftover copy of a derived field is caught by name rather than by the
  // generic "unknown field", because the fix is different: delete the line, do
  // not correct it.
  raw.apps.forEach((app, index) => {
    if (!isPlainObject(app)) return
    for (const field of DERIVED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(app, field)) {
        fail(
          `apps[${app.workspaceDir ?? index}].${field}: no longer written here — ` +
            `it is derived from ${app.workspaceDir ?? '<app>'}/package.json ` +
            `(cyweb block and peerDependencies). Remove the line.`,
        )
      }
    }
  })

  raw.apps.forEach(deriveFromPackage)
  raw.apps.forEach(validateApp)

  // Uniqueness across the whole set. workspaceDir matters as much as the rest:
  // two entries pointing at one directory would publish it twice.
  for (const field of [
    'workspaceDir',
    'publishPath',
    'federationName',
    'port',
  ]) {
    const dupes = duplicatesOf(raw.apps.map((a) => a[field]))
    if (dupes.length > 0) {
      fail(`apps.manifest.json: duplicate ${field}: ${dupes.join(', ')}`)
    }
  }

  validateWorkspaceParity(raw.apps)

  return { apps: raw.apps }
}

/** Apps whose dist/ is copied into docs/ by copy-dist. */
export const publishedApps = () =>
  loadManifest().apps.filter((a) => a.published)

/** Apps in scope for the Vite-only checks (verifier, check:imports). */
export const viteApps = () =>
  loadManifest().apps.filter((a) => a.bundler === 'vite')

/**
 * True when at least one PUBLISHED app is built with Vite.
 *
 * This is what made the deploy-time host preflight self-activating during the
 * migration: a Webpack app compiled the host URL in and never read
 * window.__CYWEB_HOST__, so a descriptor-less host could not break it, and
 * gating on it would have blocked deploys over a hazard that did not exist.
 *
 * Every app is on Vite now, so in practice this is true whenever anything is
 * published. It is kept as a predicate rather than hardcoded because that is
 * the actual condition — a Vite app ships a sentinel instead of a fallback and
 * cannot load without the descriptor — and because `bundler` is what Phase 8
 * asserts on.
 */
export const needsHostPreflight = () =>
  loadManifest().apps.some((a) => a.published && a.bundler === 'vite')

const main = () => {
  const args = process.argv.slice(2)

  try {
    if (args.includes('--needs-preflight')) {
      const needed = needsHostPreflight()
      if (!needed) {
        console.log(
          'No published app is on the Vite bundler yet — host preflight not applicable.',
        )
      }
      process.exit(needed ? 0 : 1)
    }

    const { apps } = loadManifest()
    if (args.includes('--validate') || args.length === 0) {
      console.log(
        `apps.manifest.json — ${apps.length} apps, all validations passed\n`,
      )
      const pad = (s, n) => String(s).padEnd(n)
      console.log(
        `  ${pad('workspaceDir', 20)}${pad('federation', 20)}${pad('port', 7)}` +
          `${pad('bundler', 10)}published`,
      )
      for (const a of apps) {
        console.log(
          `  ${pad(a.workspaceDir, 20)}${pad(a.federationName, 20)}${pad(a.port, 7)}` +
            `${pad(a.bundler, 10)}${a.published}`,
        )
      }
      process.exit(0)
    }

    console.error(`Unknown argument. Usage:
  node scripts/manifest.mjs --validate
  node scripts/manifest.mjs --needs-preflight`)
    process.exit(2)
  } catch (cause) {
    if (cause instanceof ManifestError) {
      console.error(`✗ apps.manifest.json: ${cause.message}`)
      process.exit(1)
    }
    throw cause
  }
}

// Only run the CLI when invoked directly, not when imported by another script.
if (process.argv[1] === fileURLToPath(import.meta.url)) main()
