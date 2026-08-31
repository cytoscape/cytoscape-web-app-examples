import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { CyWebAppMeta } from '../meta/index.js'

/**
 * Everything derived from an app's package.json, over ONE read of it.
 *
 * READ, not imported. `tsconfig.node.json` — the config that type-checks
 * vite.config.ts — does not enable `resolveJsonModule`, and an import would
 * also tie this to a bundler's JSON handling for a file that is plain data.
 *
 * The split below is a LIFECYCLE boundary, not a tidiness one. `parseAppMeta`
 * runs on every dev server and every build, so anything it rejects fails
 * `vite dev`. Submission metadata — author, licence, repository — is optional
 * in npm, absent from most apps today, and only ever consumed when packaging an
 * App Store archive; validating it in the runtime path would fail ordinary
 * builds over a field the app itself never uses. Separate TYPES would not
 * achieve that. Separate CALLERS do: `parseSubmissionMeta` is reached only from
 * the packaging plugin and the CLI.
 *
 * One snapshot underneath both, because two independent readers cannot make the
 * guarantee the packager needs — that the identity it validates, the identity it
 * writes into the archive, and the peers the verifier compares against all came
 * from the same bytes.
 */

/**
 * The host applies exactly this rule in `parseManifest.ts`, so an id that
 * passes here cannot be rejected at install time. Keeping the two in sync is
 * the point: a locally valid id that the host silently drops is the worst of
 * both worlds.
 */
const JS_IDENTIFIER = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/

/** The host's own federation name. An app taking it would collide with the host. */
const RESERVED_IDS = new Set(['cyweb'])

/** npm's own grammar, not a loose "has dots" check. */
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

const fail = (message: string): never => {
  throw new Error(`[cyweb] ${message}`)
}

/** The fields this package reads. Everything else in package.json is ignored. */
export interface RawPackageJson {
  version?: unknown
  description?: unknown
  author?: unknown
  license?: unknown
  repository?: unknown
  homepage?: unknown
  keywords?: unknown
  peerDependencies?: unknown
  cyweb?: unknown
}

/**
 * One app's package.json, parsed and otherwise untouched.
 *
 * `raw` is deliberately unvalidated: every parser below decides for itself what
 * it requires, and a wrong-typed optional value has to survive this far to be
 * REJECTED later rather than silently coerced. That is not hypothetical — the
 * runtime path turns a non-string `description` into `''`, which is right for
 * the browser bundle and would destroy the evidence a manifest validator needs.
 */
export interface PackageSnapshot {
  /** The file that was read, for error messages that name it. */
  readonly path: string
  readonly raw: RawPackageJson
}

/** Reads `<root>/package.json`. The only place this package reads that file. */
export const readPackageSnapshot = (root: string): PackageSnapshot => {
  const path = join(root, 'package.json')

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'))
  } catch (cause) {
    return fail(
      `cannot read ${path} — ${(cause as Error).message}. ` +
        `defineCyWebApp() resolves the app root from the import.meta.url you ` +
        `passed it, so this usually means it was called from somewhere other ` +
        `than the app's own vite.config.ts.`,
    )
  }

  // A package.json that parses to a string, an array or null is corrupt. Saying
  // so beats the TypeError every later property access would throw.
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return fail(`${path} is not a JSON object.`)
  }
  return { path, raw: parsed as RawPackageJson }
}

const cywebBlock = (raw: RawPackageJson): Record<string, unknown> | undefined =>
  typeof raw.cyweb === 'object' && raw.cyweb !== null
    ? (raw.cyweb as Record<string, unknown>)
    : undefined

/**
 * The app's runtime identity. Runs on every dev server and every build.
 *
 * Every failure names the offending field. A build that dies on
 * "Cannot read properties of undefined" because `cyweb` is missing teaches the
 * developer nothing, and this is the first thing a new app runs.
 */
