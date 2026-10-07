# Hello World — Cytoscape Web App Quick Start Guide

This app is the recommended starting point for developers building plugins for
[Cytoscape Web](https://web.cytoscape.org). It is intentionally kept small so
you can read the entire source in one sitting, while still demonstrating every
major integration pattern you will need.

| Field | Value |
|---|---|
| Federation name | `hello` |
| Dev server port | `2222` |
| Entry point (local dev) | `hello@http://localhost:2222/remoteEntry.js` |

---

## How Cytoscape Web plugins work

Cytoscape Web uses **Module Federation** (Vite) to load plugins at runtime
without rebuilding the host application.

```
┌─────────────────────────────┐       ┌──────────────────────────┐
│  Cytoscape Web (host)       │       │  Your plugin app         │
│  localhost:5500             │       │  localhost:2222          │
│                             │       │                          │
│  Exposes via cyweb/ prefix: │       │  Exposes:                │
│    cyweb/ApiTypes           │◄──────│    ./AppConfig  ←  loads │
│    cyweb/WorkspaceApi       │       │                          │
│    cyweb/VisualStyleApi     │       │  Imports from host:      │
│    cyweb/SelectionApi       │──────►│    cyweb/WorkspaceApi    │
│    cyweb/LayoutApi          │       │    cyweb/VisualStyleApi  │
│    cyweb/EventBus           │       │    cyweb/EventBus  …     │
│    … (9 use*Api hooks +     │       │                          │
│       AppIdContext, EventBus,│       │                          │
│       ApiTypes)              │       │                          │
└─────────────────────────────┘       └──────────────────────────┘
```

The host loads your plugin by fetching `remoteEntry.js` from your server,
reading the `./AppConfig` export, and rendering your panel or menu components
inside the host UI. **React, ReactDOM, and MUI are shared singletons** — your
plugin does not bundle its own copy, which keeps the download small.

---

## Prerequisites

- Node.js 24+ (see `.nvmrc` at the repo root)
- The Cytoscape Web host app running at `localhost:5500`
  (see the [host repo](../../cytoscape-web/))
- Your plugin registered in the host's `src/assets/apps.local.json`
  (already done for this app)

---

## Running locally

```bash
# Terminal 1 — start the host with the local app registry
cd ../../cytoscape-web
npm install
npm run dev          # → http://localhost:5500 (serves apps.local.json)

# Terminal 2 — start this plugin
cd hello-world
npm install
npm run dev          # → http://localhost:2222
```

> The host's dev server serves `src/assets/apps.local.json` as its app catalog,
> and that file already lists this app at `localhost:2222`.

Open `http://localhost:5500`, click **Apps** in the toolbar, then **Manage
Apps...** to enable the Hello World app. The panel appears on the right side.

---

## Project structure

```
hello-world/
├── src/
│   ├── index.ts                       ← exposed as ./AppConfig; re-exports HelloApp as default
│   ├── HelloApp.tsx                   ← app config + lifecycle (mount / unmount)
│   ├── lifecycleState.ts              ← external store bridging lifecycle ↔ React
│   └── components/
│       ├── HelloPanel.tsx             ← root panel layout (composes examples below)
│       ├── HelloHeader.tsx            ← Example 0: MUI + finding your own chunk URL
│       ├── VisualStyleSection.tsx     ← Example 1: VisualStyleApi
│       ├── SelectionSection.tsx       ← Example 2: EventBus + SelectionApi
│       ├── LayoutSection.tsx          ← Example 3: LayoutApi + EventBus (async)
│       ├── LifecycleSection.tsx       ← Example 4: App lifecycle / useSyncExternalStore
│       ├── MenuSection.tsx            ← Example 5: apps-menu entry (plain data + dialog)
│       ├── ContextMenuSection.tsx     ← Example 6: Context menu items via useAppContext
│       ├── ElementSection.tsx         ← Example 7: Node/edge CRUD via ElementApi
│       ├── TableSection.tsx           ← Example 8: Table data read/write via TableApi
│       ├── ViewportSection.tsx        ← Example 9: Fit viewport, node positions via ViewportApi
│       ├── ExportSection.tsx          ← Example 10: CX2 export via ExportApi
│       ├── NetworkSection.tsx         ← Example 11: Network create/delete via NetworkApi
│       ├── TsvDownloadSection.tsx     ← Example 12: TSV table download via TableApi
│       └── NetworkSummaryDialog.tsx   ← body of the dialog opened by the apps-menu action
├── src/menuActions.tsx                ← Example 5: the apps-menu action (opens the dialog)
├── vite.config.ts                     ← one defineCyWebApp() call (@cytoscape-web/app-runtime)
├── index.html                         ← remote-only stub (Vite needs an HTML entry)
├── test/appConfig.test.ts             ← smoke test: identity and the shape of ./AppConfig
├── tsconfig.json / .node.json / .test.json
└── package.json
```

---

## The app config: `HelloApp.tsx`

Every Cytoscape Web plugin exports a **`CyAppWithLifecycle`** object from its
entry point. This object is the single source of truth for the host about your
app's identity, components, and lifecycle.

```typescript
export const HelloApp: CyAppWithLifecycle = {
  id: 'hello',          // must match the federation `name` in vite.config.ts
  name: 'Hello Cytoscape World App',
  description: '…',
  version,              // imported from package.json — stays in sync automatically
  apiVersion: '1.0',

  // Declarative resource registration (Phase 2) — panels and menu items
  resources: [
    {
      slot: 'right-panel',
      id: 'HelloPanel',
      title: 'Hello World',
      component: lazy(() => import('./components/HelloPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'NetworkSummaryMenuItem',
      label: 'Network Summary',
      onClick: showNetworkSummary, // menuActions.tsx — opens a dialog via apis.dialog.open
    },
  ],

  mount(context) { … },  // context menu items + event listeners
  unmount() { … },       // only manual cleanup (event listeners)
}
```

### Why `lazy()` inside the config?

Normally each exposed component needs its own `exposes` entry. By
calling `React.lazy()` here in the config file, we avoid that: the host
receives the lazy component reference directly from `./AppConfig` and renders
it without a second network round-trip. Your Vite config only needs to
expose one entry:

```javascript
exposes: {
  './AppConfig': './src/index.ts',  // ← everything flows from here
}
```

### The `mount` / `unmount` lifecycle

`mount(context)` is called once after your components are registered and the
host API is fully initialised. `unmount()` is called when the user disables
the app in **Apps → Manage Apps...**, or when the page unloads.

```typescript
mount(context: AppContext): void {
  // context.apis extends window.CyWebApi with per-app resource + contextMenu.
  const result = context.apis.workspace.getCurrentNetworkId()

  // Context menu items are registered here because handlers need apis access.
  // Items are auto-cleaned when the app is disabled — no explicit removal needed.
  context.apis.contextMenu.addContextMenuItem({
    label: 'Hello: Log Node Info',
    targetTypes: ['node'],
    handler: (ctx) => { /* use context.apis here */ },
  })

  // App-scoped event listeners — must be cleaned up in unmount().
  _handler = (e) => { /* … */ }
  window.addEventListener('network:switched', _handler)
},

unmount(): void {
  // Only event listeners need manual cleanup.
  // Resources (panels, menus) and context menu items are auto-cleaned by host.
  window.removeEventListener('network:switched', _handler)
  _handler = null
},
```

---

## The `ApiResult<T>` pattern

Every Cytoscape Web API function returns `ApiResult<T>` — a discriminated
union that never throws across the API boundary.

```typescript
const result = workspaceApi.getCurrentNetworkId()

if (result.success) {
  const { networkId } = result.data  // typed — safe to use
} else {
  setErrorMessage(result.error.message)  // show to the user
}
```

Always check `result.success` before accessing `result.data`. Never call
`.data` on a failed result — TypeScript will flag this as a type error.
See `VisualStyleSection.tsx` for a complete in-panel error display example.

---

## Examples walkthrough

### Example 0 — MUI components + finding your own chunk URL (`HelloHeader.tsx`)

**What it shows:**
- MUI components (`Typography`, `Box`) are shared singletons provided by the
  host at runtime, so your app bundles none of MUI. **Import from the root
  barrel**: `import { Box } from '@mui/material'`. A subpath import such as
  `@mui/material/Box` misses the share key and bundles MUI into your app
  instead, giving you a second Emotion cache and broken theming.
  `npm run check:imports` enforces this.
- `import.meta.url` tells you where the current module was served from.

```typescript
import { Box, Typography } from '@mui/material'

const moduleUrl = import.meta.url // URL of THIS chunk
```

> **This example changed with the Vite migration, and not like for like.** It
> used to read `__webpack_public_path__`, a Webpack-injected global pointing at
> the container ROOT, so `` `${publicPath}remoteEntry.js` `` resolved. There is
> no ESM equivalent. `import.meta.url` is the URL of *this chunk*, which in a
> production build lives under `assets/` — appending to it yields
> `…/assets/remoteEntry.js`, a 404. Reconstructing the entry URL from a chunk
> path is guessing, so the example shows the chunk URL for what it is.

---

### Example 1 — `VisualStyleApi` (`VisualStyleSection.tsx`)

**What it shows:**
- How to call a host App API hook from a React component.
- The complete error-handling pattern using local `useState` for error messages.
- `useWorkspaceApi().getCurrentNetworkId()` — the standard first step before
  any network-scoped API call, because all operations require a network ID.

```typescript
const workspaceApi = useWorkspaceApi()
const visualStyleApi = useVisualStyleApi()

const handleUpdateStyle = () => {
  const networkResult = workspaceApi.getCurrentNetworkId()
  if (!networkResult.success) { setErrorMessage(networkResult.error.message); return }

  const styleResult = visualStyleApi.setDefault(
    networkResult.data.networkId,
    VisualPropertyName.NodeBackgroundColor,
    '#ff0000',
  )
  if (!styleResult.success) setErrorMessage(styleResult.error.message)
}
```

**Key rule:** Always resolve the current network ID at the time of the action,
not during component initialisation. The active network may change between
renders.

---

### Example 2 — EventBus + `SelectionApi` (`SelectionSection.tsx`)

**What it shows:**
- `useCyWebEvent(eventType, handler)` — subscribes to a host event with
  automatic cleanup when the component unmounts. This is the React-friendly
  pattern for event bus consumption.
- The handler must be **stable** (wrap in `useCallback` with `[]` deps) so
  the `useEffect` inside `useCyWebEvent` does not re-register on every render.
- `network:switched` fires when the user navigates to a different network.
  Reset all network-scoped state here.
- `selection:changed` fires after every node/edge selection change. The
  `detail` contains arrays of selected node and edge IDs.

```typescript
// Stable handler — useCallback with empty deps
const handleNetworkSwitched = useCallback(({ networkId }) => {
  setCurrentNetworkId(networkId)
  setSelection({ nodes: 0, edges: 0 })  // reset on network change
}, [])
useCyWebEvent('network:switched', handleNetworkSwitched)

const handleSelectionChanged = useCallback(({ selectedNodes, selectedEdges }) => {
  setSelection({ nodes: selectedNodes.length, edges: selectedEdges.length })
}, [])
useCyWebEvent('selection:changed', handleSelectionChanged)
```

---

### Example 3 — `LayoutApi` + EventBus (`LayoutSection.tsx`)

**What it shows:**
- Triggering an async host operation and tracking completion via both the
  returned Promise and the event bus.
- `layoutApi.applyLayout(networkId)` is async. Like every App API call it
  never throws or rejects: the Promise resolves to an `ApiResult`, a failed one
  when the layout cannot run. `layout:completed` fires on success only, just
  before the Promise resolves, so several components can react independently.
- Disable the trigger button while the operation runs to prevent duplicate
  submissions.

```typescript
const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')

useCyWebEvent('layout:completed', useCallback(() => setStatus('done'), []))

const handleApply = () => {
  setStatus('running')
  layoutApi.applyLayout(networkId).then((result) => {
    // A failure resolves (it never rejects) and fires no event, so the
    // result is the only place its error message appears.
    if (!result.success) setStatus('idle')
  })
}
```

---

### Example 4 — App lifecycle + `useSyncExternalStore` (`LifecycleSection.tsx`)

**What it shows:**
- The difference between `useCyWebEvent` (component-scoped, auto-cleanup) and
  `window.addEventListener` in `mount()` (app-scoped, manual cleanup).
- How `mount(context)` gives access to all APIs without a React rendering
  context.
- How to bridge non-React state into React using `useSyncExternalStore` — the
  standard React hook for subscribing to external stores.

`lifecycleState.ts` is a lightweight pub-sub module that `HelloApp.mount()`
writes to and `LifecycleSection` reads from:

```typescript
// lifecycleState.ts — the bridge between lifecycle and React
export const getLifecycleSnapshot = (): LifecycleState => _state
export const subscribeLifecycleState = (fn: () => void) => {
  _listeners.add(fn)
  return () => _listeners.delete(fn)  // returns unsubscribe
}
export const setLifecycleState = (patch: Partial<LifecycleState>) => {
  _state = { ..._state, ...patch }
  _listeners.forEach(fn => fn())
}
```

```typescript
// HelloApp.tsx — app-level listener, outside React
mount(context) {
  setLifecycleState({ mounted: true })
  const network = context.apis.workspace.getCurrentNetworkId()
  if (network.success) setLifecycleState({ lastNetworkId: network.data.networkId })

  _handler = (e) => {
    const { networkId } = (e as CustomEvent).detail
    setLifecycleState({
      lastNetworkId: networkId,
      networkSwitchCount: getLifecycleSnapshot().networkSwitchCount + 1,
    })
  }
  window.addEventListener('network:switched', _handler)
},
unmount() {
  window.removeEventListener('network:switched', _handler)
  _handler = null
  setLifecycleState({ mounted: false })
}
```

```typescript
// LifecycleSection.tsx — subscribes to external state from React
const { mounted, networkSwitchCount, lastNetworkId } = useSyncExternalStore(
  subscribeLifecycleState,  // stable module-level ref — no useCallback needed
  getLifecycleSnapshot,
)
```

**When to use `mount()` vs `useCyWebEvent()`:**

| | `useCyWebEvent()` | `mount()` + `addEventListener` |
|---|---|---|
| Scope | Per component instance | Entire app lifetime |
| Cleanup | Automatic (via `useEffect`) | Manual in `unmount()` |
| React context required | Yes | No |
| Typical use | UI event reactions | Background tasks, SDKs, analytics |

---

### Example 5 — Apps-menu entry (`MenuSection.tsx`)

Explains how `'apps-menu'` entries work: plain data with `label` and
`onClick(apis)`, rendered by the host, with any UI opened from the action
through `apis.dialog.open({ title, render })`.

---

### Example 6 — Context menu items (`ContextMenuSection.tsx`)

**What it shows:**
- `useAppContext().apis.contextMenu` — the Phase 2 per-app context menu API.
- Interactive toggle: add/remove context menu items for node, edge, and canvas.
- `ApiResult<{ itemId }>` pattern for tracking registered items.
- `useEffect` cleanup for removing items when the component unmounts.

---

### Example 7 — `ElementApi` (`ElementSection.tsx`)

**What it shows:**
- `elementApi.createNode(networkId, position, options)` — create nodes with
  random positions and attributes.
- `elementApi.createEdge(networkId, source, target)` — connect nodes.
- `elementApi.deleteNodes(networkId, nodeIds)` — remove nodes (incident edges
  are deleted automatically).
- Each operation adds an undo entry automatically.

---

### Example 8 — `TableApi` (`TableSection.tsx`)

**What it shows:**
- `tableApi.getRow(networkId, 'node', elementId)` — read all attributes for
  the first selected node.
- `tableApi.createColumn(networkId, 'node', name, dataType, defaultValue)` —
  add a new column to the node table.
- Combines `selectionApi.getSelection()` to pick the target node.
- Write operations fire `data:changed` events automatically.

---

### Example 9 — `ViewportApi` (`ViewportSection.tsx`)

**What it shows:**
- `viewportApi.fit(networkId)` — async fit-to-content (delegates to renderer).
- `viewportApi.getNodePositions(networkId, nodeIds)` — read `[x, y]` positions
  for selected nodes.
- Positions are plain `[x, y, z?]` tuples in a `Record<IdType, number[]>`.

---

### Example 10 — `ExportApi` (`ExportSection.tsx`)

**What it shows:**
- `exportApi.exportToCx2(networkId)` — assemble the full CX2 document from
  the host's stores (network, tables, visual style, view model).
- The returned `Cx2` is a JSON-serializable array of aspect objects.
- Display a summary (aspect count, byte size) instead of the full document.

---

### Example 11 — `NetworkApi` (`NetworkSection.tsx`)

**What it shows:**
- `networkApi.createNetworkFromEdgeList({ name, edgeList, addToWorkspace })` —
  the simplest way to create a network from scratch.
- `networkApi.deleteCurrentNetwork()` — remove the active network.
- `workspaceApi.getWorkspaceInfo()` — read workspace metadata (name, network
  count, current network ID).
- Network creation fires `network:created` and `network:switched` events.

---

### Example 12 — TSV table download (`TsvDownloadSection.tsx`)

**What it shows:**
- `tableApi.exportTableToTsv(networkId, 'node' | 'edge')` — serialise the
  current node or edge attribute table as a tab-separated string.
- The browser-native `Blob` + `URL.createObjectURL` + `<a download>` pattern
  triggers a save-file dialog without any server round-trip.
- Edge-table TSV always contains the `source` and `target` columns.

```typescript
const result = tableApi.exportTableToTsv(networkId, 'node')
if (result.success) {
  const blob = new Blob([result.data.tsv], { type: 'text/tab-separated-values' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'node-table.tsv'
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## Creating your own app

Use the scaffolder rather than copying this app:

```bash
npm create cytoscape-app my-app
```

It writes the app's identity into the `cyweb` block of `package.json`, a
`vite.config.ts` that is one `defineCyWebApp()` call, and a passing smoke test.
`npm run dev` then prints a `?installApp=` link that installs the app into a
running host; nothing in the host repository is edited. See
[Build Your First App](../README.md#build-your-first-app) in the repository
README.

---

## Available host APIs and events

See [Available APIs](../README.md#available-apis) and
[Available Events](../README.md#available-events) in the repository README.
They are kept in one place so that they cannot disagree.

---

## Code style

This project follows the shared config in the repo root:

- No semicolons, single quotes, trailing commas, 2-space indent (Prettier)
- Import sorting enforced by ESLint (`eslint-plugin-simple-import-sort`)
- Functional React components only — do **not** add `import React from 'react'`
  (the new JSX transform handles it automatically)
- No `console.log` in committed code
