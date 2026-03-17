/**
 * TemplateApp — Cytoscape Web plugin with panel, menu action, and context menu.
 *
 * Copy this file and update:
 *   1. `id`          → must match the Module Federation `name` in webpack.config.js
 *   2. `name`        → human-readable name shown in the host's App Settings
 *   3. `description` → one-line summary
 *   4. `resources`   → add/remove panels and menu items
 *   5. `mount()`     → register context menus, event listeners, etc.
 *   6. `unmount()`   → clean up event listeners from mount()
 *
 * Resources (panels and menu items) are registered declaratively — the host
 * renders them automatically. Context menus need `apis` access, so they are
 * registered in mount() instead.
 *
 * See the hello-world app for examples of all 10 domain APIs.
 * See guides/ for the full App Developer Guide.
 */
import { lazy } from 'react'

import { AppContext, CyAppWithLifecycle } from 'cyweb/ApiTypes'
import packageJson from '../package.json'

import { registerSelectNeighbors } from './contextMenus'

const { version } = packageJson

// TODO: Rename this export and update src/index.ts accordingly.
export const TemplateApp: CyAppWithLifecycle = {
  // TODO: Change id to match your Module Federation name.
  id: 'template',
  // TODO: Change name and description.
  name: 'App Template',
  description:
    'Boilerplate app with a panel, a menu action, a context menu item, ' +
    'and the recommended Cytoscape Web plugin shape.',
  version,
  apiVersion: '1.0',

  // ── Declarative resource registration ──────────────────────────────────
  // Panels and menu items are declared here. The host registers them
  // automatically — no mount() needed for these.
  resources: [
    {
      slot: 'right-panel',
      id: 'TemplatePanel',
      title: 'Template', // TODO: Tab title shown in the right panel.
      component: lazy(() => import('./components/TemplatePanel')),
    },
    {
      slot: 'apps-menu',
      id: 'TemplateMenuItem',
      title: 'Template Action', // TODO: Label shown in the Apps dropdown.
      component: lazy(() => import('./components/TemplateMenuItem')),
      closeOnAction: true, // Auto-close the dropdown after action.
    },
  ],

  // ── Lifecycle hooks ────────────────────────────────────────────────────
  // mount() is called once after the app's resources are registered.
  // Use it for context menus (handlers need api access) and event listeners.

  mount(context: AppContext): void {
    // Context menu items are registered here because their handlers need
    // access to context.apis. The host auto-cleans all items when the app
    // is disabled — no explicit removal in unmount() needed.
    registerSelectNeighbors(context)

    // TODO: Add more context menu registrations or event listeners here.
    // See src/contextMenus.ts for the pattern.
  },

  unmount(): void {
    // Only manual cleanup (e.g. event listeners) goes here.
    // Context menu items and resources are auto-cleaned by the host.
    //
    // if (_handler !== null) {
    //   window.removeEventListener('network:switched', _handler)
    //   _handler = null
    // }
  },
}
