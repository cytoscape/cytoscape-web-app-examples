# claude-bridge — Implementation Plan

> Phased implementation plan for the claude-bridge system.
> See [README.md](README.md) for architecture, [MCP_TOOLS.md](MCP_TOOLS.md)
> for the tool catalog, and [adr/](adr/) for design decisions.

---

## Dependency Graph

```
Phase 0  Scaffold + Infrastructure
   │
   ├── Phase 1a  Workspace + Network tools (6 + 3 = 9 tools)
   │     │
   │     ├── Phase 1b  Element + Selection + Graph Traversal (7 + 5 + 10 = 22 tools)
   │     │     │
   │     │     └── Phase 1c  Table tools (12 tools, incl. TSV I/O)
   │     │           │
   │     │           └── Phase 1d  Visual Style tools (7 tools)
   │     │                 │
   │     │                 └── Phase 1e  Layout + Viewport + Export (6 tools)
   │     │
   │     └── Phase 2  Event Forwarding (cytoscape_wait_for_event)
   │
   └── Phase 3  MF Plugin Panel (BridgePanel + CommandLog)
         │
         └── Phase 4  Integration & Polish
```

Phases 1a–1e are sequential (each domain builds on prior ones).
Phases 2 and 3 can proceed in parallel once Phase 0 is complete.

---

## Phase 0 — Scaffold + Infrastructure

**Goal:** Buildable MF plugin + runnable MCP server, no tools yet.

### MF Plugin

| Task                                                    | Files                                                |
| ------------------------------------------------------- | ---------------------------------------------------- |
| Create `claude-bridge/` from `project-template/`        | `package.json`, `webpack.config.js`, `tsconfig.json` |
| Set port 6000, federation name `claudeBridge`           | `webpack.config.js`                                  |
| Minimal `ClaudeBridgeApp.tsx` with CyApp config         | `src/ClaudeBridgeApp.tsx`, `src/index.ts`            |
| Placeholder `BridgePanel.tsx` (renders "Not connected") | `src/components/BridgePanel.tsx`                     |
| Declare `cyweb/*` remotes                               | `src/remotes.d.ts`                                   |
| Register in `apps.local.json`                           | Host: `src/assets/apps.local.json`                   |

### MCP Server

