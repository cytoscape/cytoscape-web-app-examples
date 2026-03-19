# claude-bridge — Implementation Checklist

> Task-level tracking for each phase.
> See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for architecture context.

---

## Phase 0: Scaffold + Infrastructure

### MF Plugin

- [ ] Create `claude-bridge/` directory from `project-template/`
- [ ] Set port 6000, federation name `claudeBridge` in `webpack.config.js`
- [ ] Create `src/ClaudeBridgeApp.tsx` with `CyAppWithLifecycle` config
- [ ] Create `src/index.ts` entry point (re-export default)
- [ ] Create placeholder `src/components/BridgePanel.tsx` ("Not connected")
- [ ] Declare `cyweb/*` remotes in `src/remotes.d.ts`
- [ ] Register in host `src/assets/apps.local.json`
- [ ] Add to root `package.json` workspaces and dev scripts

### MCP Server

- [ ] Create `mcp-server/` directory with `package.json`
- [ ] Install deps: `@modelcontextprotocol/sdk`, `playwright`
- [ ] Create `mcp-server/server.ts`: stdio transport, CDP connect, `cywebapi:ready` guard
- [ ] Create `mcp-server/callApi.ts`: dispatcher with `claude:*` event dispatch
- [ ] Create `mcp-server/types.ts`: `BridgeResult<T>`, `BridgeError`
- [ ] Create `mcp-server/tsconfig.json` and build pipeline (`tsc` → `dist/`)
- [ ] Create `mcp-server/tools/` directory structure

### Tests

- [ ] Unit test for `callApi` dispatcher (mock `page.evaluate`)
- [ ] Verify `BridgeResult` discriminated union

### Verification

- [ ] `npm run dev:claude-bridge` starts on port 6000
- [ ] `node mcp-server/dist/server.js` connects to CDP and waits for `cywebapi:ready`
- [ ] Panel loads in host and shows "Not connected"

---

## Phase 1a: Workspace + Network Tools (9 tools)

### Implementation

- [ ] Create `tools/workspaceTools.ts`:
  - [ ] `cytoscape_get_workspace` — passthrough
  - [ ] `cytoscape_get_networks` — passthrough
  - [ ] `cytoscape_get_network_summary` — summary (omit full cyNetwork)
  - [ ] `cytoscape_get_current_network` — passthrough
  - [ ] `cytoscape_switch_network` — passthrough
  - [ ] `cytoscape_set_workspace_name` — passthrough
- [ ] Create `tools/networkTools.ts`:
  - [ ] `cytoscape_create_network_from_edges` — summary (`{ networkId, nodeCount, edgeCount }`)
  - [ ] `cytoscape_create_network_from_cx2` — summary (`{ networkId, nodeCount, edgeCount }`)
  - [ ] `cytoscape_delete_network` — passthrough
- [ ] Enforce ADR-0006: `addToWorkspace: true` on both create tools
- [ ] Register all 9 tools in `server.ts`

### Tests

- [ ] Unit tests for each tool (mock `callApi`)
- [ ] Manual E2E: Claude creates a network via `cytoscape_create_network_from_edges`

### Verification

- [ ] All 9 tools listed in `server.listTools()`
- [ ] `create_network_from_edges` returns summary (no cyNetwork object)

---

## Phase 1b: Element + Selection + Graph Traversal (22 tools)

### Element Tools

- [ ] Create `tools/elementTools.ts`:
  - [ ] `cytoscape_get_node` — passthrough
  - [ ] `cytoscape_get_edge` — passthrough
  - [ ] `cytoscape_create_node` — summary (`{ nodeId }`)
  - [ ] `cytoscape_create_edge` — summary (`{ edgeId }`)
  - [ ] `cytoscape_delete_nodes` — passthrough
  - [ ] `cytoscape_delete_edges` — passthrough
  - [ ] `cytoscape_move_edge` — passthrough

