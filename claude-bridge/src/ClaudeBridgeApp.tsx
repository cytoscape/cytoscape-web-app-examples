/**
 * ClaudeBridgeApp — Cytoscape Web ↔ Claude Code bridge plugin.
 *
 * The MF plugin is a pure observer: it displays a live command log from
 * claude:* custom events dispatched by the MCP server's CDP dispatcher.
 * It does NOT participate in the command execution path.
 *
 * See design/apps/claude-bridge/README.md for architecture details.
 */
import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'
// Your app's identity, from the `cyweb` block and the standard fields in
// package.json. Four values, supplied by the build.
//
// NOT `import packageJson from '../package.json'`, which is what this used to
// be: that pulls the WHOLE file into the browser bundle — devDependencies,
// scripts, every private field — to read one string.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

export const ClaudeBridgeApp: CyAppWithLifecycle = {
  // Identity comes from package.json — change it there, not here. `id` is the
  // Module Federation container name, the CyApp id and the registry id at once,
  // so it is one value rather than three that have to agree.
  id,
  name: displayName,
  description,
  version,
  apiVersion: '1.0',

  resources: [
    {
      slot: 'right-panel',
      id: 'BridgePanel',
      title: 'Claude Bridge',
      component: lazy(() => import('./components/BridgePanel')),
    },
  ],
}

export default ClaudeBridgeApp
