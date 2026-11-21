# network-workflows — Design Document

## Overview

Advanced workflow example app. Demonstrates network creation, CX2 import, and
external web app integration via `postMessage`.

| Property | Value |
|----------|-------|
| Federation name | `networkWorkflows` |
| Dev port | 7001 |
| App config file | `network-workflows/src/NetworkWorkflowsApp.tsx` |
| App API | `apiVersion: '1.0'`, `@cytoscape-web/api-types` `^1.0.0-beta.5` |

## Resources

Everything the app contributes is declared in the `resources` array of
`NetworkWorkflowsApp.tsx`. The app has no `mount()` or `unmount()`.

### Apps-menu entries

An `'apps-menu'` entry is plain data: a `label` and an `onClick(apis)`. The host
renders the row and closes the dropdown itself, so there is no menu component.

| Resource id | Label | Action (`src/menuActions.ts`) | Purpose |
|-------------|-------|-------------------------------|---------|
| `CreateNetworkMenu` | Create Example Network | `createExampleNetwork` | Creates a three-node network from an edge list via `apis.network.createNetworkFromEdgeList` |
| `CreateNetworkFromCx2Menu` | Create Network from CX2 | `createNetworkFromSampleCx2` | Fetches a sample CX2 file and creates a network via `apis.network.createNetworkFromCx2` |

### Panel components

| Resource id | File | Purpose |
|-------------|------|---------|
| `JupyterConnectorPanel` | `src/components/JupyterConnectorPanel.tsx` | Receives CX2 data from Jupyter via `postMessage` and creates a network |

## Key Design Decisions

- **Separated from `hello-world`** — keeps the API tour in one app and the richer workflows in another.
- **Two menu entries + one panel** — covers both the `'apps-menu'` and the `'right-panel'` slot with realistic actions.
- **Menu actions in their own file** — `menuActions.ts` holds plain functions that take `apis`, so each can be unit tested with a stub and read without scrolling past the registration.
- **Jupyter integration** — demonstrates the parent-child `postMessage` pattern using CX2 payloads.

## Host Modules Used

```typescript
cyweb/ApiTypes    // types only: CyAppWithLifecycle, AppContextApis, Cx2
cyweb/NetworkApi  // useNetworkApi() in JupyterConnectorPanel
```

The menu actions import no host module at runtime: the API arrives as the
`onClick` argument. Every call returns an `ApiResult<T>` and is checked with
`result.success`.
