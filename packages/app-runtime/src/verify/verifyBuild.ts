// Build-output verifier for the Module Federation contract.
//
// Verifies on PAYLOAD, not on config. Every failure this guards against looks
// correct in a config file: a share block that reads right while MUI is bundled
// locally, a `cyweb` remote that silently resolves no exports because `type`
// defaulted to 'var', a runtime plugin named but never registered. Only the
// emitted bundle distinguishes them.
//
// Reads the BUILD OUTPUT and nothing else. It performs no package reads at all:
// identity and the peer-derived share expectations arrive as input, from one
// snapshot its caller took, so the identity asserted here and the identity its
// caller writes into an archive cannot come from two different reads of
// package.json.
//
// What it does NOT accept as input is the configured share block, remote and
// runtime plugins. Those are read from mf-manifest.json, where the build embeds
// them through `manifest.additionalData` for exactly this purpose. Taking them
// from the caller instead would verify the configuration against itself — which
// is the one thing the first paragraph says this file exists not to do.
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

import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'

import type { CyWebAppMeta } from '../meta/index.js'
import type { ShareRecord } from '../vite/appMeta.js'
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
const ABSOLUTE_NODE_MODULES_SOURCE =
  /(?:[A-Za-z]:[\\/]|\/)[^\s"'`,)]*[\\/]node_modules[\\/]/.source

/** For COUNTING, with `g`. Only used with `String.match`, which ignores `lastIndex`. */
const ABSOLUTE_NODE_MODULES_ALL = new RegExp(ABSOLUTE_NODE_MODULES_SOURCE, 'g')

/**
 * For TESTING, without `g` — and this is not a style choice.
 *
 * `RegExp.prototype.test` on a global regex advances and keeps `lastIndex`
 * between calls, so testing several files with one shared object makes the
 * answer depend on the previous file: three chunks that all carry an absolute
 * path come back as the first and the third. The check that build-machine paths
 * stay confined to remoteEntry.js was passing while chunks carried them.
 */
const ABSOLUTE_NODE_MODULES_TEST = new RegExp(ABSOLUTE_NODE_MODULES_SOURCE)

/**
 * Everything the core needs, and nothing it could read for itself.
 *
 * `appMeta` and `expectedShared` must come from ONE `readPackageSnapshot`. The
 * Vite plugin has that snapshot at packaging time; the CLI takes one itself,
 * once, and reads everything else from the artifact — it runs against an
 * already-built `dist/` whose Vite configuration is gone, and does not pretend
 * to have captured one.
 */
export interface VerifyBuildInput {
  readonly appMeta: CyWebAppMeta
  /** Peer-derived share expectations, from the same snapshot as `appMeta`. */
  readonly expectedShared: Record<string, ShareRecord>
  /** Absolute and already resolved: the core does no path resolution. */
  readonly distDir: string
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

/**
 * Regular files only.
 *
 * Everything below reads what this returns, and `readFileSync` on a FIFO blocks
 * until a writer appears — a build output containing `assets/pipe.js` would hang
 * the verifier, and therefore packaging, forever. A symlink is skipped for the
 * same reason a broken one used to throw: what it points at is not this build's
 * output. The packager rejects both explicitly; this makes the verifier survive
 * meeting one first.
 */
const listFilesRecursive = (dir: string, prefix = ''): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory())
      out.push(...listFilesRecursive(join(dir, entry.name), rel))
    else if (entry.isFile()) out.push(rel)
  }
  return out
}

const sameShareRecord = (a: ShareRecord | undefined, b: ShareRecord): boolean =>
  a !== undefined &&
  a.singleton === b.singleton &&
  a.import === b.import &&
  a.requiredVersion === b.requiredVersion

