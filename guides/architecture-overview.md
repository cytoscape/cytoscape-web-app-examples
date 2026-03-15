# Architecture Overview

This document explains how Cytoscape Web apps connect to the host
and the key architectural concepts you need to understand.

---

## Module Federation

Cytoscape Web uses **Webpack Module Federation** to load plugins at runtime
without rebuilding the host. The host exposes shared modules; plugins consume
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

React, ReactDOM, and `@mui/material` are provided by the host as shared
singletons. **Your app must NOT bundle its own copies.** Declare them in
`shared` with `singleton: true` in your webpack config.

### App Discovery

The host reads `apps.json` (production) or `apps.local.json` (development)
to discover plugins:

```json
[
  { "name": "myApp", "url": "http://localhost:3333/remoteEntry.js" }
]
```

The `name` must match your app's `id` (in `CyApp`) and webpack `name`.

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
import { isOk, isFail } from '@cytoscape-web/api-types'
if (isOk(result)) { ... }
```

### Error Codes

```typescript
const ApiErrorCode = {
  InvalidInput: 'INVALID_INPUT',
  NetworkNotFound: 'NETWORK_NOT_FOUND',
  NodeNotFound: 'NODE_NOT_FOUND',
  EdgeNotFound: 'EDGE_NOT_FOUND',
  LayoutFailed: 'LAYOUT_FAILED',
  ExportFailed: 'EXPORT_FAILED',
  OperationFailed: 'OPERATION_FAILED',
  ContextMenuItemNotFound: 'CONTEXT_MENU_ITEM_NOT_FOUND',
  ResourceNotFound: 'RESOURCE_NOT_FOUND',
} as const
```

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
| `cyweb/ElementApi` | `import { useElementApi } from 'cyweb/ElementApi'` | Node/edge CRUD |
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
