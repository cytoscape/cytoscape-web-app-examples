/**
 * TemplateApp — Cytoscape Web plugin with panel, menu action, and context menu.
 *
 * Copy this file and update:
 *   1. `id`          → must match the Module Federation `name` in vite.config.ts
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
// Your app's identity, from the `cyweb` block and the standard fields in
// package.json. Four values, supplied by the build.
//
// NOT `import packageJson from '../package.json'`, which is what this used to
// be: that pulls the WHOLE file into the browser bundle — devDependencies,
// scripts, every private field — to read one string.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

import { registerSelectNeighbors } from './contextMenus'

// TODO: Rename this export and update src/index.ts accordingly.
export const TemplateApp: CyAppWithLifecycle = {
  // Identity comes from package.json — change it there, not here. `id` is the
  // Module Federation container name, the CyApp id and the registry id at once,
  // so it is one value rather than three that have to agree.
  id,
  name: displayName,
  description,
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
