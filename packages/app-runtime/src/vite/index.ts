import { fileURLToPath } from 'node:url'

import { federation } from '@module-federation/vite'
import {
  defineConfig,
  mergeConfig,
  normalizePath,
  type PluginOption,
  type UserConfig,
} from 'vite'

import { CYWEB_HOST_REQUIRED } from '../runtime/cywebHostSentinel.js'
import { parseAppMeta, readPackageSnapshot } from './appMeta.js'
import { resolveDevHost } from './devHost.js'
import { cywebDevInstall } from './devInstall.js'
import { noSharedPayload } from './noSharedPayload.js'
import { assertNoProtectedOverrides } from './protectedFields.js'
import { CYWEB_SHARED } from './shared.js'
import { cywebAppMeta } from './virtualMeta.js'
import { resolveAppStoreZip, zipForAppStore } from './zipForAppStore.js'

export { CYWEB_SHARED, CYWEB_SHARED_PACKAGES } from './shared.js'
export {
  buildInstallManifest,
  buildInstallUrl,
  cywebDevInstall,
  DEV_MANIFEST_PATH,
} from './devInstall.js'
export { noSharedPayload } from './noSharedPayload.js'
export { zipForAppStore } from './zipForAppStore.js'
export { cywebAppMeta } from './virtualMeta.js'
export {
  parseAppMeta,
  parseSubmissionMeta,
  readAppMeta,
  readPackageSnapshot,
  sharedExpectations,
} from './appMeta.js'
export type {
  CyWebSubmissionMeta,
  PackageSnapshot,
  RawPackageJson,
  ShareRecord,
} from './appMeta.js'
export { CYWEB_HOST_REQUIRED } from '../runtime/cywebHostSentinel.js'
export type { CyWebAppMeta, CyWebBlock } from '../meta/index.js'

/**
 * Absolute path to the Module Federation runtime plugin.
 *
 * Derived from this module's own location rather than resolved by package name:
 * `new URL(..., import.meta.url)` cannot be defeated by a symlinked workspace, a
 * pnpm store layout, or a self-reference that an `exports` map happens not to
 * allow. It also needs no entry in `exports`, which keeps the public surface at
 * two subpaths.
 *
 * `normalizePath` because the federation plugin interpolates this straight into
 * an `import "<path>"` — a Windows backslash path is an invalid specifier.
 */
const RUNTIME_PLUGIN_PATH = normalizePath(
  fileURLToPath(new URL('../runtime/mfRuntimePlugin.js', import.meta.url)),
)

/** The one expose the host loads an app through. Not negotiable. */
const APP_CONFIG_EXPOSE = './AppConfig'

/**
 * The subset of the federation plugin's `shared` shape this package uses.
 *
 * Declared locally rather than imported: the plugin's own option types reach
 * @module-federation/sdk, whose declarations do `import webpack from "webpack"`.
 */
export type CyWebSharedConfig = Readonly<
  Record<
    string,
    {
      readonly singleton?: boolean
      readonly requiredVersion?: string
      readonly strictVersion?: boolean
      readonly shareScope?: string
      readonly version?: string
      readonly import?: string | false
    }
  >
>

export interface CyWebAppOptions {
  /**
   * `false` for an app with no React UI. Drops the React plugin and the shared
   * singleton block — a non-React app legitimately shares nothing, and
   * declaring singletons it never imports would be false metadata.
   *
   * @default true
   */
  readonly react?: boolean

  /**
   * Extra federated modules, merged with the mandatory `./AppConfig`.
   *
   * Only needed when the host must load something in addition to the app
   * config — `hello-world` exposes a second menu item this way, as its test
   * that React really is a single shared instance across the boundary.
   */
  readonly exposes?: Readonly<Record<string, string>>

  /**
   * Where the host's UI is served in development.
   *
   * @default 'http://localhost:5500'
   */
  readonly devHostPageUrl?: string
  /*
   * Overridden for one session by the CYWEB_DEV_HOST environment variable, so
   * that developing against a shared host does not mean editing a committed
   * file — see resolveDevHost.
   */

