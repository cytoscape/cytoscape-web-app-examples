// Build-output verifier for the Module Federation contract (section 11.0).
//
// Verifies on PAYLOAD, not on config. Every failure this guards against looks
// correct in vite.config.ts: a share block that reads right while MUI is
// bundled locally, a `cyweb` remote that silently resolves no exports because
// `type` defaulted to 'var', a runtime plugin copied but never registered.
// Only the emitted bundle distinguishes them.
//
// Runs per app, gated on `bundler === 'vite'`. A Webpack bundle fails the ESM
// assertion by construction — that is the section 2 regression check working as
// designed, not a reason to loosen it — so Webpack apps are skipped entirely
// until the commit that migrates them flips one manifest field.
//
// Usage:  npm run verify:federation            all Vite apps
//         npm run verify:federation -- hello   one app, by workspaceDir
//
// The mf-manifest.json shape below was read off a real build of the section 5.5
// canonical config (@module-federation/vite 1.16.8), not inferred:
//   id, name                    container name
//   metaData.remoteEntry        { name, path, type } for THIS app's entry
//   exposes[]                   { name: "AppConfig", path: "./AppConfig" }
//   shared[]                    { name, version, singleton, requiredVersion, assets }
//   remotes[]                   { federationContainerName, moduleName, alias, entry }
//                               — carries NO `type`, which is why the config
//                                 embeds configuredRemote via additionalData
//   configuredShared / configuredRemote / configuredRuntimePlugins  (top level)

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { loadManifest, REPO_ROOT } from './manifest.mjs'

/** Must match src/cywebHostSentinel.ts in every app, and the host's fixture. */
const CYWEB_HOST_REQUIRED = 'cyweb:__CYWEB_HOST_REQUIRED__'

const HOST_REMOTE_NAME = 'cyweb'
const RUNTIME_PLUGIN_NAME = 'cyweb-host-resolver'

/**
 * Share keys the plugin derives on its own, which may appear in the EFFECTIVE
 * shared list without being configured.
 *
 * Measured: `react/jsx-runtime` appears as soon as any JSX is in the module
 * graph, and not before — which is why the effective list cannot simply be
 * compared for equality against the five configured keys. The other two are
 * their dev-build and react-dom counterparts. A named constant so an
 * unexplained sixth key is a failure rather than a shrug.
 */
