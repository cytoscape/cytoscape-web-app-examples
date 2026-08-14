/// <reference path="./virtual.d.ts" />

/**
 * The shape of app metadata, and the ambient declaration for
 * `virtual:cyweb-app-meta`.
 *
 * This entry deliberately imports NOTHING. It is consumed by app sources, whose
 * tsconfig keeps `skipLibCheck: false` on purpose — so every type reachable from
 * here is actually checked, and a stray import of (say) the Module Federation
 * SDK types would drag `webpack` into an app that does not depend on it.
 */

/**
 * The `cyweb` block in an app's package.json — the single source of the app's
 * identity.
 *
 * ```json
 * {
 *   "name": "@example/my-app",
 *   "version": "0.1.0",
 *   "description": "Colors nodes by degree",
 *   "cyweb": { "id": "myApp", "displayName": "Degree Colorizer", "port": 6000 }
 * }
 * ```
 */
export interface CyWebBlock {
  /**
   * Module Federation container name, `CyApp.id`, and the registry `id`, all at
   * once. Must be a valid JavaScript identifier — the host applies the same rule
   * in `parseManifest.ts`, so an id that passes here cannot be rejected on
   * install. `cyweb` itself is reserved.
   */
  readonly id: string

  /** Human-readable name shown in the host's App Settings. */
  readonly displayName: string

  /** Dev server port. Bound with `strictPort`, so a clash fails rather than moves. */
  readonly port: number
}

/**
 * The validated metadata `defineCyWebApp` reads once from package.json.
 *
 * `version` and `description` come from the standard fields rather than the
 * `cyweb` block: they already exist, already mean this, and npm already
 * validates the first of them.
 */
export interface CyWebAppMeta {
  readonly id: string
  readonly displayName: string
  readonly port: number
  readonly version: string
  readonly description: string
}

/**
 * The fields handed to the browser through `virtual:cyweb-app-meta`.
 *
 * An allowlist, and the reason the virtual module exists at all: importing
 * package.json directly — which every app used to do for its version — bundles
 * `devDependencies`, `scripts`, and every private field into the app's own
 * chunk. Adding an entry here is a deliberate act.
 */
export const EXPOSED_META_FIELDS = [
  'id',
  'displayName',
  'version',
  'description',
] as const

export type ExposedMetaField = (typeof EXPOSED_META_FIELDS)[number]