export const parseAppMeta = (snapshot: PackageSnapshot): CyWebAppMeta => {
  const { path, raw } = snapshot

  const block = cywebBlock(raw)
  if (block === undefined) {
    return fail(
      `${path} has no "cyweb" block. Add:\n` +
        `    "cyweb": { "id": "myApp", "displayName": "My App", "port": 6000 }`,
    )
  }

  const { id, displayName, port } = block

  if (typeof id !== 'string' || !JS_IDENTIFIER.test(id)) {
    return fail(
      `cyweb.id must be a valid JavaScript identifier (got ${JSON.stringify(id)}). ` +
        `It is the Module Federation container name, the CyApp.id and the ` +
        `registry id at once, and the host rejects anything else on install.`,
    )
  }
  if (RESERVED_IDS.has(id)) {
    return fail(`cyweb.id "${id}" is reserved — it is the host's own federation name.`)
  }
  if (typeof displayName !== 'string' || displayName.trim() === '') {
    return fail(`cyweb.displayName must be a non-empty string.`)
  }
  if (!Number.isInteger(port) || (port as number) < 1 || (port as number) > 65535) {
    return fail(`cyweb.port must be an integer in 1..65535 (got ${JSON.stringify(port)}).`)
  }

  if (typeof raw.version !== 'string' || !SEMVER.test(raw.version)) {
    return fail(
      `package.json "version" must be canonical SemVer (got ${JSON.stringify(raw.version)}). ` +
        `The host reads it, and the App Store artifact is named after it.`,
    )
  }

  // GRAMMAR only. The submission profile — a length bound, no build metadata,
  // numeric identifiers within Number.MAX_SAFE_INTEGER — is enforced where the
  // manifest is built, because a version that is legal SemVer must not fail an
  // ordinary `vite dev` over a rule that exists for a filename and a URL path.
  const description = typeof raw.description === 'string' ? raw.description : ''

  return {
    id,
    displayName,
    port: port as number,
    version: raw.version,
    description,
  }
}

/** `readAppMeta` as it has always been: one root in, validated identity out. */
export const readAppMeta = (root: string): CyWebAppMeta =>
  parseAppMeta(readPackageSnapshot(root))

/**
 * The publication metadata an App Store submission carries, exactly as written.
 *
 * Every field is `unknown` on purpose. Validation and normalization — the author
 * display name, the canonical repository URL, the tag equality relation — belong
 * to the manifest builder, where a bad value can fail packaging without touching
 * a build that never packages anything. Reading and judging are separate steps
 * here because they happen at separate times.
 */
export interface CyWebSubmissionMeta {
  readonly description: unknown
  readonly author: unknown
  readonly license: unknown
  readonly repository: unknown
  readonly homepage: unknown
  readonly keywords: unknown
  readonly compatibleHostVersions: unknown
}

/** Called from the packaging plugin and the CLI. Never from a dev or build path. */
export const parseSubmissionMeta = (snapshot: PackageSnapshot): CyWebSubmissionMeta => {
  const { raw } = snapshot
  return {
    description: raw.description,
    author: raw.author,
    license: raw.license,
    repository: raw.repository,
    homepage: raw.homepage,
    keywords: raw.keywords,
    compatibleHostVersions: cywebBlock(raw)?.compatibleHostVersions,
  }
}

/** One entry of the share block a build is expected to have produced. */
export interface ShareRecord {
  singleton?: boolean
  import?: boolean | string
  requiredVersion?: string
}

/**
 * What this app declares the host provides, derived from `peerDependencies`.
 *
 * The same expansion the build performs, from the same source, so the two can be
 * compared. An app with no peers — the non-React case — legitimately shares
 * nothing.
 */
export const sharedExpectations = (
  snapshot: PackageSnapshot,
): Record<string, ShareRecord> => {
  const peers = snapshot.raw.peerDependencies
  if (typeof peers !== 'object' || peers === null) return {}
  return Object.fromEntries(
    Object.entries(peers as Record<string, string>).map(([name, range]) => [
      name,
      { singleton: true, import: false, requiredVersion: range },
    ]),
  )
}