const DERIVED_SHARED_ALLOWLIST = [
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/client',
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

const sameShareRecord = (configured, expected) =>
  configured !== undefined &&
  configured.singleton === expected.singleton &&
  configured.import === expected.import &&
  configured.requiredVersion === expected.requiredVersion

/**
 * Verifies one built app.
 * @param {{workspaceDir: string, federationName: string, exposes: string[], configuredShared: object}} app
 * @param {string} distDir
 * @returns {{checks: string[], failures: string[]}}
 */
export const verifyApp = (app, distDir) => {
  const checks = []
  const failures = []
  const check = (label, ok, detail = '') => {
    if (ok) checks.push(label)
    else failures.push(detail === '' ? label : `${label} — ${detail}`)
  }

  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    return {
      checks,
      failures: [`no dist/ at ${distDir} — run the build first`],
    }
  }

  // ── 1. remoteEntry.js is an ES module exposing the container contract ──────
  const remoteEntryPath = join(distDir, 'remoteEntry.js')
  if (!existsSync(remoteEntryPath)) {
    return { checks, failures: ['remoteEntry.js missing from dist/'] }
  }
  const remoteEntrySrc = readFileSync(remoteEntryPath, 'utf8')

  // A Webpack `var` library starts `var <name>;(()=>{...` and exports nothing
  // through the module namespace, so the host's `type: 'module'` loader reads
  // no init/get from it and the remote fails to register — silently.
  check(
    'remoteEntry.js is not a Webpack `var` library',
    !/^\s*var\s+\w+\s*;/.test(remoteEntrySrc),
    'looks like a classic var-library bundle',
  )
  check('remoteEntry.js exports `init`', /\bas init\b/.test(remoteEntrySrc))
  check('remoteEntry.js exports `get`', /\bas get\b/.test(remoteEntrySrc))

  // ── 2. mf-manifest.json ────────────────────────────────────────────────────
  const manifestPath = join(distDir, 'mf-manifest.json')
  if (!existsSync(manifestPath)) {
    failures.push(
      'mf-manifest.json missing — vite.config.ts must set federation({ manifest: { additionalData } })',
    )
    return { checks, failures }
  }
  const mf = JSON.parse(readFileSync(manifestPath, 'utf8'))

  check(
    `container name is "${app.federationName}"`,
    mf.name === app.federationName,
    `manifest says "${mf.name}"`,
  )
  check(
    'this app emits an ESM remoteEntry',
    mf.metaData?.remoteEntry?.type === 'module',
    `metaData.remoteEntry.type = ${JSON.stringify(mf.metaData?.remoteEntry?.type)}`,
  )

  // ── 3. Exposes ─────────────────────────────────────────────────────────────
  const exposedPaths = new Set((mf.exposes ?? []).map((e) => e.path))
  for (const expected of app.exposes) {
    check(`expose present: ${expected}`, exposedPaths.has(expected))
  }
  const unexpected = [...exposedPaths].filter((p) => !app.exposes.includes(p))
  check(
    'no undeclared exposes',
    unexpected.length === 0,
    `manifest exposes ${unexpected.join(', ')} which apps.manifest.json does not list`,
  )

  // ── 4. Shared: configured exactly, effective a superset ────────────────────
  // Two different things, and conflating them fails a CORRECT build: the
  // plugin derives keys the config never named (see DERIVED_SHARED_ALLOWLIST).
  const configured = mf.configuredShared
  if (configured === undefined) {
    failures.push(
      'mf-manifest.json has no configuredShared — additionalData is not wired',
    )
  } else {
    for (const [pkg, expected] of Object.entries(app.configuredShared)) {
      check(
        `configured share: ${pkg}`,
        sameShareRecord(configured[pkg], expected),
        `manifest ${JSON.stringify(configured[pkg])} != manifest-file ${JSON.stringify(expected)}`,
      )
    }
    const extraConfigured = Object.keys(configured).filter(
      (k) => !(k in app.configuredShared),
    )
    check(
      'no unexpected configured shares',
      extraConfigured.length === 0,
      `build declares ${extraConfigured.join(', ')}`,
    )
  }

  const effective = (mf.shared ?? []).map((s) => s.name)
  for (const pkg of Object.keys(app.configuredShared)) {
    check(`effective share present: ${pkg}`, effective.includes(pkg))
  }
  const unexplained = effective.filter(
    (name) =>
      !(name in app.configuredShared) &&
      !DERIVED_SHARED_ALLOWLIST.includes(name),
  )
  check(
    'no unexplained effective shares',
    unexplained.length === 0,
    `${unexplained.join(', ')} — neither configured nor a known derived key`,
  )

  // ── 5. The cyweb remote ────────────────────────────────────────────────────
  // Asserted against configuredRemote: the native `remotes[]` records the entry
  // string under `federationContainerName` and carries no `type` at all, so it
  // cannot answer the question that matters most here.
  const remote = mf.configuredRemote
  if (remote === undefined) {
    failures.push(
      'mf-manifest.json has no configuredRemote — additionalData is not wired',
    )
  } else {
    check(
      `cyweb remote name`,
      remote.name === HOST_REMOTE_NAME,
      JSON.stringify(remote.name),
    )
    check(
      "cyweb remote is type: 'module'",
      remote.type === 'module',
      `type = ${JSON.stringify(remote.type)} — the plugin default 'var' resolves ` +
        'no exports against the ESM host and fails silently',
    )
    check(
      'production build ships the sentinel, not a localhost URL',
      remote.entry === CYWEB_HOST_REQUIRED,
      `entry = ${JSON.stringify(remote.entry)}`,
    )
  }
  check(
    'cyweb declared as a remote in the manifest',
    (mf.remotes ?? []).some((r) => r.alias === HOST_REMOTE_NAME),
  )

  // ── 6. The runtime plugin is REGISTERED, not merely present on disk ────────
  // In the bundle, not only in the manifest: a config can name a runtimePlugins
  // path that the build never actually wires in, and then the app silently
  // falls back to its compiled-in entry.
  check(
    `${RUNTIME_PLUGIN_NAME} is in the built remoteEntry`,
    remoteEntrySrc.includes(RUNTIME_PLUGIN_NAME),
    'the resolver was not registered — runtimePlugins is missing or wrong',
  )

  // ── 7. `import: false` actually took effect ────────────────────────────────
  // With import:false the plugin emits no local fallback, so every shared
  // entry's asset lists are empty. A non-empty one means fallbacks are being
  // built and — since they are STATICALLY imported by the exposed module —
  // transferred on every app load (section 5.7 measured ~210 kB for two
  // packages).
  //
  // This is NOT the section 5.8 payload gate, and must not be mistaken for it.
  // That gate belongs in vite.config.ts's `noSharedPayload` plugin, which
  // inspects `chunk.modules` in generateBundle. A post-hoc scan of the built
  // files cannot do the same job: module paths do not survive minification, so
  // grepping output text for `/node_modules/@mui/` would miss a genuinely
  // bundled MUI — while matching the dead absolute-path string literals the SSR
  // loader embeds in remoteEntry.js on a perfectly correct build (section 8
  // Decision A, reproduced here). It would be false in both directions.
  const sharedWithAssets = (mf.shared ?? []).filter((s) => {
    const a = s.assets ?? {}
    return (
      (a.js?.sync?.length ?? 0) > 0 ||
      (a.js?.async?.length ?? 0) > 0 ||
      (a.css?.sync?.length ?? 0) > 0 ||
      (a.css?.async?.length ?? 0) > 0
    )
  })
  check(
    'no shared fallback chunks emitted (import: false in effect)',
    sharedWithAssets.length === 0,
    sharedWithAssets.map((s) => s.name).join(', '),
  )

  // ── 8. No developer host URL survived into the artifact ────────────────────
  const files = listFilesRecursive(distDir).filter((f) => f.endsWith('.js'))
  const localhostHits = files.filter((f) =>
    readFileSync(join(distDir, f), 'utf8').includes('localhost:5500'),
  )
  check(
    'no localhost:5500 in the artifact',
    localhostHits.length === 0,
    localhostHits.join(', '),
  )

  return { checks, failures }
}

