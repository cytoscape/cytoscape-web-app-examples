import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { CyWebAppMeta } from '../meta/index.js'

/**
 * Reads and validates the app's identity from its package.json.
 *
 * READ, not imported. `tsconfig.node.json` — the config that type-checks
 * vite.config.ts — does not enable `resolveJsonModule`, and an import would
 * also tie this to a bundler's JSON handling for a file that is plain data.
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

interface RawPackageJson {
  version?: unknown
  description?: unknown
  cyweb?: {
    id?: unknown
    displayName?: unknown
    port?: unknown
  }
}

/**
 * Parse `<root>/package.json` into validated metadata.
 *
 * Every failure names the offending field. A build that dies on
 * "Cannot read properties of undefined" because `cyweb` is missing teaches the
 * developer nothing, and this is the first thing a new app runs.
 */
export const readAppMeta = (root: string): CyWebAppMeta => {
  const path = join(root, 'package.json')

  let raw: RawPackageJson
  try {
    raw = JSON.parse(readFileSync(path, 'utf8')) as RawPackageJson
  } catch (cause) {
    return fail(
      `cannot read ${path} — ${(cause as Error).message}. ` +
        `defineCyWebApp() resolves the app root from the import.meta.url you ` +
        `passed it, so this usually means it was called from somewhere other ` +
        `than the app's own vite.config.ts.`,
    )
  }

  const block = raw.cyweb
  if (block === undefined || block === null || typeof block !== 'object') {
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

  const description = typeof raw.description === 'string' ? raw.description : ''

  return {
    id,
    displayName,
    port: port as number,
    version: raw.version,
    description,
  }
}
