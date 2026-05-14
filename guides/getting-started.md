# Getting Started — Cytoscape Web App Development

This guide walks you through creating a Cytoscape Web app from scratch.
By the end, you will have a running plugin with a panel, a menu item, and
a context menu action — all loaded into the host via Module Federation.

> **Prerequisites:** Node.js 18+, npm 9+, familiarity with React and TypeScript.

---

## 1. Scaffold a New App

The fastest way to start is to copy the **project-template** from
[cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples):

```bash
cp -r project-template my-app
cd my-app
```

Update the following in `package.json`:

```jsonc
{
  "name": "@cytoscape-web/my-app",
  "version": "0.1.0",
  "private": true
}
```

Install dependencies (including the type package):

```bash
npm install
npm install --save-dev @cytoscape-web/api-types
```

---

## 2. Configure Module Federation

Edit `webpack.config.js`:

```js
new ModuleFederationPlugin({
  // Unique name — must match the `id` field in your CyApp object
  // and the `name` field in apps.json / apps.local.json.
  name: 'myApp',

  filename: 'remoteEntry.js',

  remotes: {
    // Points to the host's remoteEntry.js
    cyweb: 'cyweb@http://localhost:5500/remoteEntry.js',
  },

  exposes: {
    // The host loads this entry point to discover your app
    './AppConfig': './src/index.ts',
  },

  shared: {
    // Singletons provided by the host — do NOT bundle your own copies
    react: { singleton: true, requiredVersion: deps.react },
    'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
    '@mui/material': {
      singleton: true,
      requiredVersion: deps['@mui/material'],
    },
  },
}),
```

Choose a unique dev server port (e.g. 3333) in the `devServer` section.

---

## 3. Define Your App

Create `src/MyApp.ts`:

```typescript
import { lazy } from 'react'
import type {
  CyAppWithLifecycle,
  AppContext,
  ResourceDeclaration,
} from '@cytoscape-web/api-types'

const version = '0.1.0'

export const MyApp: CyAppWithLifecycle = {
  // Must match the `name` in webpack ModuleFederationPlugin
  id: 'myApp',
  name: 'My App',
  description: 'A sample Cytoscape Web plugin.',
  version,
  apiVersion: '1.0',

  // ── Declarative resource registration ──────────────────────
  // Panels and menu items are declared here.
  // The host registers them automatically — no mount() needed.
  resources: [
    {
      slot: 'right-panel',
      id: 'MainPanel',
      title: 'My App',
      component: lazy(() => import('./components/MainPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'MyMenuItem',
      title: 'My Action',
      component: lazy(() => import('./components/MyMenuItem')),
      closeOnAction: true,  // auto-close the dropdown after click
    },
  ],

  // ── Imperative registration (for context menus, events) ────
  mount(context: AppContext): void {
    // Context menu items need access to `context.apis`, so they
    // are registered here instead of in `resources`.
    context.apis.contextMenu.addContextMenuItem({
      label: 'My App: Inspect Node',
      targetTypes: ['node'],
      handler: (ctx) => {
        const result = context.apis.element.getNode(ctx.networkId, ctx.id!)
        if (result.success) {
          console.info('Node data:', result.data)
        }
      },
    })
  },

  // Only manual cleanup is needed here (e.g. event listeners).
  // Context menu items and resources are auto-cleaned by the host.
  unmount(): void {
    // nothing to clean up in this example
  },
}
```

Export it from `src/index.ts`:

```typescript
import { MyApp } from './MyApp'
export default MyApp
```

---

## 4. Create Components

### Panel Component (`src/components/MainPanel.tsx`)

```tsx
const MainPanel = () => {
  return (
    <div style={{ padding: 16 }}>
      <h3>My App Panel</h3>
      <p>This panel is rendered in the right-side App Panel area.</p>
    </div>
  )
}

export default MainPanel
```

### Menu Item Component (`src/components/MyMenuItem.tsx`)

```tsx
import type { MenuItemHostProps } from '@cytoscape-web/api-types'

const MyMenuItem = ({ handleClose }: MenuItemHostProps) => {
  const handleClick = () => {
    console.info('Menu action triggered!')
    // If closeOnAction: true was set, the dropdown closes automatically.
    // Otherwise, call handleClose() manually.
  }

  return (
    <li onClick={handleClick} style={{ padding: '8px 16px', cursor: 'pointer' }}>
      My Action
    </li>
  )
}

export default MyMenuItem
```

---

## 5. Register with the Host

Add your app to the host's plugin registry. For local development,
edit `src/assets/apps.local.json` in the `cytoscape-web` repo:

```json
[
  { "name": "hello", "url": "http://localhost:2222/remoteEntry.js" },
  { "name": "networkWorkflows", "url": "http://localhost:7000/remoteEntry.js" },
  { "name": "createNetwork", "url": "http://localhost:5555/remoteEntry.js" },
  { "name": "myApp", "url": "http://localhost:3333/remoteEntry.js" }
]
```

> The `name` field must match your app's `id` and webpack `name`.

---

## 6. Run Both Dev Servers

```bash
# Terminal 1 — Host (port 5500)
cd cytoscape-web && npm run dev

# Terminal 2 — Your app (port 3333)
cd my-app && npm run dev
```

Your panel should appear in the right-side panel area, and your menu item
under the **Apps** dropdown.

---

## 7. What the Host Provides

When your app runs inside Cytoscape Web, React, ReactDOM, and MUI are
provided by the host as shared singletons. Your bundle does NOT include
them — this keeps plugin bundles small and avoids version conflicts.

You can import host APIs via the `cyweb/` prefix:

```typescript
// Direct import (for standalone hooks in components)
import { useElementApi } from 'cyweb/ElementApi'
import { useCyWebEvent } from 'cyweb/EventBus'
```

Or use `useAppContext()` for per-app API access (recommended):

```typescript
import { useAppContext } from 'cyweb/AppIdContext'

const MyComponent = () => {
  const ctx = useAppContext()
  if (!ctx) return null

  const { apis } = ctx
  // apis.element, apis.network, apis.selection, ...
  // apis.resource — per-app resource registration
  // apis.contextMenu — per-app context menu (auto-cleaned)
}
```

---

## Next Steps

- [Architecture Overview](./architecture-overview.md) — Module Federation, type system, API layers
- [Resource Registration Patterns](./registration-patterns.md) — Panels, menus, context menus
- [App Lifecycle & Cleanup](./lifecycle-and-cleanup.md) — mount/unmount, event listeners, cleanup
- [Troubleshooting & FAQ](./troubleshooting.md) — Common issues and solutions