  /**
   * The host's `remoteEntry.js` in development. Derived from
   * `devHostPageUrl` when omitted.
   *
   * Separate from the page URL because they are different things: a host served
   * under a base path has its entry inside that path, and a concatenation would
   * silently produce the wrong one.
   */
  readonly devHostRemoteEntryUrl?: string

  /**
   * Write `<id>-<version>.zip` next to package.json on every production build.
   *
   * Overridden for a single build by the `CYWEB_APP_ZIP` environment variable,
   * in either direction — see `resolveAppStoreZip`.
   *
   * @default false
   */
  readonly appStoreZip?: boolean

  /**
   * Merged over the generated config, last.
   *
   * For plugins, aliases, `define`, test settings — anything the SDK does not
   * anticipate. Setting a field the SDK owns is a fatal error naming the path;
   * see `protectedFields.ts` for the list and the reasons.
   */
  readonly vite?: UserConfig
}

/**
 * The whole build configuration for a Cytoscape Web app.
 *
 * ```ts
 * // vite.config.ts
 * import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'
 * export default defineCyWebApp(import.meta.url)
 * ```
 *
 * `import.meta.url` is required, not optional. The app root has to be located
 * to read package.json, and `process.cwd()` is wrong whenever Vite runs from a
 * monorepo root or with `--config`.
 *
 * Four things it sets up are load-bearing, and each of them fails in a way that
 * is hard to read — which is the reason they live here rather than in every
 * app's config:
 *
 *  1. `remotes.cyweb.type: 'module'`. The host is a Vite build emitting an ESM
 *     `remoteEntry.js`. The plugin's default is `'var'`, a Webpack-style global,
 *     which resolves NO exports against an ESM host and fails **silently** —
 *     the remote appears to load and exports nothing.
 *  2. A production build ships the sentinel, not a URL. The host publishes its
 *     own entry on `window.__CYWEB_HOST__` at boot and the runtime plugin swaps
 *     it in, so one artifact works against any deployment. Shipping
 *     `localhost:5500` would point a deployed app at the END USER's loopback.
 *  3. `runtimePlugins` is the load-bearing half of (2). The resolver file alone
 *     is inert; without registration the app keeps its compiled-in entry.
 *  4. `shared` keys are exact and match the host's five singletons, with
 *     `import: false`. See `shared.ts`.
 *
 * `cyweb-app verify` asserts all four against the built output, because every
 * one of them looks correct in the config when it is wrong.
 */
