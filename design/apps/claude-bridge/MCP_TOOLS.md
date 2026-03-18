# MCP Tool List & Result Shaping

> Extracted from [README.md](README.md). This document defines every MCP tool
> exposed by the claude-bridge MCP server and the result shaping policy that
> governs what Claude receives.

---

## MCP Tool List

All `window.CyWebApi` method signatures below match the host implementation.
See `src/app-api/core/*.ts` in `cytoscape-web` for canonical type definitions.

**Workspace**

| MCP tool                        | `window.CyWebApi` call                      | Notes                                                           |
| ------------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| `cytoscape_get_workspace`       | `workspace.getWorkspaceInfo()`              | Returns `{ workspaceId, name, currentNetworkId, networkCount }` |
| `cytoscape_get_networks`        | `workspace.getNetworkList()`                | Summary list of all networks in the workspace                   |
| `cytoscape_get_network_summary` | `workspace.getNetworkSummary(networkId)`    | Single network metadata                                         |
| `cytoscape_get_current_network` | `workspace.getCurrentNetworkId()`           | Returns `{ networkId }`                                         |
| `cytoscape_switch_network`      | `workspace.switchCurrentNetwork(networkId)` | Changes the active network                                      |
| `cytoscape_set_workspace_name`  | `workspace.setWorkspaceName(name)`          | Renames the workspace                                           |

**Network**

| MCP tool                              | `window.CyWebApi` call                                       | Notes                                                           |
| ------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| `cytoscape_create_network_from_edges` | `network.createNetworkFromEdgeList({ name, edgeList, ... })` | Creates network + nodes from `[source, target, interaction?][]` |
| `cytoscape_create_network_from_cx2`   | `network.createNetworkFromCx2({ cxData, ... })`              | Creates network from CX2 JSON                                   |
| `cytoscape_delete_network`            | `network.deleteNetwork(networkId, options?)`                 | `options.navigate` defaults to `true`                           |

**Element**

| MCP tool                 | `window.CyWebApi` call                                                | Notes                                                              |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `cytoscape_get_node`     | `element.getNode(networkId, nodeId)`                                  | Returns `{ attributes, position }`                                 |
| `cytoscape_get_edge`     | `element.getEdge(networkId, edgeId)`                                  | Returns `{ sourceId, targetId, attributes }`                       |
| `cytoscape_create_node`  | `element.createNode(networkId, position, options?)`                   | `position: [x, y, z?]`, `options.attributes`, `options.autoSelect` |
| `cytoscape_create_edge`  | `element.createEdge(networkId, sourceNodeId, targetNodeId, options?)` | `options.attributes`, `options.autoSelect`                         |
| `cytoscape_delete_nodes` | `element.deleteNodes(networkId, nodeIds)`                             | Also deletes connected edges                                       |
| `cytoscape_delete_edges` | `element.deleteEdges(networkId, edgeIds)`                             |                                                                    |
| `cytoscape_move_edge`    | `element.moveEdge(networkId, edgeId, newSourceId, newTargetId)`       | Changes source and/or target of an existing edge                   |

**Element — graph traversal (read-only queries)**

These methods query network topology without modifying data. They operate on
the in-memory graph structure and are useful for Claude to analyze networks
before deciding on operations.

