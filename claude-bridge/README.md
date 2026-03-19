# claude-bridge — Cytoscape Web MCP Server

An MCP (Model Context Protocol) server that connects Claude to a running
Cytoscape Web instance via Chrome DevTools Protocol (CDP). This enables
Claude to read and manipulate networks, tables, visual styles, and more
through natural language.

## Architecture

```
Claude Code ←→ MCP (stdio) ←→ mcp-server ←→ CDP (WebSocket) ←→ Chrome ←→ Cytoscape Web
```

- **MF Plugin** (`claude-bridge/src/`): A Cytoscape Web app that shows
  connection status in the right panel.
- **MCP Server** (`claude-bridge/mcp-server/`): A Node.js process that
  exposes 57 tools to Claude via MCP, executing them against the browser
  through CDP `page.evaluate()`.

## Quick Start

### 1. Start Cytoscape Web

```bash
cd cytoscape-web
npm run dev          # → http://localhost:5500
```

### 2. Start Chrome with remote debugging

#### macOS / Linux (native)

```bash
google-chrome --remote-debugging-port=9222
```

Then open `http://localhost:5500` in the launched Chrome window.

#### WSL2 on Windows

WSL2 requires extra setup because Chrome runs on the Windows host while
the MCP server runs inside the WSL2 VM.

**Step 1 — Launch Chrome** (PowerShell):

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --remote-debugging-address=0.0.0.0 `
  --remote-allow-origins=* `
  --user-data-dir="$env:TEMP\chrome-debug"
```

> `--remote-debugging-address=0.0.0.0` binds to all interfaces.
> `--remote-allow-origins=*` allows non-localhost CDP connections.

**Step 2 — Port proxy** (admin PowerShell, one-time):

```powershell
netsh interface portproxy add v4tov4 `
  listenport=9222 listenaddress=0.0.0.0 `
  connectport=9222 connectaddress=127.0.0.1
```

**Step 3 — Firewall rule** (admin PowerShell, one-time):

```powershell
New-NetFirewallRule -DisplayName "Chrome CDP WSL" `
  -Direction Inbound -LocalPort 9222 -Protocol TCP `
  -Action Allow -Profile Any
```

**Step 4 — Find the gateway IP** (WSL2):

```bash
ip route show default | awk '{print $3}'
# → e.g. 172.20.112.1
```

**Step 5 — Verify** (WSL2):

```bash
curl -s http://172.20.112.1:9222/json/version | head -3
```

You should see a JSON response with `"Browser": "Chrome/..."`.

Open `http://localhost:5500` in the launched Chrome window.

### 3. Build and run the MCP server

```bash
cd claude-bridge/mcp-server
npm install
npm run build
node dist/server.js                                     # native Linux/macOS
node dist/server.js --cdp-url http://172.20.112.1:9222  # WSL2
```

You should see:

```
[claude-bridge] Connected to Cytoscape Web via CDP
[claude-bridge] MCP server running on stdio
```

### 4. Register as an MCP server in Claude Code

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "cytoscape": {
      "command": "node",
      "args": [
        "/path/to/claude-bridge/mcp-server/dist/server.js",
        "--cdp-url", "http://172.20.112.1:9222"
      ]
    }
  }
}
```

> Omit `--cdp-url` on native Linux/macOS (defaults to `http://localhost:9222`).

## Available Tools (57)

| Category | Count | Tools |
|----------|-------|-------|
| Workspace | 6 | get_workspace, get_networks, get_network_summary, get_current_network, switch_network, set_workspace_name |
| Network | 3 | create_network_from_edges, create_network_from_cx2, delete_network |
| Element CRUD | 7 | get_node, get_edge, create_node, create_edge, delete_nodes, delete_edges, move_edge |
| Graph Traversal | 10 | get_node_ids, get_edge_ids, get_connected_edges, get_connected_nodes, get_outgoers, get_incomers, get_successors, get_predecessors, get_roots, get_leaves |
| Selection | 5 | get_selection, select, add_to_selection, remove_from_selection, toggle_selection |
| Table | 12 | get_table, get_value, get_row, create_column, set_value, set_values, edit_rows, delete_column, rename_column, apply_value, export_table_tsv, import_table_tsv |
| Visual Style | 7 | set_default_style, create_discrete_mapping, create_continuous_mapping, create_passthrough_mapping, remove_mapping, set_visual_bypass, delete_visual_bypass |
| Layout | 2 | apply_layout, get_layouts |
| Viewport | 3 | fit_network, get_positions, update_positions |
| Export | 1 | export_network |
| Event | 1 | wait_for_event |

All tools are prefixed with `cytoscape_` (e.g., `cytoscape_get_workspace`).

## Design Documents

- [Design Overview](../design/apps/claude-bridge/README.md)
- [Implementation Plan](../design/apps/claude-bridge/IMPLEMENTATION_PLAN.md)
- [MCP Tool Signatures](../design/apps/claude-bridge/MCP_TOOLS.md)
- [Scenarios](../design/apps/claude-bridge/SCENARIOS.md)
- [ADRs](../design/apps/claude-bridge/adr/)
