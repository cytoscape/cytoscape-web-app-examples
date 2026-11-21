import type { Plugin } from 'vite'

import type { CyWebAppMeta } from '../meta/index.js'
import { DEV_HOST_ENV, type ResolvedDevHost } from './devHost.js'

/**
 * The path the dev server answers with this app's install manifest.
 *
 * SERVED, not written to public/. A tracked file would go stale the moment the
 * port or version changed, and — decisively — `public/` is copied into the build
 * output, where the App Store publish allowlist matches no rule for it and fails
 * the build on purpose.
 */
export const DEV_MANIFEST_PATH = '/cyweb-app.json'

/**
 * A single-entry app manifest, the shape the host's `parseSingleEntryManifest`
 * expects.
 *
 * Pure so it can be tested without a server. `origin` is the app's own dev
 * origin; the host fetches this document and then loads `url` as code, so the
 * two are deliberately separate values rather than one string built twice.
 */
export const buildInstallManifest = (
  meta: CyWebAppMeta,
  origin: string,
): Array<Record<string, string>> => [
  {
    id: meta.id,
    name: meta.displayName,
    url: new URL('remoteEntry.js', `${origin}/`).href,
    version: meta.version,
    ...(meta.description === '' ? {} : { description: meta.description }),
  },
]

/**
 * The deep link that installs this app into a running local host.
 *
 * Composed with the URL API rather than by concatenation: a host served under a
 * base path keeps `?installApp=` at its own root, and joining strings silently
 * produces a URL that 404s or, worse, points somewhere real and wrong.
 */
export const buildInstallUrl = (hostPageUrl: string, manifestUrl: string): string => {
  const url = new URL(hostPageUrl)
  url.searchParams.set('installApp', manifestUrl)
  return url.href
}

/**
 * Serves the install manifest in development and prints how to use it.
 *
 * This is the whole of what used to be step 4 of "Build Your First App" —
 * "add an entry to `cytoscape-web/src/assets/apps.local.json`", a git-tracked
 * file in a repository the developer does not own. The host has accepted a
 * manifest URL through `?installApp=` all along; nothing here needed building on
 * the host side, only pointing at.
 */
export const cywebDevInstall = (
  meta: CyWebAppMeta,
  host: ResolvedDevHost,
): Plugin => ({
  name: 'cyweb-dev-install',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(DEV_MANIFEST_PATH, (_req, res) => {
      const origin = `http://localhost:${meta.port}`
      res.setHeader('Content-Type', 'application/json')
      // The host is a different origin and fetches this before it loads any
      // code, so it needs the same CORS treatment as the bundle itself.
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.end(JSON.stringify(buildInstallManifest(meta, origin), null, 2))
    })

    // AFTER the server is actually listening, so the port printed is the port
    // bound. Vite resolves `strictPort` by then, and a banner naming a port
    // nothing answers on is worse than no banner.
    server.httpServer?.once('listening', () => {
      const origin = `http://localhost:${meta.port}`
      const manifestUrl = new URL(DEV_MANIFEST_PATH, origin).href
      // Named so the developer can tell which host this session is pointed at.
      // With CYWEB_DEV_HOST set it is not the one in their config file, and a
      // link they do not recognise is the first sign of that.
      const where = host.fromEnv ? ` (${DEV_HOST_ENV})` : ''

      // Only when the host is off-loopback. A localhost host reaching a
      // localhost app never crosses an address-space boundary, so the browser
      // asks nothing and the note would be noise on the common path.
      const permissionNote = host.needsLocalNetworkPermission
        ? `\n  The browser will ask this host for permission to "access other apps\n` +
          `  and services on this device" — that is this dev server. Click Allow.\n`
        : ''

      server.config.logger.info(
        `\n  Cytoscape Web app ${meta.id} — ${origin}\n` +
          `\n  Install it into ${host.pageUrl}${where}:\n` +
          `  ${buildInstallUrl(host.pageUrl, manifestUrl)}\n` +
          permissionNote,
      )
    })
  },
})