export const verifyBuild = (input: VerifyBuildInput): VerifyResult => {
  const { appMeta: meta, expectedShared, distDir } = input

  const checks: string[] = []
  const failures: string[] = []
  const notes: string[] = []
  const check = (label: string, ok: boolean, detail = ''): void => {
    if (ok) checks.push(label)
    else failures.push(detail === '' ? label : `${label} — ${detail}`)
  }

  if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
    return {
      checks,
      failures: [`no build output at ${distDir} — run the build first`],
      notes,
    }
  }

  /**
   * A path this function is about to READ must be a regular file first.
   *
   * `listFilesRecursive` skips anything else, but these two are read directly
   * and reached that protection too late: a FIFO named `remoteEntry.js` blocks
   * `cyweb-app verify` forever, because `readFileSync` on one waits for a
   * writer, and a symlink would have the verifier reading content from outside
   * the build it is meant to be checking.
   */
  const notARegularFile = (path: string, label: string): string | undefined => {
    let stat
    try {
      stat = lstatSync(path)
    } catch {
      return undefined // absent is the caller's own case, with its own message
    }
    if (stat.isSymbolicLink())
      return `${label} is a symbolic link, not part of this build`
    if (!stat.isFile()) return `${label} is not a regular file`
    return undefined
  }

  // ── 1. remoteEntry.js is an ES module exposing the container contract ──────
  const remoteEntryPath = join(distDir, 'remoteEntry.js')
  const remoteEntryProblem = notARegularFile(remoteEntryPath, 'remoteEntry.js')
  if (remoteEntryProblem !== undefined) {
    return { checks, failures: [remoteEntryProblem], notes }
  }
  if (!existsSync(remoteEntryPath)) {
    return {
      checks,
      failures: ['remoteEntry.js missing from the build output'],
      notes,
    }
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
  const manifestProblem = notARegularFile(manifestPath, 'mf-manifest.json')
  if (manifestProblem !== undefined) {
    failures.push(manifestProblem)
    return { checks, failures, notes }
  }
  if (!existsSync(manifestPath)) {
    failures.push(
      'mf-manifest.json missing — the build did not emit a manifest',
    )
    return { checks, failures, notes }
  }
  // A malformed artifact is a RESULT, not an exception. An uncaught SyntaxError
  // here would reach the CLI as a stack trace naming a JSON offset, which tells
  // a developer nothing about which file is wrong or what to do about it.
  let mf: Record<string, any>
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'))
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      failures.push(
        `mf-manifest.json is not a JSON object — the build output is corrupt`,
      )
      return { checks, failures, notes }
    }
    mf = parsed as Record<string, any>
  } catch (cause) {
    failures.push(
      `mf-manifest.json is not valid JSON — ${(cause as Error).message}`,
    )
    return { checks, failures, notes }
  }

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

  // A corrupt artifact is a RESULT, not an exception — and `typeof x === object`
  // is not enough for that promise: `{ "exposes": {} }` reaches `.map` and
  // throws a TypeError out of a function whose contract says it returns
  // failures. The packager calls this core WITHOUT the CLI wrapper's catch, so
  // the exception would surface as a build crash naming nothing.
  const collection = (field: string): unknown[] | undefined => {
    const raw = mf[field]
    if (raw === undefined || raw === null) return []
    if (!Array.isArray(raw)) {
      failures.push(
        `mf-manifest.json "${field}" is not an array — the build output is corrupt`,
      )
      return undefined
    }
    return raw
  }
  const exposes = collection('exposes')
  const sharedList = collection('shared')
  const remotesList = collection('remotes')
  if (
    exposes === undefined ||
    sharedList === undefined ||
    remotesList === undefined
  ) {
    return { checks, failures, notes }
  }

  // ── 3. Exposes ────────────────────────────────────────────────────────────
  const exposedPaths = new Set<string>(
    exposes.flatMap((e) =>
      typeof e === 'object' &&
      e !== null &&
      typeof (e as { path?: unknown }).path === 'string'
        ? [(e as { path: string }).path]
        : [],
    ),
  )
  check(`expose present: ${REQUIRED_EXPOSE}`, exposedPaths.has(REQUIRED_EXPOSE))

  if (input.expectExposes === undefined) {
    const extra = [...exposedPaths].filter((p) => p !== REQUIRED_EXPOSE)
    if (extra.length > 0) notes.push(`also exposes ${extra.join(', ')}`)
  } else {
    for (const expected of input.expectExposes) {
      if (expected !== REQUIRED_EXPOSE)
        check(`expose present: ${expected}`, exposedPaths.has(expected))
    }
    const undeclared = [...exposedPaths].filter(
      (p) => !input.expectExposes!.includes(p),
    )
    check(
      'no undeclared exposes',
      undeclared.length === 0,
      `the build exposes ${undeclared.join(', ')}, which the caller did not declare`,
    )
  }

  // ── 4. Shared: configured exactly, effective a superset ───────────────────
  // Two different things, and conflating them fails a CORRECT build: the plugin
  // derives keys the config never named (see DERIVED_SHARED_ALLOWLIST).
  // `=== undefined` lets `null` through, and `null[pkg]` throws out of a
  // function whose contract is to RETURN failures.
  const asRecord = (raw: unknown): Record<string, unknown> | undefined =>
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : undefined

  const configured = asRecord(mf.configuredShared) as
    Record<string, ShareRecord> | undefined
  if (configured === undefined) {
    failures.push(
      'mf-manifest.json has no configuredShared — additionalData is not wired',
    )
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
    const extraConfigured = Object.keys(configured).filter(
      (k) => !(k in expectedShared),
    )
    check(
      'no unexpected configured shares',
      extraConfigured.length === 0,
      `the build declares ${extraConfigured.join(', ')}, which package.json does not list as peers`,
    )
  }

  const effective: string[] = sharedList.flatMap((entry) =>
    typeof entry === 'object' &&
    entry !== null &&
    typeof (entry as { name?: unknown }).name === 'string'
      ? [(entry as { name: string }).name]
      : [],
  )
  for (const pkg of Object.keys(expectedShared)) {
    check(`effective share present: ${pkg}`, effective.includes(pkg))
  }
  const unexplained = effective.filter(
    (name) =>
      !(name in expectedShared) && !DERIVED_SHARED_ALLOWLIST.includes(name),
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
  const remote = asRecord(mf.configuredRemote) as
    { name?: string; type?: string; entry?: string } | undefined
  if (remote === undefined) {
    failures.push(
      'mf-manifest.json has no configuredRemote — additionalData is not wired',
    )
  } else {
    check(
      'cyweb remote name',
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
    remotesList.some(
      (r) =>
        typeof r === 'object' &&
        r !== null &&
        (r as { alias?: unknown }).alias === HOST_REMOTE_NAME,
    ),
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
  const sharedWithAssets = (
    sharedList as { name: string; assets?: any }[]
  ).filter((s: { assets?: Record<string, Record<string, unknown[]>> }) => {
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

  // A file that cannot be read is a corrupt build output, not an exception. A
  // dangling symlink in dist/ used to throw ENOENT from here, which reached the
  // caller as a stack trace naming a path and no reason. It is reported as a
  // failure and the remaining checks still run — and deliberately adds no new
  // passing check, so a healthy build's count is unchanged.
  const unreadable = new Set<string>()
  const readFile = (f: string): string => {
    try {
      return readFileSync(join(distDir, f), 'utf8')
    } catch (cause) {
      // Once per file, however many checks go on to ask for it.
      if (!unreadable.has(f)) {
        unreadable.add(f)
        failures.push(`${f} could not be read — ${(cause as Error).message}`)
      }
      return ''
    }
  }

  const localhostHits = jsFiles.filter((f) =>
    /localhost:\d+\/remoteEntry\.js/.test(readFile(f)),
  )
  check(
    'no developer host URL in the artifact',
    localhostHits.length === 0,
    localhostHits.join(', '),
  )

  // ── 9. package.json did not end up in the browser bundle ──────────────────
  // Importing it for one field pulls the WHOLE file in — dependency lists,
  // scripts, anything private. Use virtual:cyweb-app-meta instead.
  const pkgLeaks = jsFiles.filter((f) =>
    /"?(devDependencies|peerDependencies)"?\s*:/.test(readFile(f)),
  )
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
    (f) => f !== 'remoteEntry.js' && ABSOLUTE_NODE_MODULES_TEST.test(readFile(f)),
  )
  check(
    'build-machine paths confined to remoteEntry.js',
    strayPathFiles.length === 0,
    `${strayPathFiles.join(', ')} also carry absolute paths`,
  )
  const inEntry =
    readFile('remoteEntry.js').match(ABSOLUTE_NODE_MODULES_ALL)?.length ?? 0
  if (inEntry > 0) {
    notes.push(
      `remoteEntry.js embeds ${inEntry} absolute build-machine path(s) — expected ` +
        `(the SSR loader emits them as dead literals); publish from CI rather than a workstation`,
    )
  }

  return { checks, failures, notes }
}
