// `cyweb-app verify` — the thin wrapper around the build-output verifier.
//
// Everything that reads the artifact lives in `../verify/verifyBuild.ts`, which
// performs no package reads at all. This file does the two things the core
// deliberately does not: resolve paths, and take ONE package snapshot.
//
// The split is not tidiness. The packaging plugin runs the same core over the
// same `dist/` with the snapshot it already holds, so the identity the verifier
// asserts and the identity the archive claims cannot come from two different
// reads of package.json — and a build plugin no longer imports from the CLI
// layer to get there.

import { join, resolve } from 'node:path'

import { parseAppMeta, readPackageSnapshot, sharedExpectations } from '../vite/appMeta.js'
import { verifyBuild, type VerifyResult } from '../verify/verifyBuild.js'

export type { VerifyResult } from '../verify/verifyBuild.js'
export { verifyBuild, type VerifyBuildInput } from '../verify/verifyBuild.js'

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

/**
 * Verify one app directory: read its package.json once, then check its build.
 *
 * What this can and cannot know is worth stating, because the CLI runs against
 * an already-built `dist/` whose Vite configuration no longer exists. It
 * validates what is OBSERVABLE FROM THE ARTIFACT: `mf-manifest.json` carries
 * `configuredShared`, `configuredRemote` and `configuredRuntimePlugins` because
 * this SDK embeds them through `manifest.additionalData` precisely so a build's
 * own intent stays auditable afterwards. It does not claim to have captured a
 * build configuration it never saw.
 */
export const verifyApp = (options: VerifyOptions): VerifyResult => {
  const root = resolve(options.root)
  const distDir = options.distDir === undefined ? join(root, 'dist') : resolve(options.distDir)

  // ONE read. The identity asserted below and the peers the share block is
  // compared against have to come from the same bytes.
  try {
    const snapshot = readPackageSnapshot(root)
    return verifyBuild({
      appMeta: parseAppMeta(snapshot),
      expectedShared: sharedExpectations(snapshot),
      distDir,
      expectExposes: options.expectExposes,
    })
  } catch (cause) {
    return { checks: [], failures: [(cause as Error).message], notes: [] }
  }
}
