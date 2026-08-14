// Build-output verifier for the Module Federation contract.
//
// Verifies on PAYLOAD, not on config. Every failure this guards against looks
// correct in a config file: a share block that reads right while MUI is bundled
// locally, a `cyweb` remote that silently resolves no exports because `type`
// defaulted to 'var', a runtime plugin named but never registered. Only the
// emitted bundle distinguishes them.
//
// Reads ONE app directory and nothing else, so it works outside the repository
// that produced it — which is the point of moving it here. It used to live in a
// monorepo script that loaded a manifest describing five apps, and was therefore
// unavailable to exactly the people the SDK exists for.
//
// The mf-manifest.json shape below was read off a real build
// (@module-federation/vite 1.16.8), not inferred:
//   id, name                    container name
//   metaData.remoteEntry        { name, path, type } for THIS app's entry
//   exposes[]                   { name: "AppConfig", path: "./AppConfig" }
//   shared[]                    { name, version, singleton, requiredVersion, assets }
//   remotes[]                   { federationContainerName, moduleName, alias, entry }
//                               — carries NO `type`, which is why the config
//                                 embeds configuredRemote via additionalData
//   configuredShared / configuredRemote / configuredRuntimePlugins  (top level)

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { readAppMeta } from '../vite/appMeta.js'
import { CYWEB_HOST_REQUIRED } from '../runtime/cywebHostSentinel.js'

const HOST_REMOTE_NAME = 'cyweb'
const RUNTIME_PLUGIN_NAME = 'cyweb-host-resolver'

/** Every app must expose this; it is how the host loads the app at all. */
const REQUIRED_EXPOSE = './AppConfig'

/**
 * Share keys the plugin derives on its own, which may appear in the EFFECTIVE
 * shared list without being configured.
 *
 * Measured: `react/jsx-runtime` appears as soon as any JSX is in the module
 * graph, and not before — which is why the effective list cannot simply be
 * compared for equality against the configured keys. The other two are their
 * dev-build and react-dom counterparts. A named constant so an unexplained
 * extra key is a failure rather than a shrug.
 */
const DERIVED_SHARED_ALLOWLIST = [
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/client',
]

/**
 * An absolute path into a node_modules tree — POSIX or Windows.
 *
 * These leak the build machine's directory layout, and on a workstation its
 * username. See the note on check 10 for why their presence is not fatal
 * everywhere.
 */
const ABSOLUTE_NODE_MODULES =
  /(?:[A-Za-z]:[\\/]|\/)[^\s"'`,)]*[\\/]node_modules[\\/]/g

export interface VerifyOptions {
  /** The app directory — the one with package.json in it. */
  readonly root: string
  /** Defaults to `<root>/dist`. */
  readonly distDir?: string
  /**
   * Exposes this app is expected to declare, beyond the mandatory
   * `./AppConfig`. Optional: standalone there is nothing to compare against, so
   * only the required one is asserted and the rest are reported. A caller that
   * has its own declaration (this repository's manifest) passes it and gets the
   * stricter check.
   */
  readonly expectExposes?: readonly string[]
}

export interface VerifyResult {
  readonly checks: string[]
  readonly failures: string[]
  readonly notes: string[]
}

const listFilesRecursive = (dir: string, prefix = ''): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...listFilesRecursive(join(dir, entry.name), rel))
    else out.push(rel)
  }
  return out
}

interface ShareRecord {
  singleton?: boolean
  import?: boolean | string
  requiredVersion?: string
}

const sameShareRecord = (a: ShareRecord | undefined, b: ShareRecord): boolean =>
  a !== undefined &&
  a.singleton === b.singleton &&
  a.import === b.import &&
  a.requiredVersion === b.requiredVersion

/**
 * What this app declares the host provides, derived from `peerDependencies`.
 *
 * The same expansion the build performs, from the same source, so the two can be
 * compared. An app with no peers — the non-React case — legitimately shares
 * nothing.
 */
const sharedFromPeers = (root: string): Record<string, ShareRecord> => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    peerDependencies?: Record<string, string>
  }
  return Object.fromEntries(
    Object.entries(pkg.peerDependencies ?? {}).map(([name, range]) => [
      name,
      { singleton: true, import: false, requiredVersion: range },
    ]),
  )
}

