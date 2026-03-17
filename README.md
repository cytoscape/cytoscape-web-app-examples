# Developing Apps for _[Cytoscape Web](https://web.cytoscape.org/)_

- API version 1.0 beta: March 2026

> Reference implementations and documentation for Cytoscape Web app development

- [Live examples](https://cytoscape.org/cytoscape-web-app-examples/)
- [API types package (`@cytoscape-web/api-types`)](https://www.npmjs.com/package/@cytoscape-web/api-types)

## Introduction

This repository is for third-party developers who want to build apps for
[Cytoscape Web](https://web.cytoscape.org).

You do not need to change the host source code. Your app is loaded by the host
through Webpack Module Federation. Apps can add:

- panel components in the right-side **App Panel**
- menu items in the **Apps** dropdown
- context menu actions for right-click workflows

---

## Quick Start

### Set up the local workspace

Both the **host application** and this **examples repository** are needed side by side.
The host runs the Cytoscape Web UI at `localhost:5500` and hot-reloads your plugin
changes via Module Federation — edit a component, save, and see the result instantly
in the browser without rebuilding the host.

```bash
mkdir cytoscape-web-dev && cd cytoscape-web-dev
git clone https://github.com/cytoscape/cytoscape-web.git
git clone https://github.com/cytoscape/cytoscape-web-app-examples.git
```

### 1. Run the example apps

```bash
cd cytoscape-web-app-examples
npm install
npm run dev
```

### 2. Run the host with the local app registry

```bash
cd cytoscape-web
npm install
npm run dev:local
```

### 3. Check that it works

1. Open `http://localhost:5500`
2. Open **Apps** -> **App Settings**
3. Enable one of the example apps
4. Open the **Apps** menu or the right-side **App Panel**

> **Publishing to the public Cytoscape Web site:**
> The production instance of Cytoscape Web loads apps from a curated allowlist
> (`apps.json`) maintained by the core team. There are plans for a dynamic app
> store in the future, but for now app registration is manual. If you would like
> to publish your app, please
> [contact the Cytoscape team](https://cytoscape.org/contact.html).

---

## Build Your First App

Copy [project-template/](project-template/) and follow the 5 steps:

```bash
cp -r project-template my-app && cd my-app
```

1. **`package.json`** — change `name` and `version`
2. **`webpack.config.js`** — change `name` and `DEV_SERVER_PORT`
3. **`src/TemplateApp.tsx`** — change `id` (must match MF name), `name`, `resources`
4. **Host registry** — add entry in `cytoscape-web/src/assets/apps.local.json`:
   ```json
   { "name": "myApp", "url": "http://localhost:6000/remoteEntry.js" }
   ```
5. **Verify** — `npm run dev`, then confirm in browser

See [project-template/README.md](project-template/README.md) for details.

---

## App Entry Point

Every app exports one `CyAppWithLifecycle` object:

```typescript
import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'
import packageJson from '../package.json'

const { version } = packageJson

export const MyApp: CyAppWithLifecycle = {
  id: 'myApp',
  name: 'My App',
  description: 'Short description of your app',
  version,
  apiVersion: '1.0',

  // Declarative resource registration — panels and menu items
  resources: [
    {
      slot: 'right-panel',
      id: 'MyPanel',
      title: 'My Panel',
      component: lazy(() => import('./components/MyPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'MyMenuItem',
      title: 'My Action',
      component: lazy(() => import('./components/MyMenuItem')),
      closeOnAction: true,
    },
  ],

  // Context menus and event listeners — registered in mount()
  mount(context) {
    context.apis.contextMenu.addContextMenuItem({
      label: 'My App: Log Node Info',
      targetTypes: ['node'],
      handler: (ctx) => {
        const result = context.apis.element.getNode(ctx.networkId, ctx.id!)
        if (result.success) console.info('Node:', result.data)
      },
    })
  },
  unmount() { /* clean up event listeners only — context menus are auto-cleaned */ },
}
```

---

## Documentation Map

### Developer Guides

| Guide | Topics |
|-------|--------|
| [Getting Started](guides/getting-started.md) | Scaffold, configure, register, run |
| [Architecture Overview](guides/architecture-overview.md) | Module Federation, type system, API layers |
| [Registration Patterns](guides/registration-patterns.md) | Panels, menus, context menus, upsert, batch |
| [Lifecycle & Cleanup](guides/lifecycle-and-cleanup.md) | mount/unmount, auto-cleanup, re-enable |
| [Troubleshooting](guides/troubleshooting.md) | Build errors, runtime errors, FAQ |

### API Reference

| Resource | Description |
|----------|-------------|
| [**App API Reference**](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/src/app-api/api_docs/Api.md) | Complete reference for all domain APIs, ResourceApi, Event Bus, error codes, and lifecycle |
| [`@cytoscape-web/api-types`](https://www.npmjs.com/package/@cytoscape-web/api-types) ([README](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/packages/api-types/README.md)) | TypeScript types package — install for IDE support |
| [CHANGELOG](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/packages/api-types/CHANGELOG.md) | Version history for the types package |

### Specifications (Advanced)

| Spec | Scope |
|------|-------|
| [App API Specification](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/specifications/app-api-specification.md) | Full 2000-line spec for all 10 domain APIs |
| [Resource Registration Specification](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/specifications/app-resource-registration-specification.md) | Slot model, lifecycle, cleanup, error boundaries |
| [Registration Minimal App Example](https://github.com/cytoscape/cytoscape-web/blob/new-app-api/docs/design/module-federation/examples/app-resource-registration-minimal-app.md) | End-to-end code walkthrough of all registration paths |

---

## Available APIs

All API methods return `ApiResult<T>`. Always check `result.success` before reading `result.data`.

| API | Import | Purpose |
|-----|--------|---------|
| **WorkspaceApi** | `cyweb/WorkspaceApi` | Current network ID, workspace info, switch network |
| **ElementApi** | `cyweb/ElementApi` | Create/delete nodes and edges, graph traversal queries |
| **NetworkApi** | `cyweb/NetworkApi` | Create/delete networks, import CX2 |
| **SelectionApi** | `cyweb/SelectionApi` | Read and mutate the current selection |
| **ViewportApi** | `cyweb/ViewportApi` | Pan, zoom, fit, read/write node positions |
| **TableApi** | `cyweb/TableApi` | Read and write node/edge attribute tables |
| **VisualStyleApi** | `cyweb/VisualStyleApi` | Set defaults, bypasses, and mappings |
| **LayoutApi** | `cyweb/LayoutApi` | Run layout algorithms |
| **ExportApi** | `cyweb/ExportApi` | Export network as CX2 |
| **EventBus** | `cyweb/EventBus` | Subscribe to host events (`useCyWebEvent`) |
| **AppIdContext** | `cyweb/AppIdContext` | Per-app context (`useAppContext`) for resource and context menu APIs |
| **ApiTypes** | `cyweb/ApiTypes` | TypeScript types for all of the above |

### Available Events

| Event | Fires when |
|-------|-----------|
| `network:created` | A new network is added to the workspace |
| `network:deleted` | A network is removed |
| `network:switched` | The user navigates to a different network |
| `selection:changed` | Node or edge selection changes |
| `layout:started` | A layout algorithm begins |
| `layout:completed` | A layout algorithm finishes |
| `style:changed` | A visual style property changes |
| `data:changed` | Node or edge attribute data changes |

### Non-React Access

Outside React components, the same APIs are available via `window.CyWebApi`:

```javascript
window.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi
  const result = api.workspace.getCurrentNetworkId()
  // ...
})
```

> Note: `window.CyWebApi` does not include `resource` or per-app `contextMenu`.
> Those are only available inside `mount()` via `context.apis` or via `useAppContext()`.

---

## Example Apps

| Example | Best for | Details |
|---------|----------|---------|
| [project-template/](project-template/) | Your first app — panel, menu action, and context menu | [README](project-template/README.md) |
| [hello-world/](hello-world/) | Full API coverage — 12 examples covering all APIs | [README](hello-world/README.md) |
| [network-workflows/](network-workflows/) | CX2 import, Jupyter integration, menu workflows | [README](network-workflows/README.md) |

Recommended reading order: project-template → hello-world → network-workflows

---

## Type Setup

Install the types package for IDE support:

```bash
npm install --save-dev @cytoscape-web/api-types
```

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./node_modules/@cytoscape-web"]
  }
}
```

---

## Development Commands

```bash
npm run dev                     # run all example apps
npm run dev:hello-world         # run one app
npm run dev:network-workflows
npm run dev:project-template
npm run build                   # build all apps
npm run deploy                  # build and copy to docs/
```

---

## Deprecated APIs

Older examples used direct store imports. They still work, but new apps should
use the App API instead. See
[Architecture Overview](guides/architecture-overview.md) for the full
deprecation table.

| Deprecated pattern | Recommended replacement |
|--------------------|------------------------|
| `useNetworkStore`  | `useNetworkApi`         |
| `useTableStore`    | `useTableApi`           |
| `useWorkspaceStore`| `useWorkspaceApi`       |
