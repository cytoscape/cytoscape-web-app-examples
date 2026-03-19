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
import packageJson from '../package.json' with { type: 'json' }

const { version } = packageJson

export const ClaudeBridgeApp: CyAppWithLifecycle = {
  id: 'claudeBridge',
  name: 'Claude Bridge',
  description:
    'Displays a live log of commands sent by Claude Code via the MCP bridge server.',
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
