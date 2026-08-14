import type { UserConfig } from 'vite'

/**
 * Config the SDK owns, and why.
 *
 * The `vite` option exists so an app can add a plugin, an alias, a `define` or
 * a test block without the SDK having to anticipate it — that escape hatch is
 * deliberate. What it must not do is reach the handful of settings whose whole
 * purpose is that an app never states them.
 *
 * A conflict is FATAL rather than resolved. Letting the user win would restore
 * the failure modes this package exists to remove; letting the SDK win silently
 * would mean config that reads one way and behaves another. Neither is a defect
 * anyone would find quickly, so the build stops and names the path.
 */
const PROTECTED: Array<{ path: readonly string[]; why: string }> = [
  {
    path: ['base'],
    why:
      'left unset on purpose so Module Federation resolves publicPath to "auto" ' +
      'and chunks load relative to wherever remoteEntry.js is deployed. Setting ' +
      'it re-pins the artifact to one deployment.',
  },
  {
    path: ['build', 'target'],
    why: 'must stay "esnext" — the MF runtime uses top-level await.',
  },
  {
    path: ['build', 'outDir'],
    why: 'the publish pipeline and the App Store zip both assume it.',
  },
  {
    path: ['server', 'port'],
    why: 'comes from cyweb.port in package.json, which is also what the install URL uses.',
  },
  {
    path: ['server', 'strictPort'],
    why:
      'a silent port fallback moves the remote off the URL the host registered, ' +
      'and the failure surfaces much later as an unexplained "app not found".',
  },
  {
    path: ['server', 'origin'],
    why:
      'makes Vite emit absolute asset URLs in dev. Without it the host — a ' +
      'different origin — resolves this remote\'s chunk URLs against its own.',
  },
  {
    path: ['server', 'headers', 'Access-Control-Allow-Origin'],
    why: 'the host loads this remote cross-origin.',
  },
]

const readPath = (
  config: Record<string, unknown>,
  path: readonly string[],
): { present: boolean } => {
  let cursor: unknown = config
  for (const key of path) {
    if (typeof cursor !== 'object' || cursor === null) return { present: false }
    if (!Object.prototype.hasOwnProperty.call(cursor, key)) {
      return { present: false }
    }
    cursor = (cursor as Record<string, unknown>)[key]
  }
  return { present: true }
}

/**
 * Throws if the caller's `vite` config sets anything the SDK owns.
 *
 * Reports every conflict at once. Fixing them one build at a time, when the
 * list was knowable in full on the first run, is a bad trade for the developer.
 */
export const assertNoProtectedOverrides = (config: UserConfig | undefined): void => {
  if (config === undefined) return

  const conflicts = PROTECTED.filter(
    ({ path }) => readPath(config as Record<string, unknown>, path).present,
  )
  if (conflicts.length === 0) return

  const detail = conflicts
    .map(({ path, why }) => `    ${path.join('.')} — ${why}`)
    .join('\n')

  throw new Error(
    `[cyweb] the "vite" option sets ${conflicts.length} field(s) that ` +
      `defineCyWebApp owns:\n${detail}\n` +
      `  Remove them, or drop to the composable primitives ` +
      `(cywebFederation, noSharedPayload, CYWEB_SHARED) and assemble the ` +
      `config yourself — those are unsupported, but they are not hidden.`,
  )
}
