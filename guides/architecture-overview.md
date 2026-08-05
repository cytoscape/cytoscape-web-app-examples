# Architecture Overview

This document explains how Cytoscape Web apps connect to the host
and the key architectural concepts you need to understand.

---

## Module Federation

Cytoscape Web uses **Module Federation** (both sides build with Vite) to load
plugins at runtime without rebuilding the host. The host exposes shared modules; plugins consume
them via the `cyweb/` import prefix.

```
┌─────────────────────────────┐     ┌─────────────────────────┐
│  Host (cyweb, port 5500)    │     │  Plugin (myApp, port X) │
│                             │     │                         │
│  remoteEntry.js ◄───────────┼─────┤  remoteEntry.js         │
│                             │     │                         │
│  Shared: React, MUI, etc.   │────►│  Consumed at runtime    │
│                             │     │                         │
│  exposes:                   │     │  exposes:               │
│    cyweb/ElementApi          │     │    ./AppConfig          │
│    cyweb/NetworkApi          │     │                         │
│    cyweb/AppIdContext        │     │  remotes:               │
│    cyweb/EventBus            │     │    cyweb → host URL     │
│    ... (26 total)           │     │                         │
└─────────────────────────────┘     └─────────────────────────┘
```

### Shared Singletons

Five packages are provided by the host as shared singletons: `react`,
`react-dom`, `@mui/material`, `@emotion/react` and `@emotion/styled`. Declare
all five in `shared` in your `vite.config.ts`, with `singleton: true` **and
`import: false`**.

`import: false` is what makes your app bundle no copy at all. Without it the
plugin emits a local fallback for each package — and those fallbacks are
*statically* imported by your exposed module, so they are downloaded and parsed
on every load even when the host's instance is the one actually used. Measured
on `project-template`: 92 kB of browser JavaScript with `import: false`,
**800 kB without**, of which MUI alone is 674 kB.

Both Emotion packages matter as much as MUI. MUI is built on Emotion, so an app
that shares MUI but not Emotion gets a second Emotion cache — duplicated styles
and a panel that ignores the host's theme.

> **Import from the root barrel.** `import { Box } from '@mui/material'`, never
> `import Box from '@mui/material/Box'`. Share keys are matched exactly, and
> MUI subpaths are not in the plugin's known-subpath list, so a subpath import
> silently bundles MUI into your app instead of resolving the host's. React
> works either way, which is exactly why this defect hides. `npm run
> check:imports` enforces it and the build fails if it slips through.

### App Discovery

The host reads `apps.json` (production) or `apps.local.json` (development)
to discover plugins:

```json
[
  {
    "id": "myApp",
    "name": "My App (display name)",
    "url": "http://localhost:3333/remoteEntry.js",
    "version": "0.1.0"
  }
]
```

The `id` field is the unique identifier and must match your app's `id`
(in `CyApp`) and the federation `name` in `vite.config.ts`. The
`name` field is the human-readable label shown in App Settings.

### How your app finds the host

Your app imports `cyweb/*`, so its Module Federation runtime needs the host's
`remoteEntry.js` URL. That URL is **not compiled into your build**.

The host knows its own entry URL exactly — its base comes from its
`config.json` — so it publishes it at boot:

```js
Object.defineProperty(window, '__CYWEB_HOST__', {
  value: Object.freeze({
    name: 'cyweb',
    remoteEntry: 'https://<host>/remoteEntry.js',
    apiVersion: '1.0',
  }),
  writable: false,
  configurable: false,
})
```

The property flags are part of the contract, not decoration: a plain assignment
would freeze the *value* while leaving `window.__CYWEB_HOST__` itself writable
and configurable, and `npm run preflight:host` checks all three. Immutability is
promised because the federation runtime caches a remote's `Module` against the
`remoteInfo` it was created with — a descriptor that changed after a remote had
loaded could not reach that remote anyway, so the host says so rather than
implying an update path that does not exist.

`src/mfRuntimePlugin.ts` in your app reads that during the federation runtime's
`beforeInit` hook and substitutes it before any remote resolves. A production
build compiles in a **sentinel** (`cyweb:__CYWEB_HOST_REQUIRED__`) rather than
a URL, so if the descriptor is missing the app throws a named error instead of
quietly trying to reach a `localhost` address on the end user's machine.

The consequence worth knowing: **one build of your app works against any
Cytoscape Web deployment** — production, a staging instance, or a colleague's
local host. You do not rebuild per target.

---

## API Layers

The host provides two API layers with different scopes:

### 1. `window.CyWebApi` — Global API (CyWebApiType)

Available everywhere — browser console, browser extensions, non-React code.

```typescript
interface CyWebApiType {
  element: ElementApi
  network: NetworkApi
  selection: SelectionApi
  viewport: ViewportApi
  table: TableApi
  visualStyle: VisualStyleApi
  layout: LayoutApi
  export: ExportApi
  workspace: WorkspaceApi
  contextMenu: ContextMenuApi  // anonymous — no appId tracking
}
```

- Does **NOT** include `resource` (resource registration requires React context)
- `contextMenu` is an anonymous singleton — items are not auto-cleaned

### 2. `AppContext.apis` — Per-App API (AppContextApis)

Available inside `mount()` and plugin React components via `useAppContext()`.

```typescript
interface AppContextApis extends CyWebApiType {
  readonly resource: ResourceApi     // per-app resource registration
  readonly contextMenu: ContextMenuApi  // per-app, auto-cleaned on disable
}
```

- `resource` is bound to your app's ID — you cannot register resources
  under another app
- `contextMenu` items carry your app's ID and are automatically removed
  when your app is disabled

### When to Use Which

