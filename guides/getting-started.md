# Getting Started — Cytoscape Web App Development

This guide walks you through creating a Cytoscape Web app from scratch.
By the end, you will have a running plugin with a panel, a menu item, and
a context menu action — all loaded into the host via Module Federation.

> **Prerequisites:** Node.js 24+ (see `.nvmrc`), npm 10+, familiarity with
> React and TypeScript.

---

## 1. Scaffold a New App

```bash
npm create cytoscape-app my-app
cd my-app
```

Templates: `panel` (the default), `menu`, `context-menu`, `non-react`, `full`.
Every prompt has a flag, and `--yes` never asks:

```bash
npm create cytoscape-app my-app -- \
  --yes --id myApp --display-name "My App" --template panel --port 6000
```

> Copying `project-template` from
> [cytoscape-web-app-examples](https://github.com/cytoscape/cytoscape-web-app-examples)
> by hand still works, and gives you the same shape.

The generator writes your app's identity into `package.json` — **once**, in one
place:

```jsonc
{
  "name": "@you/my-app",
  "version": "0.1.0",
  "description": "What your app does — shown in App Settings",
  "private": true,
  "cyweb": {
    "id": "myApp",          // Module Federation container name AND CyApp.id
    "displayName": "My App",
    "port": 6000            // must be free; the examples use 2222/3333/5555/6100/7000
  }
}
```

`cyweb.id` has to be a valid JavaScript identifier — the host applies the same
rule when it installs the app, so anything else is rejected there.

---

## 2. Configure Module Federation

You do not. `vite.config.ts` is three lines and reads the block above:

```typescript
import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url)
```

That one call sets up the whole federation configuration. Four parts of it are
load-bearing, and each fails in a way that is hard to read — which is why they
are in a package rather than in your config:

| What | Why it matters |
| --- | --- |
| `remotes.cyweb.type: 'module'` | The host emits an ESM `remoteEntry.js`. The plugin's default (`'var'`) resolves **no exports** against it and fails **silently** — the remote appears to load and exports nothing |
| A production entry that is a **sentinel**, not a URL | So one build works against every deployment. Shipping `localhost:5500` would point a deployed app at the end user's own loopback |
| `runtimePlugins` | The load-bearing half of the sentinel. The resolver is inert unless it is registered; the app then keeps whatever entry was compiled in |
| `shared`, exact keys, `import: false` | Five singletons the host provides. Import from `@mui/material`, never `@mui/material/Box`, or a second MUI ends up inside your bundle |

The host publishes its own `remoteEntry.js` address on `window.__CYWEB_HOST__`
at boot, and the runtime plugin substitutes it before any remote resolves. That
is what makes one artifact work against production, a staging host, or a
colleague's laptop.

Need to add a plugin, an alias or a `define`?

```typescript
export default defineCyWebApp(import.meta.url, {
  vite: { resolve: { alias: { '@': '/src' } } },
})
```

It is merged last. Setting a field the SDK owns fails the build and names the
path, rather than silently winning or silently losing.

A non-React app passes `{ react: false }`; an app that federates more than
`./AppConfig` passes `{ exposes: { … } }`.

After a build, `npx cyweb-app verify` asserts all four against the built output,
because every one of them looks correct in a config file when it is wrong. It
reads your app directory and nothing else, so it works in your own project:

```bash
npm run build && npx cyweb-app verify
```

---

## 3. Define Your App

Create `src/MyApp.ts`:

```typescript
import { lazy } from 'react'
import type {
  CyAppWithLifecycle,
  AppContext,
  ResourceDeclaration,
} from 'cyweb/ApiTypes'

// Identity from package.json — the `cyweb` block and the standard fields,
// handed over by the build. Do NOT `import packageJson from '../package.json'`:
// that pulls the whole file, devDependencies included, into your browser bundle
// to read one string.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

export const MyApp: CyAppWithLifecycle = {
  // Written once, in package.json. `id` is the federation container name, this
  // CyApp's id and the id the host registers, all at the same time.
  id,
  name: displayName,
  description,
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
import type { MenuItemHostProps } from 'cyweb/ApiTypes'

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

## 5. Install into a Local Host

**You do not edit anything in the host repository.** Your dev server serves a
one-entry app manifest at `/cyweb-app.json`, generated from your `package.json`
on every request, and prints the link that installs it:

```
  Cytoscape Web app myApp — http://localhost:6000

  Install it into a local host:
  http://localhost:5500/?installApp=http://localhost:6000/cyweb-app.json
```

Open that URL with the host running and confirm the install. The app lands in
your workspace, and you enable it under **Apps → App Settings**.

The host has accepted `?installApp=<manifestUrl>` all along — it is the same
path the App Store will use. `installGate` allows a localhost app URL when the
host is itself on localhost, which is what makes this work in development and,
deliberately, not from a deployed host.

Because the manifest is generated rather than written to a file, changing
`cyweb.port` or your version updates it on the next request; there is no second
copy to keep in step.

> **Two other routes exist**, both in **Apps → App Settings**, and both take the
> same `/cyweb-app.json` URL: *Install from URL* for a single app, and
> *Manifest Source* to point the host at a catalog of several. The deep link is
> just the one that needs no clicking.

---

## 5b. Package for the App Store

`npm run build` writes **`<appId>-<version>.zip`** next to your `package.json`
— e.g. `myApp-0.1.0.zip`. That is the file the App Store submission page takes;
no separate packaging step.

It contains the browser publish set rather than all of `dist/`, so the build
machine's absolute paths (`mf-manifest.json`), build metadata (`mf-stats.json`)
and the Node-only SSR artifacts stay out of a public upload. The list is an
allowlist in `@cytoscape-web/app-runtime`, and an unrecognised file fails the
build instead of being shipped.

> The zip is **off by default** — pass `{ appStoreZip: true }` to
> `defineCyWebApp`. It used to run on every build, which left stale archives
> next to every package.json.

---

## 6. Run Both Dev Servers

```bash
# Terminal 1 — Host (port 5500)
cd cytoscape-web && npm run dev

# Terminal 2 — Your app
cd my-app && npm run dev
```

Then open the install link your app printed (step 5). Your panel appears in the
right-side panel area, and your menu item under the **Apps** dropdown.

> Reloading the host page picks up app changes; Vite's HMR does not cross the
> federation boundary.

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