| Task                                                                                                         | Files                      |
| ------------------------------------------------------------------------------------------------------------ | -------------------------- |
| Create `mcp-server/` directory with `package.json`                                                           | `mcp-server/package.json`  |
| Deps: `@modelcontextprotocol/sdk`, `playwright`                                                              |                            |
| `server.ts`: stdio transport, `chromium.connectOverCDP`, `cywebapi:ready` guard                              | `mcp-server/server.ts`     |
| `callApi.ts`: dispatcher with `claude:*` event dispatch ([README §Dispatcher](README.md#dispatcher-pattern)) | `mcp-server/callApi.ts`    |
| `BridgeResult<T>` / `BridgeError` types                                                                      | `mcp-server/types.ts`      |
| Build with `tsc` → `dist/`                                                                                   | `mcp-server/tsconfig.json` |

### Tests

- Unit test for `callApi` dispatcher (mock `page.evaluate`)
- Verify `BridgeResult` discriminated union

### Verification

- `npm run dev:claude-bridge` starts on port 6000
- `node mcp-server/dist/server.js` connects to CDP and waits for `cywebapi:ready`
- Panel loads in host and shows "Not connected"

---

## Phase 1a — Workspace + Network Tools (9 tools)

**Goal:** First real API tools. Claude can inspect and create networks.

| Tool                                  | File                      |
| ------------------------------------- | ------------------------- |
| `cytoscape_get_workspace`             | `tools/workspaceTools.ts` |
| `cytoscape_get_networks`              |                           |
| `cytoscape_get_network_summary`       |                           |
| `cytoscape_get_current_network`       |                           |
| `cytoscape_switch_network`            |                           |
| `cytoscape_set_workspace_name`        |                           |
| `cytoscape_create_network_from_edges` | `tools/networkTools.ts`   |
| `cytoscape_create_network_from_cx2`   |                           |
| `cytoscape_delete_network`            |                           |

**Summary shaping required for:** `create_network_from_edges`, `create_network_from_cx2`
(return `{ networkId, nodeCount, edgeCount }`, omit `cyNetwork`).

**ADR enforcement:** Both `create_network_*` tools pin `addToWorkspace: true`
([ADR-0006](adr/0006-explicit-call-policy.md)).

### Tests

- Unit tests for each tool (mock `callApi`)
- Manual E2E: Claude creates a network via `cytoscape_create_network_from_edges`

---

## Phase 1b — Element + Selection + Graph Traversal (22 tools)

**Goal:** Claude can read/create/delete nodes and edges, manage selection,
and query network topology.

| Tool                              | File                      |
| --------------------------------- | ------------------------- |
| `cytoscape_get_node`              | `tools/elementTools.ts`   |
| `cytoscape_get_edge`              |                           |
| `cytoscape_create_node`           |                           |
| `cytoscape_create_edge`           |                           |
| `cytoscape_delete_nodes`          |                           |
| `cytoscape_delete_edges`          |                           |
| `cytoscape_move_edge`             |                           |
| `cytoscape_get_node_ids`          |                           |
| `cytoscape_get_edge_ids`          |                           |
| `cytoscape_get_connected_edges`   |                           |
| `cytoscape_get_connected_nodes`   |                           |
| `cytoscape_get_outgoers`          |                           |
| `cytoscape_get_incomers`          |                           |
| `cytoscape_get_successors`        |                           |
| `cytoscape_get_predecessors`      |                           |
| `cytoscape_get_roots`             |                           |
| `cytoscape_get_leaves`            |                           |
| `cytoscape_get_selection`         | `tools/selectionTools.ts` |
| `cytoscape_select`                |                           |
| `cytoscape_add_to_selection`      |                           |
| `cytoscape_remove_from_selection` |                           |
| `cytoscape_toggle_selection`      |                           |

**Summary shaping required for:** `create_node` → `{ nodeId }`, `create_edge` → `{ edgeId }`.
All graph traversal tools use passthrough shaping.

### Tests

- Unit tests for element CRUD and selection mutations
- Manual E2E: Scenario 1 (create network + add nodes) partial

---

## Phase 1c — Table Tools (12 tools)

**Goal:** Claude can read/write data attributes on nodes and edges, and
transfer bulk data via TSV for integration with pandas/R.

| Tool                         | File                  | Shaping     |
| ---------------------------- | --------------------- | ----------- |
| `cytoscape_get_value`        | `tools/tableTools.ts` | Passthrough |
| `cytoscape_get_row`          |                       | Passthrough |
| `cytoscape_create_column`    |                       | Passthrough |
| `cytoscape_set_value`        |                       | Passthrough |
| `cytoscape_set_values`       |                       | Passthrough |
| `cytoscape_edit_rows`        |                       | Passthrough |
| `cytoscape_delete_column`    |                       | Passthrough |
| `cytoscape_rename_column`    |                       | Passthrough |
| `cytoscape_apply_value`      |                       | Passthrough |
| `cytoscape_get_table`        |                       | Summary     |
| `cytoscape_export_table_tsv` |                       | **File**    |
| `cytoscape_import_table_tsv` |                       | Passthrough |

### Tests

- Unit tests for read/write operations
- Unit tests for TSV round-trip: export → edit externally → import
- Manual E2E: Create column, set values, verify with `get_row`
- Manual E2E: Export node TSV, modify in editor, import back

---

## Phase 1d — Visual Style Tools (7 tools)

**Goal:** Claude can apply data-driven visual styles and ad-hoc bypasses.

| Tool                                   | File                        |
| -------------------------------------- | --------------------------- |
| `cytoscape_set_default_style`          | `tools/visualStyleTools.ts` |
| `cytoscape_create_discrete_mapping`    |                             |
| `cytoscape_create_continuous_mapping`  |                             |
| `cytoscape_create_passthrough_mapping` |                             |
| `cytoscape_remove_mapping`             |                             |
| `cytoscape_set_visual_bypass`          |                             |
| `cytoscape_delete_visual_bypass`       |                             |

All passthrough shaping.

### Tests

- Unit tests for mapping and bypass tools
- Manual E2E: Scenario 2 (highlight selection via bypass)

---

## Phase 1e — Layout + Viewport + Export (6 tools)

**Goal:** Claude can lay out networks, control the viewport, and export.

| Tool                         | File                     |
| ---------------------------- | ------------------------ |
| `cytoscape_apply_layout`     | `tools/layoutTools.ts`   |
| `cytoscape_get_layouts`      |                          |
| `cytoscape_fit_network`      | `tools/viewportTools.ts` |
| `cytoscape_get_positions`    |                          |
| `cytoscape_update_positions` |                          |
| `cytoscape_export_network`   | `tools/exportTools.ts`   |

**Special:** `export_network` uses File shaping (temp file + `{ filePath, byteSize }`).
Requires temp file lifecycle implementation (session directory, size guard, cleanup hook).

**ADR enforcement:** `apply_layout` pins `fitAfterLayout: false` ([ADR-0006](adr/0006-explicit-call-policy.md)).

### Tests

- Unit tests including temp file write/cleanup
- Manual E2E: Scenario 1 complete (create + layout + fit)

---

## Phase 2 — Event Forwarding

**Goal:** Claude can receive `CyWebEvents` via `cytoscape_wait_for_event`.

**Can proceed in parallel with Phases 1b–1e** (only requires Phase 0 + Phase 1a).

| Task                                 | Details                                            |
| ------------------------------------ | -------------------------------------------------- |
| Implement `cytoscape_wait_for_event` | Polling tool with `eventType` + `timeoutMs` params |
| Listener cleanup on timeout          | `removeEventListener` + return `{ timeout: true }` |
| Support all 8 `CyWebEvents` types    | `selection:changed`, `network:created`, etc.       |

### Tests

- Unit test: event fires → returns detail
- Unit test: timeout → returns `{ timeout: true }`
- Manual E2E: Scenario 3 (react to UI events)

---

## Phase 3 — MF Plugin Panel

**Goal:** The BridgePanel shows live command/event log from `claude:*` events.

**Can proceed in parallel with Phase 2** (only requires Phase 0).

| Task                                                                                 | Files                            |
| ------------------------------------------------------------------------------------ | -------------------------------- |
| `BridgePanel.tsx`: subscribe to `claude:connected/disconnected/command/result/error` | `src/components/BridgePanel.tsx` |
| `CommandLog.tsx`: timestamped, scrollable log with 10 KB truncation rule             | `src/components/CommandLog.tsx`  |
| Connection status indicator (● Connected / ○ Disconnected)                           |                                  |
| Tab-based filtering (Commands / Events)                                              |                                  |

### Tests

- Render tests: verify event handlers update log entries
- Manual E2E: Watch panel while Claude operates

---

## Phase 4 — Integration & Polish

**Goal:** End-to-end verification of all scenarios + documentation.

| Task                                                                                              | Details                         |
| ------------------------------------------------------------------------------------------------- | ------------------------------- |
| Run all 5 scenarios ([SCENARIOS.md](SCENARIOS.md)) end-to-end                                     | Scenarios 1–5                   |
| Verify post-implementation checklist items ([README.md](README.md#post-implementation-checklist)) | 3 checklist items               |
| Claude Code config documentation                                                                  | `.claude/settings.json` example |
| README for the app (`claude-bridge/README.md`)                                                    | Setup, usage, dev instructions  |
| Update root `CLAUDE.md` and host `apps.local.json`                                                |                                 |
| Startup sequence verification ([README.md](README.md#startup-sequence))                           | 4-step startup                  |

---

## Tool Count Summary

| Phase | Domain                                    | Tools | Cumulative |
| ----- | ----------------------------------------- | ----- | ---------- |
| 0     | Infrastructure                            | 0     | 0          |
| 1a    | Workspace + Network                       | 9     | 9          |
| 1b    | Element + Selection + Graph Traversal     | 22    | 31         |
| 1c    | Table                                     | 9     | 40         |
| 1d    | Visual Style                              | 7     | 47         |
| 1e    | Layout + Viewport + Export                | 6     | 53         |
| 2     | Event Forwarding                          | 1     | 54         |

---

## Key References

| Document                     | What it covers                                       |
| ---------------------------- | ---------------------------------------------------- |
| [README.md](README.md)       | Architecture, dispatcher, security model, file map   |
| [MCP_TOOLS.md](MCP_TOOLS.md) | 54-tool catalog, CyWebApi signatures, shaping policy |
| [SCENARIOS.md](SCENARIOS.md) | 5 end-to-end interaction scenarios                   |
| [adr/](adr/)                 | 7 architecture decision records                      |
| Host `src/app-api/CLAUDE.md` | App API two-layer pattern, error handling            |
| Host `webpack.config.js`     | Module Federation exposes list                       |
