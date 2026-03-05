# network-workflows — Design Document

## Overview

Advanced workflow example app. Demonstrates network creation, CX2 import, and
external web app integration via `postMessage`.

| Property | Value |
|----------|-------|
| Federation name | `networkWorkflows` |
| Dev port | 7000 |
| App config file | `network-workflows/src/NetworkWorkflowsApp.tsx` |
| Host API phase | Phase 0 + Phase 1 (planned migration) |

## Components

### Menu Components

| Component | File | Purpose |
|-----------|------|---------|
| `CreateNetworkMenu` | `src/components/CreateNetworkMenu.tsx` | Creates a sample network via `cyweb/CreateNetwork` |
| `CreateNetworkFromCx2Menu` | `src/components/CreateNetworkFromCx2Menu.tsx` | Creates a network by loading a CX2 file |

### Panel Components

| Component | File | Purpose |
|-----------|------|---------|
| `JupyterConnectorPanel` | `src/components/JupyterConnectorPanel.tsx` | Receives CX2 data from Jupyter via `postMessage` and creates a network |

## Key Design Decisions

- **Separated from `hello-world`** — keeps the starter example minimal while preserving richer workflows elsewhere.
- **Two menu items + one panel** — covers both `ComponentType.Menu` and `ComponentType.Panel` with realistic actions.
- **Jupyter integration** — demonstrates the parent-child `postMessage` pattern using CX2 payloads.

## Host Modules Used

```typescript
cyweb/WorkspaceStore
cyweb/CreateNetwork
cyweb/CreateNetworkFromCx2
```

## Planned Updates

- [ ] Migrate menu actions to `cyweb/NetworkApi`
- [ ] Replace raw store access with `cyweb/WorkspaceApi`
- [ ] Add `ApiResult<T>` handling examples after the migration
