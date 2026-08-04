import { fileURLToPath } from 'node:url'

import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, normalizePath, type Plugin } from 'vite'

import { CYWEB_HOST_REQUIRED } from './src/cywebHostSentinel'

// TODO: Change to an unused port.
const DEV_SERVER_PORT = 5555

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

// THE single definition of this app's shared configuration. Passed to
// federation() AND embedded into mf-manifest.json, so the verifier compares
// against exactly what the plugin received — a second constant could drift.
//
// Keys are EXACT (no trailing slash) and match the host's
// FEDERATION_SHARED_SINGLETONS. This only works because the sources import the
// MUI ROOT module: `import { Box } from '@mui/material'`. A `@mui/material/Box`
// subpath import silently bundles MUI locally instead — the plugin matches
// share keys exactly, and MUI is not in its COMMON_SHARED_SUBPATHS list. The
// trailing-slash key is NOT the fix: it materializes a share entry per subpath
// actually referenced, and the runtime looks providers up by exact key, so a
// subpath resolves only if the HOST imports it too. `npm run check:imports`
// bans the subpath form; `noSharedPayload` below catches it if the lint is
// bypassed. `@mui/icons-material` is banned outright — the host does not share
// it, and one icon pulls in SvgIcon plus the Emotion engine behind it.
//
// `import: false` — do NOT bundle a local fallback. Those fallbacks are
// STATICALLY imported by the exposed module, so they cost transfer and parse
// time on every load even when the host's singleton is the instance used.
//
// requiredVersion is declared compatibility metadata, not enforcement: the
// runtime takes the first registered provider with no semver comparison.
export const CONFIGURED_SHARED = {
  react: {
    singleton: true,
    import: false as const,
    requiredVersion: '^18.3.1',
  },
  'react-dom': {
    singleton: true,
    import: false as const,
    requiredVersion: '^18.3.1',
  },
  '@mui/material': {
    singleton: true,
    import: false as const,
    requiredVersion: '^5.18.0',
  },
  '@emotion/react': {
    singleton: true,
    import: false as const,
    requiredVersion: '^11.10.4',
  },
  '@emotion/styled': {
    singleton: true,
    import: false as const,
    requiredVersion: '^11.10.4',
  },
} as const

// NAMESPACE prefixes, not package names. A list of exact packages lets
// @mui/utils (and anything else under @mui or @emotion) through, dragging the
// implementation back into the bundle.
const BANNED_PREFIXES = [
  '/node_modules/@mui/',
  '/node_modules/@emotion/',
  '/node_modules/react/',
  '/node_modules/react-dom/',
]

/**
 * Build-time gate: fail if a shared package's implementation ends up in this
 * remote's chunks.
 *
 * `enforce: 'post'` so it inspects the graph AFTER the federation plugin's
 * rewriting; `apply: 'build'` because dev serves unbundled modules. It reads
 * `chunk.modules` keys, which is the ONLY place this is answerable — module
 * paths do not survive minification, so a post-hoc scan of the built files
 * would miss a genuinely bundled MUI while flagging the dead absolute-path
 * string literals the SSR loader embeds in remoteEntry.js on a correct build.
 *
 * Physical node_modules paths only: the plugin's own `virtual:mf:…loadShare…`
 * wrappers legitimately name these packages.
 */
const noSharedPayload = (): Plugin => ({
  name: 'no-shared-payload',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk') continue
      for (const id of Object.keys(chunk.modules)) {
        const path = id.replace(/\\/g, '/')
        if (path.startsWith('\0') || path.includes('virtual:mf')) continue
        const hit = BANNED_PREFIXES.find((prefix) => path.includes(prefix))
        if (hit !== undefined) {
          this.error(
            `[no-shared-payload] ${hit} bundled into ${chunk.fileName} ` +
              `via ${id}. Shared packages must come from the host — check for ` +
              `a subpath import such as '@mui/material/Box'.`,
          )
        }
      }
    }
  },
})

// NOTE: `base` is intentionally NOT set anywhere below. The MF plugin then
// resolves publicPath to 'auto', so chunks resolve relative to remoteEntry.js
// wherever it is deployed — parity with the old `output.publicPath: 'auto'`,
// and it needs no knowledge of the deploy target. A fully absolute base would
// also work but re-pins the artifact to one deployment, which is exactly what
// the runtime host resolution removes.
export default defineConfig(({ command }) => {
  // Single definition, passed to federation() AND embedded in the manifest —
  // the native manifest does not record a remote's `type`, so without this the
  // verifier has no source for its `type: 'module'` assertion.
  const CYWEB_REMOTE = {
    // The host is a @module-federation/vite build and emits an ESM
    // remoteEntry.js. `type: 'module'` is REQUIRED — the plugin defaults to
    // 'var' (webpack-style global), which resolves no exports against an ESM
    // host and fails SILENTLY. This is the most error-prone line in the file
    // and the one with the least legible failure.
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
      react(),
      federation({
        name: 'template', // TODO: Change to your unique camelCase app name.
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
      // AFTER federation() — it inspects the graph that plugin produces.
      noSharedPayload(),
    ],
    build: {
      outDir: 'dist',
      // esnext so the MF runtime's top-level await is allowed under Rolldown.
      // Also a browser-support decision: it drops any browser without
      // top-level await.
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
