import type { Plugin } from 'vite'

import { EXPOSED_META_FIELDS, type CyWebAppMeta } from '../meta/index.js'

const VIRTUAL_ID = 'virtual:cyweb-app-meta'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

/**
 * Serves the app's identity to its own sources as `virtual:cyweb-app-meta`.
 *
 * Exists so app code never imports package.json. That import — which every
 * example used for its version — pulls the WHOLE file into the browser bundle:
 * devDependencies, scripts, and anything else the file happens to carry. Only
 * the four fields in `EXPOSED_META_FIELDS` reach the browser through here.
 */
export const cywebAppMeta = (meta: CyWebAppMeta): Plugin => ({
  name: 'cyweb-app-meta',
  resolveId(id) {
    return id === VIRTUAL_ID ? RESOLVED_ID : undefined
  },
  load(id) {
    if (id !== RESOLVED_ID) return undefined
    return `${EXPOSED_META_FIELDS.map(
      (field) => `export const ${field} = ${JSON.stringify(meta[field])}`,
    ).join('\n')}\n`
  },
})