| MCP tool                         | `window.CyWebApi` call                               | Notes                                                      |
| -------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `cytoscape_get_node_ids`         | `element.getNodeIds(networkId)`                       | Returns `{ nodeIds: IdType[] }`                            |
| `cytoscape_get_edge_ids`         | `element.getEdgeIds(networkId)`                       | Returns `{ edgeIds: IdType[] }`                            |
| `cytoscape_get_connected_edges`  | `element.getConnectedEdges(networkId, nodeId)`        | All edges (in + out) connected to a node                   |
| `cytoscape_get_connected_nodes`  | `element.getConnectedNodes(networkId, nodeId)`        | Undirected 1-hop neighbors                                 |
| `cytoscape_get_outgoers`         | `element.getOutgoers(networkId, nodeId)`              | Directed 1-hop: `{ nodeIds, edgeIds }` downstream          |
| `cytoscape_get_incomers`         | `element.getIncomers(networkId, nodeId)`              | Directed 1-hop: `{ nodeIds, edgeIds }` upstream            |
| `cytoscape_get_successors`       | `element.getSuccessors(networkId, nodeId)`            | Transitive closure downstream (all descendants)            |
| `cytoscape_get_predecessors`     | `element.getPredecessors(networkId, nodeId)`          | Transitive closure upstream (all ancestors)                |
| `cytoscape_get_roots`            | `element.getRoots(networkId)`                         | Nodes with no incoming edges                               |
| `cytoscape_get_leaves`           | `element.getLeaves(networkId)`                        | Nodes with no outgoing edges                               |

**Selection**

| MCP tool                          | `window.CyWebApi` call                                   | Notes                                      |
| --------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| `cytoscape_get_selection`         | `selection.getSelection(networkId)`                      | Returns `{ selectedNodes, selectedEdges }` |
| `cytoscape_select`                | `selection.exclusiveSelect(networkId, nodeIds, edgeIds)` | Replaces current selection                 |
| `cytoscape_add_to_selection`      | `selection.additiveSelect(networkId, ids)`               | Adds to current selection                  |
| `cytoscape_remove_from_selection` | `selection.additiveUnselect(networkId, ids)`             | Removes from current selection             |
| `cytoscape_toggle_selection`      | `selection.toggleSelected(networkId, ids)`               | Toggles each element                       |

**Table (data attributes)**

| MCP tool                  | `window.CyWebApi` call                                                                         | Notes                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `cytoscape_get_value`     | `table.getValue(networkId, tableType, elementId, column)`                                      | Single cell read                                                            |
| `cytoscape_get_row`       | `table.getRow(networkId, tableType, elementId)`                                                | All attributes of one element                                               |
| `cytoscape_create_column` | `table.createColumn(networkId, tableType, name, dataType, defaultValue)`                       | Must call before `edit_rows` for new columns                                |
| `cytoscape_set_value`     | `table.setValue(networkId, tableType, elementId, column, value)`                               | Single cell write                                                           |
| `cytoscape_set_values`    | `table.setValues(networkId, tableType, cellEdits: CellEdit[])`                                 | Bulk write of `{id, column, value}[]` — one column across many elements     |
| `cytoscape_edit_rows`     | `table.editRows(networkId, tableType, rows: Record<IdType, Record<AttributeName, ValueType>>)` | **Bulk write of multiple attributes across many elements in a single call** |
| `cytoscape_delete_column` | `table.deleteColumn(networkId, tableType, columnName)`                                         | Removes column and all its values                                           |
| `cytoscape_rename_column` | `table.setColumnName(networkId, tableType, currentName, newName)`                              | Renames an existing column                                                  |
| `cytoscape_apply_value`   | `table.applyValueToElements(networkId, tableType, columnName, value, elementIds?)`             | Sets one value on many elements; omit `elementIds` for all                  |

**Table (TSV I/O — bulk transfer)**

For large tables, TSV format is ~10x more compact than JSON and maps 1:1 to
pandas DataFrames. Prefer these tools over `edit_rows` / `export_network` when
transferring data between Claude's analysis tools and the browser.

| MCP tool                     | `window.CyWebApi` call                                             | Notes                                                                     |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `cytoscape_get_table`        | `table.getTable(networkId, tableType, options?)`                   | Structured read: `{ columns: ColumnInfo[], rows: Record[] }`. Edge table includes `source`/`target` |
| `cytoscape_export_table_tsv` | `table.exportTableToTsv(networkId, tableType, options?)`           | **File-shaped**: writes TSV to session dir, returns `{ filePath, rowCount }`. Preferred for large tables |
| `cytoscape_import_table_tsv` | `table.importTableFromTsv(networkId, tableType, tsvText, options?)` | Parses TSV, auto-creates columns, matches by key column. Returns `{ rowCount, newColumns }` |