const main = () => {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const { apps } = loadManifest()

  const scope = apps.filter(
    (a) =>
      a.bundler === 'vite' &&
      (only.length === 0 || only.includes(a.workspaceDir)),
  )
  const skipped = apps.filter(
    (a) =>
      a.bundler !== 'vite' &&
      (only.length === 0 || only.includes(a.workspaceDir)),
  )

  for (const app of skipped) {
    console.log(`- ${app.workspaceDir}: skipped (bundler: ${app.bundler})`)
  }

  if (scope.length === 0) {
    console.log('\nNo Vite apps to verify yet.')
    process.exit(0)
  }

  let failed = 0
  for (const app of scope) {
    const distDir = resolve(REPO_ROOT, app.workspaceDir, 'dist')
    const { checks, failures } = verifyApp(app, distDir)

    if (failures.length === 0) {
      console.log(`\n✓ ${app.workspaceDir}: all ${checks.length} checks passed`)
    } else {
      failed += 1
      console.error(
        `\n✗ ${app.workspaceDir}: ${failures.length} failed, ${checks.length} passed`,
      )
      for (const f of failures) console.error(`    ✗ ${f}`)
    }
  }

  process.exit(failed === 0 ? 0 : 1)
}

if (process.argv[1]?.endsWith('verify-federation-build.mjs')) main()
