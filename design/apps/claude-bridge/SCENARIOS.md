# claude-bridge — Interaction Scenarios

> Extracted from [README.md](README.md). These scenarios are illustrative and
> may evolve during implementation.

---

## Scenario 1: Create a Network with Layout

`createNetworkFromEdgeList` creates nodes implicitly from the edge list, so
individual `createNode` calls are unnecessary for simple topologies.

```
User: Create a network with nodes A, B, C connected A→B and B→C,
      then apply a circle layout and fit the view.

Claude:
  [tool] cytoscape_create_network_from_edges(
           name="Demo",
           edgeList=[["A","B"],["B","C"]]
         )
         → { networkId:"net-001", nodeCount:3, edgeCount:2 }

  [tool] cytoscape_apply_layout(
           networkId="net-001",
           algorithmName="circle"
         )

  [tool] cytoscape_fit_network(networkId="net-001")

Panel shows each ← command and → result as it arrives.
```

> **When to use `element.createNode` instead?** Use individual node creation
> when you need precise initial positions or per-node attributes at creation
> time. For pure topology, `createNetworkFromEdgeList` is more efficient.

> **Note on `cytoscape_fit_network`:** The bridge pins
> `fitAfterLayout: false` when calling the host's `applyLayout`, so the
> explicit `fit` call is the **sole** mechanism for fitting the viewport.
> See [Explicit-call policy](README.md#explicit-call-policy-for-mcp-tools) in
> Key Design Decisions.

---

## Scenario 2: Highlight the Current Selection (bypass)

```
User: Color the selected nodes red.

Claude:
  [tool] cytoscape_get_current_network()       → {networkId:"net-001"}
  [tool] cytoscape_get_selection("net-001")    → {selectedNodes:["n-1","n-3"],selectedEdges:[]}
  [tool] cytoscape_set_visual_bypass(
           networkId="net-001",
           vpName="nodeBackgroundColor",
           elementIds=["n-1","n-3"],
           vpValue="#FF0000"
         )

Panel shows the bypass call alongside the live style:changed event.
```

> **Why bypass here?**
> The user is making a direct, transient visual override on a specific selection —
> not expressing a relationship between data and appearance. Bypass is appropriate
> when: (a) no data attribute encodes the intent, (b) the change is temporary or
> ad-hoc. When the intent _is_ data-driven (e.g. "color nodes by cluster"), the
> correct approach is to write the data first and then create a mapping — see
> Scenario 4.

---

## Scenario 3: React to UI Events

```
User: Whenever I select a node, report its attributes.

Claude: Monitoring selection:changed — select a node in the browser.

(User clicks node "n-2" in the Cytoscape Web canvas)

→ [event] selection:changed {selectedNodes:["n-2"],selectedEdges:[]}
  [tool] cytoscape_get_row(
           networkId="net-001", tableType="node", elementId="n-2"
         )
         → { row: { name:"B", degree:2, betweenness:0.5 } }

Claude: Node "B" selected.  degree=2  betweenness=0.5
```

_Scenario 3 uses `cytoscape_wait_for_event('selection:changed', 30000)` to
receive the event. See [Event Forwarding to Claude](README.md#event-forwarding-to-claude)
for the polling architecture._

---

## Scenario 4: External Analysis with Data-Driven Styling (Advanced)

> **Scope note:** This scenario is **illustrative pseudo-code**, not a
> data-transfer specification. The Python/Bash steps show what Claude would
> do using its own Bash tool — they are outside this design document's scope.
> `cx2_to_networkx()` is a hypothetical user-provided helper, not part of
> Cytoscape Web or this MCP server. The CX2 file path is written by the MCP
> tool's shaping layer (see [MCP Result Shaping](MCP_TOOLS.md#mcp-result-shaping));
> Claude reads the returned `filePath` and passes it to the Python script.

This scenario illustrates the most powerful use case: Claude orchestrates external
computation tools (Python, R, etc.) that Cytoscape Web does not natively provide,
then writes results back as data attributes and applies visual mappings.

**Task:** Run Louvain community detection via NetworkX on the loaded network and
colour-code nodes by cluster.

**Why mappings, not bypasses?**
Cluster membership is a property of the data. The visual encoding (colour)
should be derived from that property through a mapping, not applied as a
per-element override. This way the mapping is reusable, visible in the style
panel, and automatically consistent if the data changes.

**Step-by-step flow:**

```
User: Run Louvain clustering on the current network and colour-code the clusters.

── Step 1: Export the network ──────────────────────────────────────────────────

  [tool] cytoscape_get_current_network()
         → {networkId:"net-001"}
  [tool] cytoscape_get_network_summary(networkId="net-001")
         → {networkId:"net-001", name:"PPI Network", nodeCount:1247, edgeCount:8932, ...}

  [tool] cytoscape_export_network(networkId="net-001")
         → { filePath:"/tmp/cyweb-bridge-f47ac10b/export-a1b2c3d4.cx2", byteSize:284510 }

── Step 2: Run NetworkX locally (Claude's Bash tool — outside MCP/CDP) ─────────

  [bash] python3 - <<'EOF'
  import sys, json, networkx as nx
  from networkx.algorithms.community import louvain_communities

  cx2 = json.load(open('/tmp/cyweb-bridge-f47ac10b/export-a1b2c3d4.cx2'))
  G   = cx2_to_networkx(cx2)                 # helper converts CX2 → nx.Graph

  communities = louvain_communities(G, seed=42)
  partition   = {}
  for cluster_id, members in enumerate(communities):
      for node in members:
          partition[node] = cluster_id

  json.dump(partition, sys.stdout)
  EOF
         → {"n-1":0, "n-2":1, "n-3":0, ...}   (1247 entries, 7 distinct clusters)

── Step 3: Write cluster assignments back to the data table ────────────────────

  # 3a. Create the column if it does not yet exist
  [tool] cytoscape_create_column(
           networkId="net-001", tableType="node",
           columnName="louvain_cluster", dataType="integer", defaultValue=-1
         )

  # 3b. Write all assignments in a single API call
  #     table.editRows() accepts Record<IdType, Record<AttributeName, ValueType>>
  [tool] cytoscape_edit_rows(
           networkId="net-001", tableType="node",
           rows={
             "n-1": {"louvain_cluster": 0},
             "n-2": {"louvain_cluster": 1},
             "n-3": {"louvain_cluster": 0},
             ...                               ← all 1247 nodes, one CDP call
           }
         )

  Panel shows:  ← table.editRows  (1247 rows)  → {success:true}
  Event bus fires: data:changed  {tableType:"node", rowIds:[...]}

── Step 4: Create a discrete mapping — cluster ID → node colour ─────────────

  [tool] cytoscape_create_discrete_mapping(
           networkId="net-001",
           vpName="nodeBackgroundColor",
           attribute="louvain_cluster",
           attributeType="integer"
         )

  Panel shows:  ← visualStyle.createDiscreteMapping  → {success:true}
  Event bus fires: style:changed  {property:"nodeBackgroundColor"}

── Step 5: Fit the view ────────────────────────────────────────────────────────

  [tool] cytoscape_fit_network(networkId="net-001")

Claude: Found 7 communities (Louvain, seed=42). Cluster assignments written to
        the "louvain_cluster" node attribute. A discrete colour mapping has been
        applied to nodeBackgroundColor. The mapping is visible and editable in
        the Visual Style panel.
```

**API calls summary for this scenario:**

| Step                      | `window.CyWebApi` call                     | Round-trips |
| ------------------------- | ------------------------------------------ | ----------- |
| Get current network       | `workspace.getCurrentNetworkId()`          | 1           |
| Get network summary       | `workspace.getNetworkSummary(networkId)`   | 1           |
| Export network            | `export.exportToCx2(networkId)`            | 1           |
| Create column             | `table.createColumn(...)`                  | 1           |
| Write 1247 cluster IDs    | `table.editRows(networkId, 'node', {...})` | **1**       |
| Create colour mapping     | `visualStyle.createDiscreteMapping(...)`   | 1           |
| Fit view                  | `viewport.fit(networkId)`                  | 1           |
| **Total CDP round-trips** |                                            | **7**       |

> **Why 1 round-trip per call?** The `callApi()` dispatcher batches the
> `claude:command` event, the API call, and the `claude:result` event into a
> single `page.evaluate()`. See [Dispatcher Pattern](README.md#dispatcher-pattern).

The Python computation step runs entirely on the local machine via Claude's Bash
tool and has no CDP overhead. Only the data transfer back into Cytoscape (step 3)
touches the browser, and `table.editRows()` does that in a single call regardless
of network size.