### Graph Traversal Tools (in same file)

  - [ ] `cytoscape_get_node_ids` — passthrough
  - [ ] `cytoscape_get_edge_ids` — passthrough
  - [ ] `cytoscape_get_connected_edges` — passthrough
  - [ ] `cytoscape_get_connected_nodes` — passthrough
  - [ ] `cytoscape_get_outgoers` — passthrough
  - [ ] `cytoscape_get_incomers` — passthrough
  - [ ] `cytoscape_get_successors` — passthrough
  - [ ] `cytoscape_get_predecessors` — passthrough
  - [ ] `cytoscape_get_roots` — passthrough
  - [ ] `cytoscape_get_leaves` — passthrough

### Selection Tools

- [ ] Create `tools/selectionTools.ts`:
  - [ ] `cytoscape_get_selection` — passthrough
  - [ ] `cytoscape_select` — passthrough
  - [ ] `cytoscape_add_to_selection` — passthrough
  - [ ] `cytoscape_remove_from_selection` — passthrough
  - [ ] `cytoscape_toggle_selection` — passthrough

### Tests

- [ ] Unit tests for element CRUD
- [ ] Unit tests for graph traversal tools
- [ ] Unit tests for selection mutations
- [ ] Manual E2E: Scenario 1 (create network + add nodes) partial

### Verification

- [ ] 22 new tools registered (31 cumulative)

---

## Phase 1c: Table Tools (12 tools, incl. TSV I/O)

### Standard Table Tools

- [ ] Create `tools/tableTools.ts`:
  - [ ] `cytoscape_get_value` — passthrough
  - [ ] `cytoscape_get_row` — passthrough
  - [ ] `cytoscape_create_column` — passthrough
  - [ ] `cytoscape_set_value` — passthrough
  - [ ] `cytoscape_set_values` — passthrough
  - [ ] `cytoscape_edit_rows` — passthrough
  - [ ] `cytoscape_delete_column` — passthrough
  - [ ] `cytoscape_rename_column` — passthrough
  - [ ] `cytoscape_apply_value` — passthrough

### TSV I/O Tools

  - [ ] `cytoscape_get_table` — summary (`{ columns, rowCount }`)
  - [ ] `cytoscape_export_table_tsv` — **file** (write TSV to session dir, return `{ filePath, rowCount }`)
  - [ ] `cytoscape_import_table_tsv` — passthrough (`{ rowCount, newColumns }`)
- [ ] Implement temp file write for `export_table_tsv` (reuse session dir from Phase 1e export)

### Tests

- [ ] Unit tests for read/write operations
- [ ] Unit tests for TSV round-trip: export → edit externally → import
- [ ] Manual E2E: Create column, set values, verify with `get_row`
- [ ] Manual E2E: Export node TSV, modify in editor, import back

### Verification

- [ ] 12 new tools registered (43 cumulative)
- [ ] `export_table_tsv` writes valid TSV to session directory
- [ ] `import_table_tsv` auto-creates columns from TSV header

---

## Phase 1d: Visual Style Tools (7 tools)

### Implementation

- [ ] Create `tools/visualStyleTools.ts`:
  - [ ] `cytoscape_set_default_style` — passthrough
  - [ ] `cytoscape_create_discrete_mapping` — passthrough
  - [ ] `cytoscape_create_continuous_mapping` — passthrough
  - [ ] `cytoscape_create_passthrough_mapping` — passthrough
  - [ ] `cytoscape_remove_mapping` — passthrough
  - [ ] `cytoscape_set_visual_bypass` — passthrough
  - [ ] `cytoscape_delete_visual_bypass` — passthrough

### Tests

- [ ] Unit tests for mapping and bypass tools
- [ ] Manual E2E: Scenario 2 (highlight selection via bypass)

### Verification

- [ ] 7 new tools registered (50 cumulative)

---

## Phase 1e: Layout + Viewport + Export (6 tools)

### Implementation

- [ ] Create `tools/layoutTools.ts`:
  - [ ] `cytoscape_apply_layout` — passthrough; pin `fitAfterLayout: false` (ADR-0006)
  - [ ] `cytoscape_get_layouts` — passthrough
- [ ] Create `tools/viewportTools.ts`:
  - [ ] `cytoscape_fit_network` — passthrough
  - [ ] `cytoscape_get_positions` — passthrough
  - [ ] `cytoscape_update_positions` — passthrough
