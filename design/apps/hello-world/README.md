# hello-world — Design Document

## Overview

The most comprehensive example app. Demonstrates menus, panels, network creation, and external web app integration via `postMessage`.

| Property | Value |
|----------|-------|
| Federation name | `hello` |
| Dev port | 2222 |
| App config file | `hello-world/src/HelloApp.tsx` |
| Host API phase | Phase 0 + Phase 1 (partial) |

## Components

### Menu Components

| Component | File | Purpose |
|-----------|------|---------|
| `CreateNetworkMenu` | `src/components/CreateNetworkMenu.tsx` | Creates a sample network via `cyweb/CreateNetwork` |
| `CreateNetworkFromCx2Menu` | `src/components/CreateNetworkFromCx2Menu.tsx` | Creates a network by loading a CX2 file |

### Panel Components

| Component | File | Purpose |
|-----------|------|---------|
| `HelloPanel` | `src/components/HelloPanel.tsx` | Basic panel showing current network info |
| `JupyterConnectorPanel` | `src/components/JupyterConnectorPanel.tsx` | Receives CX2 data from Jupyter via `postMessage` and creates a network |

## Key Design Decisions

- **Two menu items + two panels** — covers both `ComponentType.Menu` and `ComponentType.Panel` in one app.
- **Jupyter integration** — `JupyterConnectorPanel` listens for `message` events from a child window (Jupyter Lab), demonstrating the parent-child `postMessage` pattern.
- **CX2 format** — Network creation uses CX2 data format (see `@cytoscape-web/types`).

## Host Modules Used

```typescript
cyweb/WorkspaceStore
cyweb/NetworkStore
cyweb/CreateNetwork
cyweb/CreateNetworkFromCx2
```

## Planned Updates

- [ ] Add usage of `cyweb/NetworkApi` (Phase 1a) once available in host
- [ ] Update `remotes.d.ts` as new `cyweb/*` modules are exposed
