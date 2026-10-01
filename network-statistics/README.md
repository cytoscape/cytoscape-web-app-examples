# Network Statistics — Non-React Example

A **non-React** Cytoscape Web app that computes and logs network topology
statistics to the browser console. No panels, no menus, no React components —
only the `mount()`/`unmount()` lifecycle and the Graph Traversal API.

## What It Does

When this app is enabled, it:

1. **On mount** — immediately logs statistics for the current network
2. **On `network:switched`** — logs statistics whenever the user navigates to a
   different network
3. **On `network:loaded`** — logs statistics for a network that could not be
   read yet when it became current (see below)
4. **On `selection:changed`** — logs a short selection summary (node/edge count)

### Switching is not loading

After a page reload the host holds only network summaries. A network's tables
and view load the first time it becomes current, and `network:switched` fires
**before** that load lands, so a read made on the switch fails with `APP1`.
The app remembers the network it could not read and reads it again on that
network's `network:loaded` (api-types `1.0.0-beta.5`). A load for any other
network is ignored: `network:loaded` also fires for networks that are not on
screen, and fires only once per network, so it is a retry cue rather than a
second "network changed" event.

### Statistics Reported

| Metric         | Description                                |
|----------------|--------------------------------------------|
| Nodes          | Total number of nodes                      |
| Edges          | Total number of edges                      |
| Density        | `edges / (nodes × (nodes − 1))`           |
| Avg Degree     | Mean connected-edge count per node         |
| Max Degree     | Highest connected-edge count               |
| Min Degree     | Lowest connected-edge count                |
| Root Nodes     | Nodes with no incoming edges               |
| Leaf Nodes     | Nodes with no outgoing edges               |
| Isolated Nodes | Nodes with no edges at all (degree = 0)    |

Output example (browser console):

```
[NetworkStatistics]
+---------------------------------+
|  Network Statistics: My Network |
+----------------+----------------+
| Nodes          |            120 |
| Edges          |            340 |
| Density        |       0.023810 |
| Avg Degree     |           5.67 |
| Max Degree     |             42 |
| Min Degree     |              0 |
| Root Nodes     |              3 |
| Leaf Nodes     |             18 |
| Isolated Nodes |              1 |
+----------------+----------------+
```

## Why Non-React?

This example demonstrates that Cytoscape Web apps do not need React. It is
useful as a starting point for:

- **Browser extensions** that interact with Cytoscape Web via `window.CyWebApi`
- **Jupyter notebook integrations** that send commands from Python
- **Headless analytics** that run computations without any UI
- **LLM agent bridges** that use the API programmatically

## Project Structure

```
network-statistics/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── index.ts                   ← barrel export (default = CyAppWithLifecycle)
    ├── NetworkStatisticsApp.ts    ← app definition with mount/unmount
    └── statistics.ts              ← pure computation (no API dependency)
```

Key design choice: `statistics.ts` contains **pure functions** with no
dependency on the Cytoscape Web API. This separation makes the computation
logic easy to test and reuse.

## APIs Used

| API             | Methods                                                       |
|-----------------|---------------------------------------------------------------|
| **ElementApi**  | `getNodeIds`, `getEdgeIds`, `getConnectedEdges`, `getRoots`, `getLeaves` |
| **WorkspaceApi**| `getCurrentNetworkId`, `getNetworkSummary`                    |
| **Events**      | `network:switched`, `network:loaded`, `selection:changed`     |

## Running Locally

```bash
# From the repository root
npm run dev:network-statistics

# Or run all examples together
npm run dev
```

Then enable the app in the host: **Apps → App Settings → Network Statistics**.

Open the browser DevTools console to see the statistics output.

## Dev Server

| Property        | Value            |
|-----------------|------------------|
| Port            | 3333             |
| Federation name | networkStatistics|
| Remote entry    | `http://localhost:3333/remoteEntry.js` |
