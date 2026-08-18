# Developing Apps for _[Cytoscape Web](https://github.com/cytoscape/cytoscape-web/)_

> ## ⚠️ Developer Preview
>
> The SDK and scaffolder are published at **`0.1.0`**, and **npm will print a
> deprecation notice when you install them. That is deliberate, not a mistake** —
> it is how this says, at the moment you install it, that it is not ready to
> carry production work.
>
> **An app runs inside Cytoscape Web with the host's full privileges** — same
> origin, DOM, storage and network identity. There is no sandbox and no
> signature verification, and an app can read the user's credentials. Install
> only apps you trust, and understand that asking someone to install yours asks
> the same of them.
>
> The API may change before `1.0`. What is missing before it can be called ready
> is host-side: app isolation, a capability API, and artifact integrity.

Reference implementations and documentation for building apps for
[Cytoscape Web](https://web.cytoscape.org).

- Targets Cytoscape Web **App API 1.0** ([`@cytoscape-web/api-types`](https://www.npmjs.com/package/@cytoscape-web/api-types))
- [Live examples](https://cytoscape.org/cytoscape-web-app-examples/)
- [`create-cytoscape-app`](https://www.npmjs.com/package/create-cytoscape-app) · [`@cytoscape-web/app-runtime`](https://www.npmjs.com/package/@cytoscape-web/app-runtime)

## Introduction

This repository is for third-party developers who want to build apps for
[Cytoscape Web](https://web.cytoscape.org).

You do not need to change the host source code. Your app is loaded by the host
through Module Federation (Vite). Apps can add:

- panel components in the right-side **App Panel**
- menu items in the **Apps** dropdown
- context menu actions for right-click workflows

---

## Quick Start

```bash
npm create cytoscape-app my-app
cd my-app
npm run dev
```

The dev server prints the link that installs your app into a running local host:

```
  Cytoscape Web app myApp — http://localhost:6000

  Install it into a local host:
  http://localhost:5500/?installApp=http://localhost:6000/cyweb-app.json
```

Start a host (`npm run dev` in a [cytoscape-web](https://github.com/cytoscape/cytoscape-web)
checkout), open that link, confirm the install, and enable the app under
**Apps → App Settings**.

**Nothing in the host repository is edited.** Your dev server serves a one-entry
app manifest at `/cyweb-app.json`, generated from your `package.json` on every
request, and the host has accepted `?installApp=` all along.

> **Your app does not hot-reload inside the host.** Vite's HMR does not cross the
> federation boundary — that is a separate feature (`dev.remoteHmr`), off by
> default. Your dev server rebuilds the changed module immediately; reload the
> host page to pick it up.

### Working on this repository instead

If you want to run the five example apps rather than build your own:

```bash
git clone https://github.com/cytoscape/cytoscape-web.git
git clone https://github.com/cytoscape/cytoscape-web-app-examples.git

cd cytoscape-web-app-examples && npm install && npm run dev   # all five apps
cd ../cytoscape-web          && npm install && npm run dev    # the host, :5500
```

Then open `http://localhost:5500`, **Apps → App Settings**, and enable one. The
dev server reads `src/assets/apps.local.json`, which already lists them.

### Publishing to the public Cytoscape Web site

Still manual, and deliberately so. The production instance loads apps from a
curated allowlist (`apps.json`) maintained by the core team; a self-service App
Store is designed but not built, and its launch is gated on the same host-side
isolation work as the banner above. To publish, please
[contact the Cytoscape team](https://github.com/cytoscape/cytoscape-web/issues).

---

## Build Your First App

```bash
npm create cytoscape-app my-app
cd my-app
```

That is the whole setup — it installs dependencies and leaves a project that
builds, verifies and tests as it stands. Add `--yes` with `--id`, `--port` and
`--template` to skip the prompts entirely; every prompt has a flag, so an agent
can drive it without a terminal.

> Prefer to start from a worked example? `cp -r project-template my-app` still
> works and gives you the same shape by hand.

Then two things:

**1. Your identity, in `package.json`.** Written once, and read from there by
the build, by the app config, and by the install manifest:

```json
{
  "name": "@you/my-app",
  "version": "0.1.0",
  "description": "What your app does — shown in App Settings",
  "cyweb": { "id": "myApp", "displayName": "My App", "port": 6000 }
}
```

`cyweb.id` is the Module Federation container name, the `CyApp.id` and the id
the host registers, all at the same time.

**2. Your app, in `src/`.** Replace the panel and menu components, and adjust
`resources` in `src/MyApp.tsx`. `vite.config.ts` is three lines and needs no
edits.

Then `npm run dev`. It prints the link that installs your app into a running
local host:

```
  Cytoscape Web app myApp — http://localhost:6000

  Install it into a local host:
  http://localhost:5500/?installApp=http://localhost:6000/cyweb-app.json
```

**Nothing in the host repository is edited.** The dev server serves a one-entry
manifest at `/cyweb-app.json`, generated from your `package.json` on each
request, and the host has accepted `?installApp=` all along.

See [project-template/README.md](project-template/README.md) for details.

---

## App Entry Point

Every app exports one `CyAppWithLifecycle` object:

```typescript
import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'
// Identity, from the `cyweb` block and the standard fields in package.json.
// Do NOT `import packageJson from '../package.json'` — that pulls the whole
// file, devDependencies included, into your browser bundle to read one string.
// `cyweb-app verify` fails a build that does.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

export const MyApp: CyAppWithLifecycle = {
  // Written once, in package.json:
  //   "cyweb": { "id": "myApp", "displayName": "My App", "port": 6000 }
  // `id` is the Module Federation container name, this CyApp's id and the id
  // the host registers, all at the same time.
  id,
  name: displayName,
  description,
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
  unmount() {
    /* clean up event listeners only — context menus are auto-cleaned */
  },
}
```

---

## Documentation Map

### Developer Guides

| Guide                                                    | Topics                                      |
| -------------------------------------------------------- | ------------------------------------------- |
| [Getting Started](guides/getting-started.md)             | Scaffold, configure, register, run          |
| [Architecture Overview](guides/architecture-overview.md) | Module Federation, type system, API layers  |
| [Registration Patterns](guides/registration-patterns.md) | Panels, menus, context menus, upsert, batch |
| [Lifecycle & Cleanup](guides/lifecycle-and-cleanup.md)   | mount/unmount, auto-cleanup, re-enable      |
| [Troubleshooting](guides/troubleshooting.md)             | Build errors, runtime errors, FAQ           |

### API Reference

| Resource                                                                                                                                                                                  | Description                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [**App API Reference**](https://github.com/cytoscape/cytoscape-web/blob/development/src/app-api/api_docs/Api.md)                                                                          | Complete reference for all domain APIs, ResourceApi, Event Bus, error codes, and lifecycle |
| [`@cytoscape-web/api-types`](https://www.npmjs.com/package/@cytoscape-web/api-types) ([README](https://github.com/cytoscape/cytoscape-web/blob/development/packages/api-types/README.md)) | TypeScript types package — install for IDE support                                         |
| [CHANGELOG](https://github.com/cytoscape/cytoscape-web/blob/development/packages/api-types/CHANGELOG.md)                                                                                  | Version history for the types package                                                      |

### Specifications (Advanced)

| Spec                                                                                                                                                                                       | Scope                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| [App API Specification](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/specifications/app-api-specification.md)                                 | Full 2000-line spec for all 10 domain APIs            |
| [Resource Registration Specification](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/specifications/app-resource-registration-specification.md) | Slot model, lifecycle, cleanup, error boundaries      |
| [Registration Minimal App Example](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/examples/app-resource-registration-minimal-app.md)            | End-to-end code walkthrough of all registration paths |

---

## Available APIs

All API methods return `ApiResult<T>`. Always check `result.success` before reading `result.data`.

| API                | Import                 | Purpose                                                              |
| ------------------ | ---------------------- | -------------------------------------------------------------------- |
| **WorkspaceApi**   | `cyweb/WorkspaceApi`   | Current network ID, workspace info, switch network                   |
| **ElementApi**     | `cyweb/ElementApi`     | Create/delete nodes and edges, graph traversal queries               |
| **NetworkApi**     | `cyweb/NetworkApi`     | Create/delete networks, import CX2                                   |
| **SelectionApi**   | `cyweb/SelectionApi`   | Read and mutate the current selection                                |
| **ViewportApi**    | `cyweb/ViewportApi`    | Pan, zoom, fit, read/write node positions                            |
| **TableApi**       | `cyweb/TableApi`       | Read and write node/edge attribute tables                            |
| **VisualStyleApi** | `cyweb/VisualStyleApi` | Set defaults, bypasses, and mappings                                 |
| **LayoutApi**      | `cyweb/LayoutApi`      | Run layout algorithms                                                |
| **ExportApi**      | `cyweb/ExportApi`      | Export network as CX2                                                |
| **EventBus**       | `cyweb/EventBus`       | Subscribe to host events (`useCyWebEvent`)                           |
| **AppIdContext**   | `cyweb/AppIdContext`   | Per-app context (`useAppContext`) for resource and context menu APIs |
| **ApiTypes**       | `cyweb/ApiTypes`       | TypeScript types for all of the above                                |

### Available Events

| Event               | Fires when                                |
| ------------------- | ----------------------------------------- |
| `network:created`   | A new network is added to the workspace   |
| `network:deleted`   | A network is removed                      |
| `network:switched`  | The user navigates to a different network |
| `selection:changed` | Node or edge selection changes            |
| `layout:started`    | A layout algorithm begins                 |
| `layout:completed`  | A layout algorithm finishes               |
| `style:changed`     | A visual style property changes           |
| `data:changed`      | Node or edge attribute data changes       |

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

| Example                                    | Best for                                              | Details                                |
| ------------------------------------------ | ----------------------------------------------------- | -------------------------------------- |
| [project-template/](project-template/)     | Your first app — panel, menu action, and context menu | [README](project-template/README.md)   |
| [hello-world/](hello-world/)               | Full API coverage — 13 examples covering all APIs     | [README](hello-world/README.md)        |
| [network-statistics/](network-statistics/) | **Non-React** — graph traversal, event-driven logging | [README](network-statistics/README.md) |
| [network-workflows/](network-workflows/)   | CX2 import, Jupyter integration, menu workflows       | [README](network-workflows/README.md)  |

Recommended reading order: project-template → hello-world → network-statistics → network-workflows

---

## Type Setup

Install the types package for IDE support:

```bash
npm install --save-dev @cytoscape-web/api-types @cytoscape-web/app-runtime
```

Reference both packages' bundled declarations from your `tsconfig.json` so
TypeScript resolves the `cyweb/*` ambient modules and `virtual:cyweb-app-meta`:

```json
{
  "include": ["src/**/*"],
  "compilerOptions": {
    "moduleResolution": "bundler",
    "types": ["@cytoscape-web/api-types", "@cytoscape-web/app-runtime/meta"]
  }
}
```

> Listing them in `types` is what pulls in the ambient `cyweb/*` and
> `virtual:cyweb-app-meta` declarations — the same mechanism `vite/client` uses. Do **not** set `typeRoots`: the example apps used to point it
> at `./node_modules/@types`, a directory that does not exist in a workspace,
> and setting it suppresses the default lookup that actually finds the types.
> See any of the example apps' `tsconfig.json` for a working reference.

---

## Development Commands

```bash
npm run dev                     # run all workspaces concurrently
npm run dev:hello-world         # run one app
npm run dev:network-statistics
npm run dev:network-workflows
npm run dev:project-template
npm run dev:claude-bridge       # MCP bridge (optional, internal tool)
npm run build                   # build all workspaces
npm run deploy                  # build and copy each workspace's dist/ into docs/
```

### Verification

```bash
npm run verify:federation       # the built dist/ has the right federation shape
npm run preflight:host -- <hostUrl>              # the host publishes a usable descriptor
npm run preflight:apps -- <hostUrl> <appsBase>   # the PUBLISHED apps load in that host
```

The three cover different layers, and the gap between the first two is why the
third exists. `verify:federation` reads `dist/`, `preflight:host` reads the
host — so a fault in the **serving layer** between them is invisible to both. That is not
hypothetical: GitHub Pages ran this repo's `docs/` through Jekyll, which drops
`_`-prefixed paths, and silently 404'd the `_virtual_mf-*` chunk every app
imports first while both other checks stayed green.

`preflight:apps` loads each published app through a real dynamic `import()`
inside a real host page, so transitive chunk fetches, CORS and MIME are the real
ones. `-- --selftest` proves it can still fail.

---

## Deprecated APIs

Older examples used direct store imports. They still work, but new apps should
use the App API hooks instead — they return `ApiResult<T>` and provide a
stable, documented contract. See
[Architecture Overview &rarr; Host Exposes Reference](guides/architecture-overview.md#host-exposes-reference)
for the full list of legacy `cyweb/*Store` exposes.

| Deprecated pattern  | Recommended replacement |
| ------------------- | ----------------------- |
| `useNetworkStore`   | `useNetworkApi`         |
| `useTableStore`     | `useTableApi`           |
| `useWorkspaceStore` | `useWorkspaceApi`       |
