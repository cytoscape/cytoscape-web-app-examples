# hello-world — Design Document

## Overview

Reference app that tours the App API. One right panel holds a numbered series of
small examples, one per API domain, and one Apps-menu entry shows how to put UI
behind a menu item.

| Property | Value |
|----------|-------|
| Federation name | `hello` |
| Dev port | 2222 |
| App config file | `hello-world/src/HelloApp.tsx` |
| App API | `apiVersion: '1.0'`, `@cytoscape-web/api-types` `^1.0.0-beta.5` |

## Resources

Declared in the `resources` array of `HelloApp.tsx`:

| Slot | Resource id | Source | Purpose |
|------|-------------|--------|---------|
| `'right-panel'` | `HelloPanel` | `src/components/HelloPanel.tsx` (lazy) | Hosts the example sections below |
| `'apps-menu'` | `NetworkSummaryMenuItem` | `showNetworkSummary` in `src/menuActions.tsx` | Plain-data menu entry; its `onClick(apis)` opens a dialog through `apis.dialog.open` |

Registered in `mount()`, because the handler needs `context.apis`:

| Kind | Label | Purpose |
|------|-------|---------|
| Context menu item | Hello: Log Node Info | Logs the clicked node via `apis.element.getNode` |

## Components

All under `src/components/`. `HelloPanel` renders the sections in order.

| Example | Component | Demonstrates |
|---------|-----------|--------------|
| 0 | `HelloHeader` | MUI components; finding your own code at runtime |
| 1 | `VisualStyleSection` | `VisualStyleApi` |
| 2 | `SelectionSection` | `EventBus` + `SelectionApi` |
| 3 | `LayoutSection` | `LayoutApi` + `EventBus` (async operation and completion event) |
| 4 | `LifecycleSection` | `mount()` / `unmount()`, bridged into React by `src/lifecycleState.ts` |
| 5 | `MenuSection`, `NetworkSummaryDialog` | Apps-menu entry; dialog body rendered in the host-owned frame |
| 6 | `ContextMenuSection` | Per-app Context Menu API via `useAppContext()` |
| 7 | `ElementSection` | `ElementApi` |
| 8 | `TableSection` | `TableApi` |
| 9 | `ViewportSection` | `ViewportApi` |
| 10 | `ExportSection` | `ExportApi` |
| 11 | `NetworkSection` | `NetworkApi` |
| 12 | `TsvDownloadSection` | Exporting tables as TSV and triggering a browser download |

## Key Design Decisions

- **One panel, many sections** — each section is a self-contained example of one API domain, so a developer can copy the one they need.
- **Readable app config** — `HelloApp.tsx` declares its panel and menu entry in `resources` and keeps `mount()` for what needs `context.apis`.
- **No dialog inside the menu** — the menu entry is data, and its UI opens through `apis.dialog.open`. The host owns the dialog frame, so the dialog outlives the dropdown that launched it.
- **App-level state outside React** — `lifecycleState.ts` is an external store written by `mount()`/`unmount()` and read by components with `useSyncExternalStore`.

## Host Modules Used

```typescript
cyweb/ApiTypes
cyweb/AppIdContext
cyweb/ElementApi
cyweb/EventBus
cyweb/ExportApi
cyweb/LayoutApi
cyweb/NetworkApi
cyweb/SelectionApi
cyweb/TableApi
cyweb/ViewportApi
cyweb/VisualStyleApi
cyweb/WorkspaceApi
```

No `remotes.d.ts` is needed: `@cytoscape-web/api-types` declares every `cyweb/*`
module.
