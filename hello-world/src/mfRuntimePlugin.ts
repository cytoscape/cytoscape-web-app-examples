// Resolves the `cyweb` host entry at RUNTIME instead of build time.
//
// Why this exists: without it, an app artifact is bound to one host deployment.
// The old config picked between two hardcoded URLs with a build flag, so the
// published build could only ever be loaded by web.cytoscape.org — not by a
// Netlify branch preview, a self-hosted instance, or a colleague's local host.
// A remote's remoteEntry.js is imported BY the host, INTO the host's page, so
// the host knows its own entry URL exactly and publishes it; this reads it.
// Deriving it here instead (`location.origin + '/remoteEntry.js'`) would be a
// guess, because the host's base comes from its config.json.
//
// See design/specifications/vite-migration/vite-migration.md section 6.

import { CYWEB_HOST_REQUIRED } from './cywebHostSentinel'

// Structural subset of the MF runtime plugin contract. Declared locally rather
// than imported from @module-federation/runtime: that package's types reach
// @module-federation/sdk, whose ModuleFederationPlugin.d.ts does
// `import webpack from "webpack"`. This app's tsconfig keeps
// `skipLibCheck: false` on purpose, so that import would break `typecheck` the
// moment Webpack is uninstalled.
type RemoteEntryRecord = { name?: string; entry?: string }
type BeforeInitArgs = {
  userOptions: { remotes?: RemoteEntryRecord[] }
  options: { remotes?: RemoteEntryRecord[] }
}
type MfRuntimePlugin = {
  name: string
  // GENERIC pass-through, not `(args: BeforeInitArgs) => BeforeInitArgs`. The
  // real hook is a SyncWaterfallHook over `{userOptions, options, origin,
  // shareInfo}`; a signature that returns the narrowed type drops `origin` and
  // `shareInfo` and is not assignable (TS2322) against a real
  // ModuleFederation instance — which is what the test uses.
  beforeInit: <T extends BeforeInitArgs>(args: T) => T
}

const HOST_REMOTE_NAME = 'cyweb'

/**
 * The host's entry URL, or undefined if the descriptor cannot be used for
 * routing. Validates the two fields routing depends on — `name` identifies the
 * descriptor as Cytoscape Web's, and an empty or relative `remoteEntry` is as
 * wrong as a missing one. `apiVersion` is deliberately NOT checked; acting on
 * it is deferred (section 6.6).
 */
const readHostEntry = (): string | undefined => {
  const descriptor = (
    globalThis as { __CYWEB_HOST__?: { name?: unknown; remoteEntry?: unknown } }
  ).__CYWEB_HOST__
  if (descriptor?.name !== HOST_REMOTE_NAME) return undefined

  const value = descriptor.remoteEntry
  if (typeof value !== 'string' || value === '') return undefined
  try {
    // Absolute only: `new URL(relative)` throws, so this rejects relative paths
    // as well as non-HTTP schemes.
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

/**
 * When the descriptor is missing or malformed, behaviour depends on what the
 * build compiled in: a dev build keeps its localhost entry, a production build
 * carries the sentinel and fails loudly here.
 */
export default function cywebHostResolver(): MfRuntimePlugin {
  return {
    name: 'cyweb-host-resolver',
    beforeInit(args) {
      const hostEntry = readHostEntry()

      // BOTH arrays, and this is the non-obvious part. On FIRST init the
      // declared remotes arrive in `userOptions.remotes` while
      // `options.remotes` (the global accumulator) is still empty. On RE-INIT
      // the opposite holds, and because registerRemote is called with
      // `force: false` there, the userOptions copy is ignored. Writing only one
      // of the two works in exactly one of the two cases — silently.
      for (const list of [args.userOptions.remotes, args.options.remotes]) {
        for (const remote of list ?? []) {
          if (remote.name !== HOST_REMOTE_NAME || !('entry' in remote)) continue

          if (hostEntry !== undefined) {
            remote.entry = hostEntry
          } else if (remote.entry === CYWEB_HOST_REQUIRED) {
            throw new Error(
              `[cyweb-host-resolver] This app must be loaded by Cytoscape Web: ` +
                `window.__CYWEB_HOST__ is missing or invalid. The host ` +
                `publishes it at boot; a host that predates it cannot load ` +
                `this app.`,
            )
          }
          // else: dev build, compiled-in localhost entry stands.
        }
      }
      return args
    },
  }
}