export const defineCyWebApp = (configFileUrl: string, options: CyWebAppOptions = {}) => {
  const root = fileURLToPath(new URL('.', configFileUrl))
  // Read once, here. The packaging plugin takes its submission metadata from
  // this same snapshot, so what the archive claims and what the build produced
  // cannot come from two different reads of package.json.
  const snapshot = readPackageSnapshot(root)
  const meta = parseAppMeta(snapshot)

  const {
    react: withReact = true,
    exposes: extraExposes = {},
    devHostPageUrl,
    devHostRemoteEntryUrl,
    appStoreZip = false,
    vite: userConfig,
  } = options

  assertNoProtectedOverrides(userConfig)

  if (Object.prototype.hasOwnProperty.call(extraExposes, APP_CONFIG_EXPOSE)) {
    throw new Error(
      `[cyweb] the "exposes" option redefines ${APP_CONFIG_EXPOSE}. That entry ` +
        `is how the host loads the app at all — it is set by defineCyWebApp and ` +
        `must point at src/index.ts.`,
    )
  }

  const devHost = resolveDevHost({ devHostPageUrl, devHostRemoteEntryUrl })
  const devEntry = devHost.remoteEntryUrl

  return defineConfig(async ({ command }) => {
    // Single definition, passed to federation() AND embedded in the manifest —
    // the native manifest does not record a remote's `type`, so without this the
    // verifier has no source for its `type: 'module'` assertion.
    const cywebRemote = {
      type: 'module' as const,
      name: 'cyweb',
      entryGlobalName: 'cyweb',
      shareScope: 'default',
      // DEV ONLY on the left; see (2) in the doc comment above.
      entry: command === 'serve' ? devEntry : CYWEB_HOST_REQUIRED,
    }

    // The federation plugin appends its own SSR runtime plugin to the array it
    // is given, so it receives a COPY — otherwise internal entries leak into
    // the audit field embedded in the manifest below.
    const configuredRuntimePlugins = [RUNTIME_PLUGIN_PATH]
    const configuredShared = withReact ? CYWEB_SHARED : {}

    const plugins: PluginOption[] = []
    if (withReact) {
      // Imported here rather than at module scope: it is an OPTIONAL peer, and
      // a non-React app is not required to have it installed.
      const { default: reactPlugin } = await import('@vitejs/plugin-react')
      plugins.push(reactPlugin())
    }
    plugins.push(
      cywebAppMeta(meta),
      cywebDevInstall(meta, devHost),
      federation({
        name: meta.id,
        filename: 'remoteEntry.js',
        dts: false,
        runtimePlugins: [...configuredRuntimePlugins],
        remotes: { cyweb: cywebRemote },
        exposes: { [APP_CONFIG_EXPOSE]: './src/index.ts', ...extraExposes },
        shared: configuredShared,
        // Emits mf-manifest.json (the verifier's effective-shared source) and
        // embeds the configured records, which the native manifest omits.
        manifest: {
          additionalData: ({ stats }: { stats: unknown }) => {
            Object.assign(stats as Record<string, unknown>, {
              configuredShared,
              // `entry` deliberately included: the verifier asserts a
              // production build ships the sentinel, not a localhost URL.
              configuredRemote: cywebRemote,
              configuredRuntimePlugins: [...configuredRuntimePlugins],
            })
          },
        },
      }),
      // AFTER federation() — it inspects the graph that plugin produces.
      noSharedPayload(),
    )
    if (resolveAppStoreZip(appStoreZip))
      plugins.push(zipForAppStore(meta.id, meta.version))

    // NOTE: `base` is intentionally NOT set. The MF plugin then resolves
    // publicPath to 'auto', so chunks resolve relative to remoteEntry.js
    // wherever it is deployed, with no knowledge of the deploy target.
    const generated: UserConfig = {
      plugins,
      build: {
        outDir: 'dist',
        // esnext so the MF runtime's top-level await is allowed under Rolldown.
        // Also a browser-support decision: it drops any browser without
        // top-level await.
        target: 'esnext',
      },
      server: {
        port: meta.port,
        // Matches the host. A silent port fallback would move this remote off
        // the URL registered with the host, and the failure surfaces later as
        // an unexplained "app not found".
        strictPort: true,
        // Tells Vite to emit ABSOLUTE asset URLs in dev. Without it the host —
        // a different origin — resolves this remote's chunk URLs against its own.
        origin: `http://localhost:${meta.port}`,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },
    }

    return userConfig === undefined ? generated : mergeConfig(generated, userConfig)
  })
}

/**
 * The federation block on its own, for an app that assembles its own config.
 *
 * ADVANCED AND UNSUPPORTED: outside the guarantees `defineCyWebApp` makes. It
 * exists so that taking over one piece does not mean inheriting responsibility
 * for the other three — but nothing verifies that a config built this way is
 * still correct except `cyweb-app verify`.
 */
export const cywebFederation = (args: {
  id: string
  entry: string
  exposes?: Readonly<Record<string, string>>
  shared?: CyWebSharedConfig
}) =>
  federation({
    name: args.id,
    filename: 'remoteEntry.js',
    dts: false,
    runtimePlugins: [RUNTIME_PLUGIN_PATH],
    remotes: {
      cyweb: {
        type: 'module' as const,
        name: 'cyweb',
        entryGlobalName: 'cyweb',
        shareScope: 'default',
        entry: args.entry,
      },
    },
    exposes: { [APP_CONFIG_EXPOSE]: './src/index.ts', ...args.exposes },
    shared: args.shared ?? CYWEB_SHARED,
  })

/** Where the runtime plugin lives, for a caller wiring `runtimePlugins` by hand. */
export const CYWEB_RUNTIME_PLUGIN_PATH = RUNTIME_PLUGIN_PATH
