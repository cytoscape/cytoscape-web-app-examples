import { readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import type { Plugin } from 'vite'

/**
 * Packages the app for submission to the Cytoscape App Store.
 *
 * **Opt-in, and off by default** (`appStoreZip: true`). It used to run on every
 * build, which is why stale `<appId>-<version>.zip` files accumulate in a
 * working tree. A deterministic, signable `cyweb-app package` command belongs
 * with the publishing work; this is the same artifact the migration produced,
 * moved and made deliberate.
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
 * An ALLOWLIST, and an unmatched file fails the build: a future plugin version
 * must not be able to slip a new file class into a public upload by default.
 *
 * The zip is written OUTSIDE the output directory on purpose. A zip inside it
 * would be swept into the next one, and `copy-dist` rejects any file its own
 * publish classes do not name.
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

export const zipForAppStore = (appId: string, version: string): Plugin => {
  // Resolved from Vite rather than from this file's own location: the plugin
  // now lives in node_modules, so `import.meta.url` says nothing about which
  // app is being built.
  let root = process.cwd()
  let outDir = 'dist'

  return {
    name: 'zip-for-app-store',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = config.build.outDir
    },
    // closeBundle, not generateBundle: the files have to exist on disk to be
    // zipped, and generateBundle runs before anything is written.
    //
    // async, and adm-zip is imported HERE rather than at module scope. This
    // plugin is opt-in and off by default, so a static import would make every
    // consumer of this package install a dependency almost none of them use —
    // and carry its advisories in their tree for a feature they never turned
    // on. Loading it at the point of use is what lets adm-zip be an OPTIONAL
    // peer: present only for the builds that actually produce a zip.
    async closeBundle() {
      const { default: AdmZip } = await import('adm-zip').catch(() => {
        this.error(
          `[zip-for-app-store] appStoreZip is on but adm-zip is not installed. ` +
            `It is an optional peer dependency — run: npm install --save-dev adm-zip`,
        )
        // this.error throws; the return keeps the type checker honest.
        return { default: null as never }
      })

      const distDir = resolve(root, outDir)
      const zipPath = resolve(root, `${appId}-${version}.zip`)

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
          `[zip-for-app-store] ${outDir}/ contains files no publish class covers:\n` +
            unmatched.map((f) => `    ${f}`).join('\n') +
            `\n  Classify them before shipping — failing is deliberate, so a ` +
            `new file class is never uploaded by accident.`,
        )
      }

      rmSync(zipPath, { force: true })
      zip.writeZip(zipPath)
      this.info(
        `[zip-for-app-store] ${appId}-${version}.zip — ${included} files, ready to upload`,
      )
    },
  }
}
