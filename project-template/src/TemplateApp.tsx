/**
 * TemplateApp — Minimal Cytoscape Web plugin configuration.
 *
 * Copy this file and update:
 *   1. `id`          → must match the Module Federation `name` in webpack.config.js
 *   2. `name`        → human-readable name shown in the host's App Settings
 *   3. `description` → one-line summary
 *   4. `resources`   → add/remove panels and menu items
 *   5. `mount()`     → optional: register context menus, event listeners, etc.
 *   6. `unmount()`   → optional: clean up event listeners from mount()
 *
 * Resources (panels and menu items) are registered declaratively — the host
 * renders them automatically. Context menus need `apis` access, so they are
 * registered in mount() instead.
 *
 * See the hello-world app for examples of all 10 domain APIs.
 * See guides/ for the full App Developer Guide.
 */
import { lazy } from 'react'

import { CyAppWithLifecycle } from 'cyweb/ApiTypes'
import packageJson from '../package.json'

const { version } = packageJson

// TODO: Rename this export and update src/index.ts accordingly.
export const TemplateApp: CyAppWithLifecycle = {
  // TODO: Change id to match your Module Federation name.
  id: 'template',
  // TODO: Change name and description.
  name: 'App Template',
  description:
    'Boilerplate app with a minimal panel, a simple menu action, and the ' +
    'recommended Cytoscape Web plugin shape.',
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

  // ── Optional lifecycle hooks ───────────────────────────────────────────
  // Uncomment mount/unmount to register context menus or event listeners.
  //
  // mount(context) {
  //   // context.apis has all 10 domain APIs + contextMenu + resource.
  //   // Register context menu items here (they need apis access):
  //   context.apis.contextMenu.addContextMenuItem({
  //     label: 'My App: Inspect Node',
  //     targetTypes: ['node'],
  //     handler: (ctx) => { /* use context.apis here */ },
  //   })
  //
  //   // Register app-scoped event listeners:
  //   _handler = (e) => { /* ... */ }
  //   window.addEventListener('network:switched', _handler)
  // },
  //
  // unmount() {
  //   // Only event listeners need manual cleanup.
  //   // Resources and context menu items are auto-cleaned by the host.
  //   window.removeEventListener('network:switched', _handler)
  //   _handler = null
  // },
}