export const verifyApp = (options: VerifyOptions): VerifyResult => {
  const root = resolve(options.root)
  const distDir = options.distDir === undefined ? join(root, 'dist') : resolve(options.distDir)

  const checks: string[] = []
  const failures: string[] = []
  const notes: string[] = []
  const check = (label: string, ok: boolean, detail = ''): void => {
    if (ok) checks.push(label)
    else failures.push(detail === '' ? label : `${label} — ${detail}`)
  }

  let meta
  try {
    meta = readAppMeta(root)
  } catch (cause) {
    return { checks, failures: [(cause as Error).message], notes }
  }
  const expectedShared = sharedFromPeers(root)

  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    return { checks, failures: [`no build output at ${distDir} — run the build first`], notes }
  }

  // ── 1. remoteEntry.js is an ES module exposing the container contract ──────
  const remoteEntryPath = join(distDir, 'remoteEntry.js')
  if (!existsSync(remoteEntryPath)) {
    return { checks, failures: ['remoteEntry.js missing from the build output'], notes }
  }
  const remoteEntrySrc = readFileSync(remoteEntryPath, 'utf8')

  // A Webpack `var` library starts `var <name>;(()=>{...` and exports nothing
  // through the module namespace, so the host's `type: 'module'` loader reads no
  // init/get from it and the remote fails to register — silently.
  check(
    'remoteEntry.js is not a Webpack `var` library',
    !/^\s*var\s+\w+\s*;/.test(remoteEntrySrc),
    'looks like a classic var-library bundle',
  )
  check('remoteEntry.js exports `init`', /\bas init\b/.test(remoteEntrySrc))
  check('remoteEntry.js exports `get`', /\bas get\b/.test(remoteEntrySrc))

  // ── 2. mf-manifest.json, and it agrees with package.json ──────────────────
  const manifestPath = join(distDir, 'mf-manifest.json')
  if (!existsSync(manifestPath)) {
    failures.push('mf-manifest.json missing — the build did not emit a manifest')
    return { checks, failures, notes }
  }
  const mf = JSON.parse(readFileSync(manifestPath, 'utf8'))

  check(
    `container name is "${meta.id}" (cyweb.id)`,
    mf.name === meta.id,
    `the build produced "${mf.name}" — package.json and the artifact disagree`,
  )
  check(
    'this app emits an ESM remoteEntry',
    mf.metaData?.remoteEntry?.type === 'module',
    `metaData.remoteEntry.type = ${JSON.stringify(mf.metaData?.remoteEntry?.type)}`,
  )

  // ── 3. Exposes ────────────────────────────────────────────────────────────
  const exposedPaths = new Set<string>((mf.exposes ?? []).map((e: { path: string }) => e.path))
  check(`expose present: ${REQUIRED_EXPOSE}`, exposedPaths.has(REQUIRED_EXPOSE))

  if (options.expectExposes === undefined) {
    const extra = [...exposedPaths].filter((p) => p !== REQUIRED_EXPOSE)
    if (extra.length > 0) notes.push(`also exposes ${extra.join(', ')}`)
  } else {
    for (const expected of options.expectExposes) {
      if (expected !== REQUIRED_EXPOSE) check(`expose present: ${expected}`, exposedPaths.has(expected))
    }
    const undeclared = [...exposedPaths].filter((p) => !options.expectExposes!.includes(p))
    check(
      'no undeclared exposes',
      undeclared.length === 0,
      `the build exposes ${undeclared.join(', ')}, which the caller did not declare`,
    )
  }

  // ── 4. Shared: configured exactly, effective a superset ───────────────────
  // Two different things, and conflating them fails a CORRECT build: the plugin
  // derives keys the config never named (see DERIVED_SHARED_ALLOWLIST).
  const configured = mf.configuredShared as Record<string, ShareRecord> | undefined
  if (configured === undefined) {
    failures.push('mf-manifest.json has no configuredShared — additionalData is not wired')
  } else {
    for (const [pkg, expected] of Object.entries(expectedShared)) {
      const built = configured[pkg]
      const onlyVersion =
        built !== undefined &&
        built.singleton === expected.singleton &&
        built.import === expected.import &&
        built.requiredVersion !== expected.requiredVersion
      check(
        `configured share: ${pkg}`,
        sameShareRecord(built, expected),
        onlyVersion
          ? `the build declares "${built.requiredVersion}" and package.json ` +
            `declares "${expected.requiredVersion}". The SDK owns the range the ` +
            `host provides — set peerDependencies["${pkg}"] to ` +
            `"${built.requiredVersion}". (npm install writes the version it ` +
            `resolved, which is how these drift apart.)`
          : `built ${JSON.stringify(built)} != peerDependencies ${JSON.stringify(expected)}`,
      )
    }
    const extraConfigured = Object.keys(configured).filter((k) => !(k in expectedShared))
    check(
      'no unexpected configured shares',
      extraConfigured.length === 0,
      `the build declares ${extraConfigured.join(', ')}, which package.json does not list as peers`,
    )
  }

  const effective: string[] = (mf.shared ?? []).map((s: { name: string }) => s.name)
  for (const pkg of Object.keys(expectedShared)) {
    check(`effective share present: ${pkg}`, effective.includes(pkg))
  }
  const unexplained = effective.filter(
    (name) => !(name in expectedShared) && !DERIVED_SHARED_ALLOWLIST.includes(name),
  )
  check(
    'no unexplained effective shares',
    unexplained.length === 0,
    `${unexplained.join(', ')} — neither configured nor a known derived key`,
  )

  // ── 5. The cyweb remote ───────────────────────────────────────────────────
  // Asserted against configuredRemote: the native `remotes[]` records the entry
  // string under `federationContainerName` and carries no `type` at all, so it
  // cannot answer the question that matters most here.
  const remote = mf.configuredRemote as
    | { name?: string; type?: string; entry?: string }
    | undefined
  if (remote === undefined) {
    failures.push('mf-manifest.json has no configuredRemote — additionalData is not wired')
  } else {
    check('cyweb remote name', remote.name === HOST_REMOTE_NAME, JSON.stringify(remote.name))
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
    (mf.remotes ?? []).some((r: { alias?: string }) => r.alias === HOST_REMOTE_NAME),
  )

  // ── 6. The runtime plugin is REGISTERED, not merely present on disk ───────
  // In the bundle, not only in the manifest: a config can name a runtimePlugins
  // path the build never wires in, and the app then silently falls back to its
  // compiled-in entry.
  check(
    `${RUNTIME_PLUGIN_NAME} is in the built remoteEntry`,
    remoteEntrySrc.includes(RUNTIME_PLUGIN_NAME),
    'the resolver was not registered — runtimePlugins is missing or wrong',
  )

  // ── 7. `import: false` actually took effect ───────────────────────────────
  // With import:false the plugin emits no local fallback, so every shared
  // entry's asset lists are empty. A non-empty one means fallbacks are being
  // built and — since they are STATICALLY imported by the exposed module —
  // transferred on every app load. Measured at 8.7x during the Vite migration.
  //
  // This is NOT the bundled-payload gate and must not be mistaken for it. That
  // gate is `noSharedPayload`, which inspects `chunk.modules` at build time. A
  // post-hoc scan cannot do the same job: module paths do not survive
  // minification, so grepping output text would miss a genuinely bundled MUI
  // while matching the dead absolute-path literals of check 10.
  const sharedWithAssets = (mf.shared ?? []).filter((s: { assets?: Record<string, Record<string, unknown[]>> }) => {
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
    sharedWithAssets.map((s: { name: string }) => s.name).join(', '),
  )

  // ── 8. No developer host URL survived into the artifact ───────────────────
  const jsFiles = listFilesRecursive(distDir).filter((f) => f.endsWith('.js'))
  const readFile = (f: string): string => readFileSync(join(distDir, f), 'utf8')

  const localhostHits = jsFiles.filter((f) => /localhost:\d+\/remoteEntry\.js/.test(readFile(f)))
  check(
    'no developer host URL in the artifact',
    localhostHits.length === 0,
    localhostHits.join(', '),
  )

  // ── 9. package.json did not end up in the browser bundle ──────────────────
  // Importing it for one field pulls the WHOLE file in — dependency lists,
  // scripts, anything private. Use virtual:cyweb-app-meta instead.
  const pkgLeaks = jsFiles.filter((f) => /"?(devDependencies|peerDependencies)"?\s*:/.test(readFile(f)))
  check(
    'package.json is not bundled into the artifact',
    pkgLeaks.length === 0,
    `${pkgLeaks.join(', ')} — import from 'virtual:cyweb-app-meta', not '../package.json'`,
  )

  // ── 10. Build-machine paths are confined to remoteEntry.js ────────────────
  // They are NOT fatal there. The Module Federation SSR loader embeds absolute
  // paths as dead string literals in remoteEntry.js on a perfectly correct
  // build; that was measured and accepted during the Vite migration, on the
  // grounds that CI publishes from a fixed runner account and an already-public
  // repository name. Publishing from a workstation is the case to be careful
  // about, so the count is reported rather than hidden.
  //
  // Anywhere ELSE is a regression: it means a path escaped into a chunk that had
  // no business carrying one.
  const strayPathFiles = jsFiles.filter(
    (f) => f !== 'remoteEntry.js' && ABSOLUTE_NODE_MODULES.test(readFile(f)),
  )
  check(
    'build-machine paths confined to remoteEntry.js',
    strayPathFiles.length === 0,
    `${strayPathFiles.join(', ')} also carry absolute paths`,
  )
  const inEntry = readFile('remoteEntry.js').match(ABSOLUTE_NODE_MODULES)?.length ?? 0
  if (inEntry > 0) {
    notes.push(
      `remoteEntry.js embeds ${inEntry} absolute build-machine path(s) — expected ` +
        `(the SSR loader emits them as dead literals); publish from CI rather than a workstation`,
    )
  }

  return { checks, failures, notes }
}