> **Result shaping:** `cytoscape_export_table_tsv` uses **File** shaping (same as
> `export_network`): the TSV string is written to `<session-dir>/table-<uuid>.tsv`
> and Claude receives `{ filePath, rowCount }`. This avoids injecting large text
> into the tool result. `cytoscape_import_table_tsv` accepts the TSV text directly
> as a parameter (Claude reads the file and passes the content).

**Visual Style — mappings (standard approach)**

Data-to-visual mappings are the primary way to style networks. They are
data-driven, persistent, and editable through the Cytoscape Web UI.

| MCP tool                               | `window.CyWebApi` call                                                                                      | Notes                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `cytoscape_set_default_style`          | `visualStyle.setDefault(networkId, vpName, vpValue)`                                                        | Fallback value when no mapping or bypass applies                              |
| `cytoscape_create_discrete_mapping`    | `visualStyle.createDiscreteMapping(networkId, vpName, attribute, attributeType)`                            | Maps categorical attribute values → visual property (e.g. cluster ID → color) |
| `cytoscape_create_continuous_mapping`  | `visualStyle.createContinuousMapping(networkId, vpName, vpType, attribute, attributeValues, attributeType)` | Maps numeric range → visual property (e.g. score → node size)                 |
| `cytoscape_create_passthrough_mapping` | `visualStyle.createPassthroughMapping(networkId, vpName, attribute, attributeType)`                         | Uses attribute value directly (e.g. `name` → node label)                      |
| `cytoscape_remove_mapping`             | `visualStyle.removeMapping(networkId, vpName)`                                                              | Removes mapping; falls back to default                                        |

**Visual Style — bypass (exception use only)**

Bypass overrides style for specific elements regardless of mappings. Use only
for transient, ad-hoc overrides — not for data-driven styling.

| MCP tool                         | `window.CyWebApi` call                                          | Notes                                                                     |
| -------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `cytoscape_set_visual_bypass`    | `visualStyle.setBypass(networkId, vpName, elementIds, vpValue)` | Temporary per-element override (e.g. highlight a node during interaction) |
| `cytoscape_delete_visual_bypass` | `visualStyle.deleteBypass(networkId, vpName, elementIds)`       | Removes bypass; element reverts to mapping or default                     |

**Layout / Viewport / Export**

| MCP tool                     | `window.CyWebApi` call                               | Notes                                                                                                       |
| ---------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `cytoscape_apply_layout`     | `layout.applyLayout(networkId, options?)`            | `options.algorithmName`; bridge pins `fitAfterLayout: false` — use `cytoscape_fit_network` for explicit fit |
| `cytoscape_get_layouts`      | `layout.getAvailableLayouts()`                       | Returns `LayoutAlgorithmInfo[]`                                                                             |
| `cytoscape_fit_network`      | `viewport.fit(networkId)`                            | Sole mechanism for fitting the viewport in the MCP layer                                                    |
| `cytoscape_get_positions`    | `viewport.getNodePositions(networkId, nodeIds)`      | Returns `{ positions: Record<IdType, [x,y,z?]> }`                                                           |
| `cytoscape_update_positions` | `viewport.updateNodePositions(networkId, positions)` |                                                                                                             |
| `cytoscape_export_network`   | `export.exportToCx2(networkId, options?)`            | `options.networkName`                                                                                       |

---

## MCP Result Shaping

MCP tools return results to Claude (an LLM), not to application code. The
following policy governs what each tool returns:

| Policy                        | When to apply                                                      | Example                                                                                |
| ----------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| **Raw passthrough** (default) | API result is small and Claude needs the data to decide next steps | `getSelection` → `{ selectedNodes, selectedEdges }` as-is                              |
| **Summary shaping**           | API result contains large or opaque objects Claude cannot use      | `createNetworkFromEdgeList` → `{ networkId, nodeCount, edgeCount }` (omit `cyNetwork`) |
| **Streaming chunk**           | Result exceeds MCP message size limits (e.g. full CX2 export)      | `exportToCx2` → write to temp file, return `{ filePath, byteSize }`                    |