| Scenario | Use |
|----------|-----|
| Inside a React component | `useAppContext().apis` |
| Inside `mount()` / `unmount()` | `context.apis` (from mount parameter) |
| Browser console debugging | `window.CyWebApi` |
| Browser extension / non-React | `window.CyWebApi` |

---

## Type System

### @cytoscape-web/api-types

All public types are published as an npm package:

```bash
npm install --save-dev @cytoscape-web/api-types
```

This provides:
- **API interfaces** — `ElementApi`, `NetworkApi`, `ResourceApi`, etc.
- **Data types** — `IdType`, `CyNetwork`, `Table`, `NetworkView`, etc.
- **Result types** — `ApiResult<T>`, `ok()`, `fail()`, `isOk()`, `isFail()`
- **App types** — `CyApp`, `CyAppWithLifecycle`, `AppContext`, `AppContextApis`
- **MF declarations** — TypeScript module declarations for `cyweb/*` imports

### ApiResult<T> — Discriminated Union

All API functions return `ApiResult<T>`, never throw:

```typescript
type ApiResult<T = void> = ApiSuccess<T> | ApiFailure

// Check with .success flag (discriminated union)
const result = apis.element.getNode(networkId, nodeId)
if (result.success) {
  console.log(result.data)  // typed as { node: Node; data: NodeData }
} else {
  console.error(result.error.code, result.error.message)
}

// Or use helper functions
import { isOk, isFail } from 'cyweb/ApiTypes'
if (isOk(result)) { ... }
```

### Error Codes

Common error codes (subset):

```typescript
const ApiErrorCode = {
  NetworkNotFound: 'NETWORK_NOT_FOUND',    // no network with that ID
  InvalidInput: 'INVALID_INPUT',           // bad argument (empty label, etc.)
  OperationFailed: 'OPERATION_FAILED',     // unexpected internal error
  NoCurrentNetwork: 'NO_CURRENT_NETWORK',  // no network is loaded
  // ... 7 more codes
} as const
```

For the complete list (11 codes), see the
[App API Reference](https://github.com/cytoscape/cytoscape-web/blob/development/src/app-api/api_docs/Api.md#error-codes).

---

## Event Bus

The host dispatches DOM `CustomEvent`s for app-level state changes.
Subscribe in components with `useCyWebEvent` or in `mount()` with
`window.addEventListener`.

### Available Events

| Event | Payload | Fired When |
|-------|---------|------------|
| `network:created` | `{ networkId }` | A new network is created |
| `network:deleted` | `{ networkId }` | A network is deleted |
| `network:switched` | `{ networkId, previousId }` | Active network changes |
| `selection:changed` | `{ networkId, selectedNodes, selectedEdges }` | Selection updates |
| `layout:started` | `{ networkId, algorithm }` | Layout begins |
| `layout:completed` | `{ networkId, algorithm }` | Layout finishes |
| `style:changed` | `{ networkId, property }` | Visual style changes |
| `data:changed` | `{ networkId, tableType, rowIds }` | Node/edge data modified |

### Usage in Components (Recommended)

```typescript
import { useCyWebEvent } from 'cyweb/EventBus'

function MyComponent() {
  useCyWebEvent('network:switched', (detail) => {
    console.log('Switched to network:', detail.networkId)
  })
}
```

### Usage in mount() (for app-scoped listeners)

```typescript
mount(context: AppContext) {
  const handler = (e: Event) => {
    const { networkId } = (e as CustomEvent).detail
    console.log('Network switched:', networkId)
  }
  window.addEventListener('network:switched', handler)
  // Store handler reference for cleanup in unmount()
}
```

---

## Host Exposes Reference

These modules are available via the `cyweb/` prefix:

| Module | Import Example | Description |
|--------|---------------|-------------|
| `cyweb/ApiTypes` | `import type { IdType } from 'cyweb/ApiTypes'` | All public type exports |
| `cyweb/ElementApi` | `import { useElementApi } from 'cyweb/ElementApi'` | Node/edge CRUD + graph traversal |
| `cyweb/NetworkApi` | `import { useNetworkApi } from 'cyweb/NetworkApi'` | Network operations |
| `cyweb/SelectionApi` | `import { useSelectionApi } from 'cyweb/SelectionApi'` | Selection state |
| `cyweb/ViewportApi` | `import { useViewportApi } from 'cyweb/ViewportApi'` | Pan, zoom, fit |
| `cyweb/TableApi` | `import { useTableApi } from 'cyweb/TableApi'` | Node/edge table data |
| `cyweb/VisualStyleApi` | `import { useVisualStyleApi } from 'cyweb/VisualStyleApi'` | Visual mappings |
| `cyweb/LayoutApi` | `import { useLayoutApi } from 'cyweb/LayoutApi'` | Layout algorithms |
| `cyweb/ExportApi` | `import { useExportApi } from 'cyweb/ExportApi'` | CX2/image export |
| `cyweb/WorkspaceApi` | `import { useWorkspaceApi } from 'cyweb/WorkspaceApi'` | Workspace state |
| `cyweb/AppIdContext` | `import { useAppContext } from 'cyweb/AppIdContext'` | Per-app context |
| `cyweb/EventBus` | `import { useCyWebEvent } from 'cyweb/EventBus'` | Event subscriptions |

> **Legacy exposes** (`cyweb/NetworkStore`, `cyweb/TableStore`, etc.) are
> internal Zustand stores. Prefer the API hooks above — they return
> `ApiResult<T>` and provide a stable, documented contract.

---

## Next Steps

- [Getting Started](./getting-started.md) — Scaffold and run a new app
- [Resource Registration Patterns](./registration-patterns.md) — Panels, menus, context menus
- [App Lifecycle & Cleanup](./lifecycle-and-cleanup.md) — mount/unmount patterns
- [Troubleshooting & FAQ](./troubleshooting.md) — Common issues and solutions