- [ ] Create `tools/exportTools.ts`:
  - [ ] `cytoscape_export_network` — **file** (write CX2 to session dir, return `{ filePath, byteSize }`)

### Temp File Infrastructure

- [ ] Implement session directory creation (`/tmp/cyweb-bridge-<session-uuid>/`)
- [ ] Implement shutdown hook (`process.on('exit', ...)`) for session dir cleanup
- [ ] Implement 200 MB size guard
- [ ] Share session dir path with `export_table_tsv` (Phase 1c)

### Tests

- [ ] Unit tests including temp file write/cleanup
- [ ] Manual E2E: Scenario 1 complete (create + layout + fit)

### Verification

- [ ] 6 new tools registered (56 cumulative)
- [ ] `export_network` writes CX2 to session dir, returns `{ filePath, byteSize }`
- [ ] Session dir cleaned up on process exit

---

## Phase 2: Event Forwarding (1 tool)

_Can proceed in parallel with Phases 1b–1e (only requires Phase 0 + 1a)._

### Implementation

- [ ] Create `tools/eventTools.ts`:
  - [ ] `cytoscape_wait_for_event` — polling tool with `eventType` + `timeoutMs` params
- [ ] Implement `addEventListener` → resolve/reject with timeout
- [ ] Support all 8 `CyWebEvents` types
- [ ] Clean up listener on timeout (`removeEventListener`)

### Tests

- [ ] Unit test: event fires → returns detail
- [ ] Unit test: timeout → returns `{ timeout: true }`
- [ ] Manual E2E: Scenario 3 (react to UI events)

### Verification

- [ ] 1 new tool registered (57 cumulative)
- [ ] `wait_for_event('selection:changed', 5000)` returns selection detail on click

---

## Phase 3: MF Plugin Panel

_Can proceed in parallel with Phase 2 (only requires Phase 0)._

### Implementation

- [ ] `BridgePanel.tsx`: subscribe to `claude:connected`, `claude:disconnected`, `claude:command`, `claude:result`, `claude:error`
- [ ] `CommandLog.tsx`: timestamped, scrollable log component
- [ ] Connection status indicator (● Connected / ○ Disconnected)
- [ ] Tab-based filtering (Commands / Events)
- [ ] 10 KB truncation rule for large payloads in log display

### Tests

- [ ] Render tests: verify event handlers update log entries
- [ ] Manual E2E: Watch panel while Claude operates

### Verification

- [ ] Panel shows live command/result log
- [ ] Large payloads are truncated in display

---

## Phase 4: Integration & Polish

### End-to-End Scenarios

- [ ] Scenario 1: Create network + layout + fit
- [ ] Scenario 2: Highlight selection via bypass
- [ ] Scenario 3: React to UI events (wait_for_event)
- [ ] Scenario 4: Louvain clustering via TSV (TSV variant)
- [ ] Scenario 5: Network topology analysis (Graph Traversal)
- [ ] Scenario 6: NetworkX statistics via TSV round-trip

### Documentation

- [ ] Claude Code config documentation (`.claude/settings.json` MCP server entry)
- [ ] App README (`claude-bridge/README.md` — setup, usage, dev instructions)
- [ ] Update root `CLAUDE.md` and host `apps.local.json`
- [ ] Verify post-implementation checklist items from [README.md](README.md#post-implementation-checklist)

### Startup Sequence Verification

- [ ] Step 1: Chrome with `--remote-debugging-port=9222`
- [ ] Step 2: Host app running on localhost:5500
- [ ] Step 3: MCP server connects via CDP
- [ ] Step 4: Panel shows "Connected"

---

## Summary

| Phase | Tools | Cumulative | Status |
|-------|-------|------------|--------|
| 0     | 0     | 0          | [ ]    |
| 1a    | 9     | 9          | [ ]    |
| 1b    | 22    | 31         | [ ]    |
| 1c    | 12    | 43         | [ ]    |
| 1d    | 7     | 50         | [ ]    |
| 1e    | 6     | 56         | [ ]    |
| 2     | 1     | 57         | [ ]    |
| 3     | —     | —          | [ ]    |
| 4     | —     | —          | [ ]    |
