import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import AdmZip from 'adm-zip'
import { defineConfig, normalizePath, type Plugin } from 'vite'

import { CYWEB_HOST_REQUIRED } from './src/cywebHostSentinel'

// The app's identity in
// three places that must agree — the federation container name, `CyApp.id` in
// src/TemplateApp.tsx, and the `id` in the host's apps.json — so it is one
// constant rather than a literal repeated per use site.
const APP_ID = 'networkStatistics'

const DEV_SERVER_PORT = 3333

// Read rather than imported: vite.config.ts is type-checked by
// tsconfig.node.json, which does not enable resolveJsonModule.
const { version: APP_VERSION } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

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

/**
 * Packages the app for submission to the Cytoscape App Store.
 *
 * The store takes a zip upload, so `npm run build` leaves an
 * `<appId>-<version>.zip` next to package.json ready to attach — see
 * cytoscape/cytoscape-web#642.
 *
 * It contains the BROWSER publish set, not the whole of dist/. Three things in
 * dist/ have no business on a public store and are excluded deliberately:
 *
 *   - `mf-manifest.json` embeds absolute build-machine paths (your home
 *     directory and username) in `configuredRuntimePlugins`.
 *   - `mf-stats.json` is build metadata nothing fetches at runtime.
 *   - the SSR entry, loader and module-runner are ~34 kB of Node-only code
 *     guarded by `typeof window === 'undefined'` — unreachable in a browser.
 *
 * This is the same set the repository publishes to GitHub Pages, so what the
 * store serves matches what the examples site serves.
 *
 * An ALLOWLIST, and an unmatched file fails the build: a future plugin version
 * must not be able to slip a new file class into a public upload by default.
 *
 * The zip is written OUTSIDE dist/ on purpose. A zip inside dist/ would be
 * swept into the next one, and the repository's copy-dist rejects any file its
 * own publish classes do not name.
 */
const APP_STORE_PUBLISH_CLASSES: Array<{
  test: (path: string) => boolean
  publish: boolean
}> = [
  // SSR first: these live under assets/ too, so an unordered table makes
  // precedence depend on how the loop happens to be written.
  { test: (p) => p === 'remoteEntry.ssr.js', publish: false },
  { test: (p) => /^assets\/ssrEntryLoader-/.test(p), publish: false },
  { test: (p) => /^assets\/module-runner-/.test(p), publish: false },
  { test: (p) => /^assets\/virtual_mf-exposes-ssr/.test(p), publish: false },

  { test: (p) => p === 'remoteEntry.js', publish: true },
  { test: (p) => p === 'index.html', publish: true },
  { test: (p) => p.startsWith('assets/'), publish: true },

  {
    test: (p) => p === 'mf-manifest.json' || p === 'mf-stats.json',
    publish: false,
  },
  { test: (p) => p.startsWith('.vite/'), publish: false },
]

const zipForAppStore = (appId: string, version: string): Plugin => ({
  name: 'zip-for-app-store',
  apply: 'build',
  // closeBundle, not generateBundle: the files have to exist on disk to be
  // zipped, and generateBundle runs before anything is written.
  closeBundle() {
    const distDir = fileURLToPath(new URL('./dist', import.meta.url))
    const zipPath = fileURLToPath(
      new URL(`./${appId}-${version}.zip`, import.meta.url),
    )

    const walk = (dir: string, prefix = ''): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
        return entry.isDirectory() ? walk(join(dir, entry.name), rel) : [rel]
      })

    const zip = new AdmZip()
    const unmatched: string[] = []
    let included = 0

    for (const file of walk(distDir)) {
      const rule = APP_STORE_PUBLISH_CLASSES.find((r) => r.test(file))
      if (rule === undefined) {
        unmatched.push(file)
      } else if (rule.publish) {
        zip.addLocalFile(
          join(distDir, file),
          dirname(file) === '.' ? '' : dirname(file),
        )
        included += 1
      }
    }

    if (unmatched.length > 0) {
      this.error(
        `[zip-for-app-store] dist/ contains files no publish class covers:\n` +
          unmatched.map((f) => `    ${f}`).join('\n') +
          `\n  Classify them in vite.config.ts before shipping — failing is ` +
          `deliberate, so a new file class is never uploaded by accident.`,
      )
    }

    rmSync(zipPath, { force: true })
    zip.writeZip(zipPath)
    this.info(
      `[zip-for-app-store] ${appId}-${version}.zip — ${included} files, ready to upload`,
    )
  },
})

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
        name: APP_ID,
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
      zipForAppStore(APP_ID, APP_VERSION),
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
