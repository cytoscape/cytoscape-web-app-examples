import type { Plugin } from 'vite'

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
 *
 * Note it needs no knowledge of the app root — the module ids it inspects are
 * already absolute.
 */
export const noSharedPayload = (): Plugin => ({
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