Each MCP tool's `outputSchema` declares the shaped result type. Tool
implementations in `tools/*.ts` perform the shaping before returning.

**Per-tool MCP output definitions:**

Every MCP tool listed in the [MCP Tool List](#mcp-tool-list) above appears
exactly once in this table. Tool names are identical in both tables.

| MCP tool                               | Shaping     | MCP output (on success)                                  |
| -------------------------------------- | ----------- | -------------------------------------------------------- |
| `cytoscape_get_workspace`              | Passthrough | `{ workspaceId, name, currentNetworkId, networkCount }`  |
| `cytoscape_get_networks`               | Passthrough | `NetworkSummary[]`                                       |
| `cytoscape_get_network_summary`        | Passthrough | `NetworkSummary`                                         |
| `cytoscape_get_current_network`        | Passthrough | `{ networkId }`                                          |
| `cytoscape_switch_network`             | Passthrough | `{}` (void success)                                      |
| `cytoscape_set_workspace_name`         | Passthrough | `{}` (void success)                                      |
| `cytoscape_create_network_from_edges`  | Summary     | `{ networkId, nodeCount, edgeCount }` (omit `cyNetwork`) |
| `cytoscape_create_network_from_cx2`    | Summary     | `{ networkId, nodeCount, edgeCount }` (omit `cyNetwork`) |
| `cytoscape_delete_network`             | Passthrough | `{}` (void success)                                      |
| `cytoscape_get_node`                   | Passthrough | `{ attributes, position }`                               |
| `cytoscape_get_edge`                   | Passthrough | `{ sourceId, targetId, attributes }`                     |
| `cytoscape_create_node`                | Summary     | `{ nodeId }`                                             |
| `cytoscape_create_edge`                | Summary     | `{ edgeId }`                                             |
| `cytoscape_delete_nodes`               | Passthrough | `{ deletedNodeCount, deletedEdgeCount }`                 |
| `cytoscape_delete_edges`               | Passthrough | `{ deletedEdgeCount }`                                   |
| `cytoscape_move_edge`                  | Passthrough | `{}` (void success)                                      |
| `cytoscape_get_node_ids`              | Passthrough | `{ nodeIds: IdType[] }`                                  |
| `cytoscape_get_edge_ids`              | Passthrough | `{ edgeIds: IdType[] }`                                  |
| `cytoscape_get_connected_edges`       | Passthrough | `{ edges: EdgeData[] }`                                  |
| `cytoscape_get_connected_nodes`       | Passthrough | `{ nodeIds: IdType[] }`                                  |
| `cytoscape_get_outgoers`              | Passthrough | `{ nodeIds: IdType[], edgeIds: IdType[] }`               |
| `cytoscape_get_incomers`              | Passthrough | `{ nodeIds: IdType[], edgeIds: IdType[] }`               |
| `cytoscape_get_successors`            | Passthrough | `{ nodeIds: IdType[] }`                                  |
| `cytoscape_get_predecessors`          | Passthrough | `{ nodeIds: IdType[] }`                                  |
| `cytoscape_get_roots`                 | Passthrough | `{ nodeIds: IdType[] }`                                  |
| `cytoscape_get_leaves`                | Passthrough | `{ nodeIds: IdType[] }`                                  |
| `cytoscape_get_selection`              | Passthrough | `{ selectedNodes, selectedEdges }`                       |
| `cytoscape_select`                     | Passthrough | `{}` (void success)                                      |
| `cytoscape_add_to_selection`           | Passthrough | `{}` (void success)                                      |
| `cytoscape_remove_from_selection`      | Passthrough | `{}` (void success)                                      |
| `cytoscape_toggle_selection`           | Passthrough | `{}` (void success)                                      |
| `cytoscape_get_value`                  | Passthrough | `{ value: ValueType }`                                   |
| `cytoscape_get_row`                    | Passthrough | `{ row: Record<string, ValueType> }`                     |
| `cytoscape_create_column`              | Passthrough | `{}` (void success)                                      |
| `cytoscape_set_value`                  | Passthrough | `{}` (void success)                                      |
| `cytoscape_set_values`                 | Passthrough | `{}` (void success)                                      |
| `cytoscape_edit_rows`                  | Passthrough | `{}` (void success)                                      |
| `cytoscape_delete_column`              | Passthrough | `{}` (void success)                                      |
| `cytoscape_rename_column`              | Passthrough | `{}` (void success)                                      |
| `cytoscape_apply_value`               | Passthrough | `{}` (void success)                                      |
| `cytoscape_set_default_style`          | Passthrough | `{}` (void success)                                      |
| `cytoscape_create_discrete_mapping`    | Passthrough | `{}` (void success)                                      |
| `cytoscape_create_continuous_mapping`  | Passthrough | `{}` (void success)                                      |
| `cytoscape_create_passthrough_mapping` | Passthrough | `{}` (void success)                                      |
| `cytoscape_remove_mapping`             | Passthrough | `{}` (void success)                                      |
| `cytoscape_set_visual_bypass`          | Passthrough | `{}` (void success)                                      |
| `cytoscape_delete_visual_bypass`       | Passthrough | `{}` (void success)                                      |
| `cytoscape_apply_layout`               | Passthrough | `{}` (void success)                                      |
| `cytoscape_get_layouts`                | Passthrough | `LayoutAlgorithmInfo[]`                                  |
| `cytoscape_fit_network`                | Passthrough | `{}` (void success)                                      |
| `cytoscape_get_positions`              | Passthrough | `{ positions: Record<IdType, [x,y,z?]> }`                |
| `cytoscape_update_positions`           | Passthrough | `{}` (void success)                                      |
| `cytoscape_export_network`             | File        | Write CX2 to temp file; return `{ filePath, byteSize }`  |
| `cytoscape_wait_for_event`             | Passthrough | Event detail object, or `{ timeout: true }` on expiry    |

> **Rationale:** Returning raw `cyNetwork` objects (with full adjacency
> structures) wastes Claude's context window and adds no decision-making
> value. Summary shaping keeps tool results concise while preserving the
> IDs and counts Claude needs to chain subsequent operations.

### Summary shaping implementation notes

**`createNetworkFromEdgeList` / `createNetworkFromCx2`:** The host API
returns `{ networkId, cyNetwork }`. The shaping layer extracts counts from
the `cyNetwork` object:

```typescript
const { networkId, cyNetwork } = result.data
return {
  networkId,
  nodeCount: cyNetwork.network.nodes.length,
  edgeCount: cyNetwork.network.edges.length,
}
```

**`createNode` / `createEdge`:** The host API already returns
`{ nodeId }` / `{ edgeId }` — no additional shaping needed (passthrough
of `ApiSuccess.data` is sufficient).

---

## Intentionally Excluded Host Methods

The following `window.CyWebApi` methods are **not** exposed as MCP tools.
Each exclusion is deliberate.

| Host method | Domain | Reason for exclusion |
| --- | --- | --- |
| `network.deleteCurrentNetwork()` | Network | Redundant — `cytoscape_get_current_network` + `cytoscape_delete_network` achieves the same result with explicit ID |
| `network.deleteAllNetworks()` | Network | Destructive bulk operation; too risky for an LLM agent without confirmation UI |
| `element.generateNextNodeId()` | Element | Internal ID generation helper; not useful for external callers |
| `element.generateNextEdgeId()` | Element | Same as above |
| `contextMenu.addContextMenuItem()` | ContextMenu | Runtime UI registration is outside the bridge's scope (bridge operates via CLI, not UI) |
| `contextMenu.removeContextMenuItem()` | ContextMenu | Same as above |
