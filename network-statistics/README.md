# Network Statistics — Non-React Example

A **non-React** Cytoscape Web app that computes and logs network topology
statistics to the browser console. No panels, no menus, no React components —
only the `mount()`/`unmount()` lifecycle and the Graph Traversal API.

## What It Does

When this app is enabled, it:

1. **On mount** — immediately logs statistics for the current network
2. **On `network:switched`** — logs statistics whenever the user navigates to a
   different network
3. **On `selection:changed`** — logs a short selection summary (node/edge count)

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
├── webpack.config.js
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
| **Events**      | `network:switched`, `selection:changed`                       |

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
