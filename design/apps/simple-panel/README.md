# simple-panel — Design Document

## Overview

Minimal example of adding a panel to Cytoscape Web. Shows how to read network data from host stores and display it in a custom panel.

| Property | Value |
|----------|-------|
| Federation name | `simplePanel` |
| Dev port | 4001 |
| App config file | `simple-panel/src/SimplePanelApp.tsx` |
| Host API phase | Phase 0 |

## Components

### Panel Components

| Component | File | Purpose |
|-----------|------|---------|
| `SimplePanel` | `src/components/SimplePanel.tsx` | Displays current network ID, node count, and edge count |

## Key Design Decisions

- **Single panel, no menus** — Focuses solely on `ComponentType.Panel`.
- **Read-only** — Only reads from `WorkspaceStore` and `NetworkStore`; does not write or mutate state.
- **Graceful empty state** — Renders a "Please load a network" message when no network is loaded (`currentNetworkId` is empty or not found in `networks` map).
- **`message` prop** — Receives the `message` prop required by all panel components; displayed in the panel heading.

## Host Modules Used

```typescript
cyweb/WorkspaceStore   // currentNetworkId
cyweb/NetworkStore     // networks Map<IdType, Network>
```

## Planned Updates

- [ ] Add example of using `cyweb/SelectionApi` (Phase 1c) to display selected node/edge count
