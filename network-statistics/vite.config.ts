import { fileURLToPath } from 'node:url'

import { federation } from '@module-federation/vite'
import { defineConfig, normalizePath } from 'vite'

import { CYWEB_HOST_REQUIRED } from './src/cywebHostSentinel'

const DEV_SERVER_PORT = 3333

// Absolute path: runtimePlugins are imported from a generated virtual module,
// where a relative specifier has no stable base to resolve against.
// normalizePath because the plugin interpolates this straight into an
// `import "<path>"` — a Windows backslash path is an invalid specifier.
const mfRuntimePlugin = normalizePath(
  fileURLToPath(new URL('./src/mfRuntimePlugin.ts', import.meta.url)),
)

// Single definition of the runtime plugins WE register. federation() receives a
// COPY — the plugin appends its own SSR runtime plugin to the array it is
// given, so passing this one directly would let internal entries leak into the
// audit field embedded in the manifest below.
const CONFIGURED_RUNTIME_PLUGINS = [mfRuntimePlugin] as const

/**
 * EMPTY on purpose — this app is the non-React example.
 *
 * It has no UI: it subscribes to network switches and logs topology statistics
 * to the console. Nothing here imports React, ReactDOM, MUI or Emotion, so
 * there is nothing to share, and declaring shares it does not use would be
 * inventing a coupling to the host that does not exist.
 *
 * The Webpack config this replaced DID declare react, react-dom and
 * @mui/material as singletons. That was one of the pre-existing defects this
 * migration fixes, not a behaviour to carry across.
 *
 * `@types/react` stays in devDependencies regardless: the published
 * @cytoscape-web/api-types declarations reference React types, so typecheck
 * needs them even though no runtime code touches React. Do not "clean that up".
 */
export const CONFIGURED_SHARED = {} as const

// NOTE: no react() plugin below either — there is no JSX in this app.
//
// `base` is intentionally NOT set. The MF plugin then resolves publicPath to
// 'auto', so chunks resolve relative to remoteEntry.js wherever it is deployed.
export default defineConfig(({ command }) => {
  // Single definition, passed to federation() AND embedded in the manifest —
  // the native manifest does not record a remote's `type`, so without this the
  // verifier has no source for its `type: 'module'` assertion.
  const CYWEB_REMOTE = {
    // The host is a @module-federation/vite build and emits an ESM
    // remoteEntry.js. `type: 'module'` is REQUIRED — the plugin defaults to
    // 'var' (webpack-style global), which resolves no exports against an ESM
    // host and fails SILENTLY.
    type: 'module' as const,
    name: 'cyweb',
    entryGlobalName: 'cyweb',
    shareScope: 'default',
    // DEV ONLY on the left. A production build deliberately ships the sentinel
    // rather than a localhost URL: without it, a deployed app whose host
    // predates the descriptor would try to connect to the END USER's own
    // loopback address. The sentinel makes mfRuntimePlugin.ts throw instead.
    entry:
      command === 'serve'
        ? 'http://localhost:5500/remoteEntry.js'
        : CYWEB_HOST_REQUIRED,
  }

  return {
    plugins: [
      federation({
        name: 'networkStatistics',
        filename: 'remoteEntry.js',
        dts: false,
        // Replaces the `cyweb` entry above with the URL the running host
        // publishes on window.__CYWEB_HOST__. Registering it here is the
        // load-bearing half: the resolver file alone is inert.
        runtimePlugins: [...CONFIGURED_RUNTIME_PLUGINS],
        remotes: { cyweb: CYWEB_REMOTE },
        exposes: {
          './AppConfig': './src/index.ts',
        },
        shared: CONFIGURED_SHARED,
        // Emits mf-manifest.json (the verifier's effective-shared source) and
        // embeds the configured records, which the native manifest omits.
        manifest: {
          additionalData: ({ stats }) => {
            Object.assign(stats as Record<string, unknown>, {
              configuredShared: CONFIGURED_SHARED,
              // `entry` deliberately included: the verifier asserts a
              // production build ships the sentinel, not a localhost URL.
              configuredRemote: CYWEB_REMOTE,
              configuredRuntimePlugins: [...CONFIGURED_RUNTIME_PLUGINS],
            })
          },
        },
      }),
      // No noSharedPayload() gate: it guards against a shared package's
      // implementation being bundled locally, and this app shares nothing.
      // There is no share key for an import to miss.
    ],
    build: {
      outDir: 'dist',
      // esnext so the MF runtime's top-level await is allowed under Rolldown.
      target: 'esnext',
    },
    server: {
      port: DEV_SERVER_PORT,
      // Matches the host. A silent port fallback would move this remote off the
      // URL registered in the host's apps.local.json, and the failure surfaces
      // later as an unexplained "app not found".
      strictPort: true,
      // Tells Vite to emit ABSOLUTE asset URLs in dev. Without it the host — a
      // different origin — resolves this remote's chunk URLs against its own.
      origin: `http://localhost:${DEV_SERVER_PORT}`,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
  }
})
