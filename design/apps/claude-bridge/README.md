# claude-bridge — Design Document

## Overview

Advanced example demonstrating **CLI-to-browser control** of Cytoscape Web via
[Claude Code](https://www.anthropic.com/claude-code). An AI agent sends natural-language
instructions that are executed against `window.CyWebApi` in real time. A Module
Federation panel displays a live log of every command and event, making CLI-driven
operations visible inside the application UI.

| Property        | Value                                   |
| --------------- | --------------------------------------- |
| **Status**      | **Proposal — not yet implemented**      |
| Federation name | `claudeBridge`                          |
| Dev port        | 6000                                    |
| App config file | `claude-bridge/src/ClaudeBridgeApp.tsx` |
| Host API phase  | Phase 1 (all domains) + Event Bus       |

> **Reading guide:** This document is a design proposal. Code snippets, file
> layouts, and configuration examples describe the _planned_ structure and are
> not yet implemented. Interaction scenarios are illustrative and may evolve
> during implementation.

---

## Architecture

### Two-Component Design

```
Claude Code CLI
  │  stdin/stdout (MCP protocol)
  ▼
MCP Server (Node.js + Playwright)
  │  CDP — page.evaluate()
  ▼
┌─ Browser ──────────────────────────────────────────────────────┐
│                                                                │
│  window.CyWebApi.xxx(...)            ← execute operation       │
│  window.dispatchEvent(               ← notify panel            │
│    new CustomEvent('claude:command', { detail })               │
│  )                                                             │
│                                          ┌───────────────────┐ │
│  window.addEventListener(                │ BridgePanel       │ │
│    'claude:command', handler)  ──────────│ (MF Plugin)       │ │
│  window.addEventListener(                │                   │ │
│    'selection:changed', handler) ────────│ ● Connected       │ │
│                                          │ ← createNode      │ │
│                                          │   → success       │ │
│                                          │ → sel:changed     │ │
│                                          └───────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

The two components share a single communication channel: the browser `window`.
`page.evaluate()` calls from the MCP Server execute inside the page's JavaScript
context, where they can both call `window.CyWebApi` and dispatch custom events that
the MF Plugin panel is already listening to. No relay server, no WebSocket, no
Mixed Content restrictions.

### Why Not a WebSocket Relay?

The original relay design (MF Plugin ↔ ws://localhost:7890 ↔ MCP Server) breaks
when Cytoscape Web is served from a public HTTPS origin:

- **Mixed Content blocking** — HTTPS page cannot open `ws://localhost:*`
- **Private Network Access (Chrome 94+)** — public-to-loopback WebSocket requires
  a preflight that a plain Node.js server cannot satisfy

CDP operates outside the browser's same-origin/mixed-content security model entirely,
so it works identically whether Cytoscape Web runs on `localhost:5500` or
`https://web.cytoscape.org`.

---

## Component 1: MF Plugin Panel

The panel's **sole responsibility is observation**. It does not execute API calls.
It listens for `claude:*` custom events dispatched by the MCP Server and for
`CyWebEvents` dispatched by the host's Event Bus.

### UI

```
┌────────────────────────────────────────────┐
│  Claude Code Bridge                        │
│  ● Connected via CDP                       │
├────────────────────────────────────────────┤
│  Commands                Events            │
│  ───────────────────────────────────────   │
│  ← element.createNode                      │
│    label="A"  pos=(100,200)                │
│    → {success:true, nodeId:"n-1"}          │
│  ← layout.runLayout                        │
│    algorithm="circle"                      │
│    → {success:true}                        │
│  ───────────────────────────────────────   │
│  → selection:changed                       │
│    selectedNodes: ["n-1", "n-2"]           │
└────────────────────────────────────────────┘
```

### Custom Events (dispatched by MCP Server via CDP)

| Event type            | When                                    | Detail shape                                               |
| --------------------- | --------------------------------------- | ---------------------------------------------------------- |
| `claude:connected`    | MCP Server attaches to the page         | `{}`                                                       |
| `claude:disconnected` | MCP Server detaches                     | `{}`                                                       |
| `claude:command`      | Before calling `window.CyWebApi`        | `{ id, method, params }`                                   |
| `claude:result`       | After the API call returns successfully | `{ id, method, result }`                                   |
| `claude:error`        | API call or CDP transport fails         | `{ id, method, error: { code, message, originalError? } }` |

**Error codes in `claude:error`:**

| `code`             | Meaning                                                    |
| ------------------ | ---------------------------------------------------------- |
| `METHOD_NOT_FOUND` | `window.CyWebApi[domain]` or `[fn]` does not exist         |
| `API_ERROR`        | The host API returned `ApiResult.success === false`        |
| `TRANSPORT_ERROR`  | `page.evaluate()` rejected (page closed, CDP disconnected) |
| `SHAPING_ERROR`    | Post-dispatch result shaping failed (e.g. temp file write) |

> **Bridge vs. host error types:** The `claude:error` detail always conforms to
> `BridgeError` (see [Bridge-specific types](#bridge-specific-types) below), NOT
> to the host's `ApiError`. When `code === 'API_ERROR'`, the original host
> `ApiFailure` is available in `originalError`.

The MF Plugin does not declare any `cyweb/*` federated module imports. It accesses
`window.CyWebApi` only to read current state (e.g., get the current network ID for
display), and subscribes to events via `window.addEventListener`.

### Source Files

```
claude-bridge/src/
├── index.ts                    Entry point — exports CyApp config
├── ClaudeBridgeApp.tsx         CyApp definition
├── remotes.d.ts                cyweb/* type declarations (minimal)
└── components/
    ├── BridgePanel.tsx         Panel root; manages event subscriptions
    └── CommandLog.tsx          Scrollable, timestamped command/event list
```

> **Large-result truncation:** `claude:result` carries pre-shaping host data
> (see [Custom Events](#custom-events-dispatched-by-mcp-server-via-cdp)).
> For File/Summary-shaped tools the payload can be very large (e.g. full CX2).
> `CommandLog` applies a **client-side truncation rule**: if `result` serialised
> exceeds **10 KB**, the log entry stores a preview
> `{ kind: "truncated", byteSize: <n>, preview: <first 200 chars> }` instead
> of the raw object. This keeps panel memory bounded without changing the
> event contract.

---

## Component 2: MCP Server

### Role

- Attaches to Chrome via CDP using Playwright
- Exposes each `window.CyWebApi` operation as an MCP tool
- Before and after each `window.CyWebApi` call, dispatches `claude:command` /
  `claude:result` events on `window` so the panel can display them
- Forwards selected `CyWebEvents` back to Claude as tool results (via the
  `cytoscape_wait_for_event` polling tool)

### Attaching to Chrome

Two supported modes:

**Mode A — Attach to an existing Chrome instance**

The user launches Chrome with remote debugging enabled:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --remote-allow-origins=http://localhost:9222 \
  https://web.cytoscape.org

# Linux
google-chrome \
  --remote-debugging-port=9222 \
  --remote-allow-origins=http://localhost:9222 \
  https://web.cytoscape.org

# Windows (PowerShell) — also used when MCP Server runs inside WSL2
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --remote-allow-origins=http://localhost:9222 `
  https://web.cytoscape.org
```

> **WSL2 note:** Chrome runs on the Windows host, not inside WSL2. The MCP
> Server runs inside WSL2 and connects to the Windows-side CDP endpoint.
>
> - **Mirrored networking** (Windows 11 default): `localhost:9222` works as-is.
> - **NAT networking**: Set `CDP_URL` to the Windows host IP:
>   ```bash
>   export CDP_URL="http://$(cat /etc/resolv.conf | grep nameserver | awk '{print $2}'):9222"
>   ```
> - Ensure Windows Firewall allows inbound connections on port 9222 from the
>   WSL2 subnet if NAT mode is in use.

The MCP Server finds the tab running Cytoscape Web using a strict
origin-based check (see [Security Model](#security-model) below):

```typescript
// Allowed origins — configurable via environment variable
const ALLOWED_ORIGINS = new Set(
  (process.env.CYWEB_ALLOWED_ORIGINS ?? 'http://localhost:5500')
    .split(',')
    .map((o) => o.trim()),
)

function isCyWebPage(pageUrl: string): boolean {
  try {
    const { origin } = new URL(pageUrl)
    return ALLOWED_ORIGINS.has(origin)
  } catch {
    return false
  }
}

async function findCyWebPage(browser: Browser): Promise<Page> {
  const candidates = browser
    .contexts()[0]
    .pages()
    .filter((p) => isCyWebPage(p.url()))

  for (const page of candidates) {
    const hasCyWebApi = await page.evaluate(
      () =>
        typeof (window as any).CyWebApi === 'object' &&
        (window as any).CyWebApi !== null,
    )
    if (hasCyWebApi) return page
  }

  throw new Error(
    'No Cytoscape Web page found. Checked origins: ' +
      [...ALLOWED_ORIGINS].join(', '),
  )
}

const browser = await chromium.connectOverCDP(
  process.env.CDP_URL ?? 'http://localhost:9222',
)
const page = await findCyWebPage(browser)
```

**Mode B — MCP Server launches Chrome**

```typescript
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage()
await page.goto(process.env.CYWEB_URL ?? 'http://localhost:5500')
```

Mode A is preferred for the demo because it lets the user interact with the same
browser tab they see Claude operating in.

### Bridge-Specific Types

The bridge defines its own result/error types. These are **distinct from** the
host's `ApiResult<T>` / `ApiError` / `ApiErrorCode`. The host types model
domain-specific failures (`NETWORK_NOT_FOUND`, `INVALID_INPUT`, etc.); the
bridge types model transport and dispatch failures.

```typescript
/** Error codes specific to the bridge dispatcher. */
type BridgeErrorCode =
  | 'METHOD_NOT_FOUND'
  | 'API_ERROR'
  | 'TRANSPORT_ERROR'
  | 'SHAPING_ERROR'

/** Bridge-level error. Always has { code, message }.
 *  When code === 'API_ERROR', originalError carries the host ApiFailure.
 *  When code === 'SHAPING_ERROR', originalError is absent. */
interface BridgeError {
  code: BridgeErrorCode
  message: string
  /** Present only when code === 'API_ERROR'. Contains the host ApiFailure. */
  originalError?: { code: string; message: string }
}

interface BridgeSuccess<T> {
  success: true
  data: T
}

interface BridgeFailure {
  success: false
  error: BridgeError
}

type BridgeResult<T> = BridgeSuccess<T> | BridgeFailure
```

**Relationship to host types:**

| Bridge code        | When                                          | `originalError`                                          |
| ------------------ | --------------------------------------------- | -------------------------------------------------------- |
| `METHOD_NOT_FOUND` | `window.CyWebApi[domain][fn]` is nil          | _(absent)_                                               |
| `API_ERROR`        | Host returns `{ success: false, ... }`        | `{ code: host.error.code, message: host.error.message }` |
| `TRANSPORT_ERROR`  | `page.evaluate()` rejects (CDP lost)          | _(absent)_                                               |
| `SHAPING_ERROR`    | Post-dispatch shaping fails (e.g. file write) | _(absent)_                                               |

The `claude:error` event detail always conforms to `{ id, method, error: BridgeError }`.
The `claude:result` event detail carries `{ id, method, result: T }` where `T` is
the **unwrapped host data** (`ApiSuccess.data`), not the raw `ApiResult` envelope.
Note that per-tool MCP shaping (see [MCP Result Shaping](MCP_TOOLS.md#mcp-result-shaping))
happens _after_ this event is dispatched, so the panel sees pre-shaping data
while Claude receives the final shaped output. For most tools (Passthrough) the
two are identical; they diverge only for Summary / File-shaped tools.

> **Post-shaping failure:** If shaping fails after `claude:result` has already
> been dispatched (e.g. `cytoscape_export_network` temp-file write error), the
> tool handler dispatches a **second** event — `claude:error` with
> `code: 'SHAPING_ERROR'` — via an additional `page.evaluate()`, and returns
> `BridgeFailure` to Claude. The panel therefore shows the full timeline:
> `claude:result` (host success) → `claude:error` (shaping failure). This
> makes it clear that the host API itself succeeded but the bridge-side
> post-processing did not.

### Dispatcher Pattern

Every tool handler wraps the `window.CyWebApi` call with before/after event
dispatches. A shared helper handles this in a **single `page.evaluate()` call**
to minimise CDP round-trips (one round-trip per API operation).

The host API uses **positional arguments** (e.g.
`element.createNode(networkId, position, options)`), so the dispatcher accepts
an `args` array and spreads it at the call site:

```typescript
async function callApi(
  page: Page,
  id: number,
  method: string,
  args: unknown[], // positional arguments — spread into the API call
): Promise<BridgeResult<unknown>> {
  try {
    return await page.evaluate(
      async ({ id, method, args }) => {
        const [domain, fn] = method.split('.')
        const api = (window as any).CyWebApi

        // Guard: method must exist
        if (!api?.[domain]?.[fn]) {
          const error = {
            code: 'METHOD_NOT_FOUND',
            message: `${method} not found on CyWebApi`,
          }
          window.dispatchEvent(
            new CustomEvent('claude:error', { detail: { id, method, error } }),
          )
          return { success: false, error }
        }

        // 1. Notify panel: command incoming
        window.dispatchEvent(
          new CustomEvent('claude:command', {
            detail: { id, method, params: args },
          }),
        )

        // 2. Execute the API call (spread positional args; await for async APIs)
        const result = await Promise.resolve(api[domain][fn](...args))

        // 3. Check host result and normalise to BridgeResult
        if (result?.success === false) {
          const error = {
            code: 'API_ERROR',
            message: result.error?.message ?? 'Host API call failed',
            originalError: result.error
              ? { code: result.error.code, message: result.error.message }
              : undefined,
          }
          window.dispatchEvent(
            new CustomEvent('claude:error', { detail: { id, method, error } }),
          )
          return { success: false, error }
        }

        // 4. Notify panel: success (unwrap host ApiSuccess envelope)
        const payload = result?.success === true ? result.data : result
        window.dispatchEvent(
          new CustomEvent('claude:result', {
            detail: { id, method, result: payload },
          }),
        )

        return { success: true, data: payload }
      },
      { id, method, args },
    )
  } catch (e) {
    // CDP / transport failure — page.evaluate() itself rejected
    const error = {
      code: 'TRANSPORT_ERROR',
      message: String(e),
    }
    try {
      await page.evaluate(
        ({ id, method, error }) =>
          window.dispatchEvent(
            new CustomEvent('claude:error', { detail: { id, method, error } }),
          ),
        { id, method, error },
      )
    } catch {
      // Page already gone — panel notification is best-effort
    }
    return { success: false, error }
  }
}
```

> **Why a single `evaluate()`?** Each `page.evaluate()` is one CDP round-trip.
> Batching the event dispatches and the API call inside a single `evaluate()`
> keeps the cost at exactly **1 round-trip per tool invocation**, which is what
> the performance tables in the scenarios below assume.
>
> **Error handling:** The outer `try/catch` handles CDP transport failures
> (page closed, CDP disconnected). Inside the `evaluate()`, method-not-found
> and host `ApiFailure` are normalised to `BridgeError` and dispatched as
> `claude:error` events so the panel always shows the terminal state of every
> command.
>
> **Host `ApiResult` unwrapping:** On success the dispatcher checks
> `result.success === true` and extracts `result.data` (the host
> `ApiSuccess.data` field). For void-returning APIs like `fit()` or
> `editRows()`, host `ok()` sets `data: undefined`, and the dispatcher
> passes `undefined` through — the MCP tool handler is then responsible
> for returning `{}` to Claude. This keeps the dispatcher generic while
> letting each tool define its own `outputSchema`.

### MCP Tool List & Result Shaping

Moved to **[MCP_TOOLS.md](MCP_TOOLS.md)** — contains the full 38-tool
catalog (with `window.CyWebApi` call signatures) and the per-tool result
shaping policy.

### Temp File Lifecycle

`cytoscape_export_network` (File-shaped) writes CX2 data to the local
filesystem so that Claude can read it with its own Bash tool. The following
rules govern temp file management:

| Concern               | Policy                                                                        |
| --------------------- | ----------------------------------------------------------------------------- |
| **Session directory** | Each MCP server instance creates a session-scoped directory:                  |
|                       | `$CYWEB_BRIDGE_TMPDIR/cyweb-bridge-<session-uuid>/` (default prefix: `/tmp/`) |
| **Naming**            | UUID-based unique name within the session directory: `export-<uuid>.cx2`      |
| **Overwrite**         | Never overwrite — each invocation produces a new file                         |
| **Cleanup**           | MCP server registers a shutdown hook (`process.on('exit', ...)`) that removes |
|                       | its own session directory. Startup does **not** delete other sessions' dirs.  |
| **Size guard**        | If the CX2 payload exceeds 200 MB, the tool returns `SHAPING_ERROR` instead   |
|                       | of writing. The host's `maxNetworkFileSize` (500 MB) is the upstream cap;     |
|                       | the bridge applies a stricter limit to protect the local filesystem.          |
| **Caller delete**     | Claude may delete individual files after processing. This is optional but     |
|                       | recommended for large exports in long sessions.                               |

> **Multi-session safety:** Because each bridge instance uses its own
> `cyweb-bridge-<session-uuid>/` subdirectory, multiple concurrent sessions
> never interfere with each other's exports. The session UUID is generated
> once at MCP server startup and reused for all exports in that session.

> The `/tmp/` prefix is the default; it can be overridden by setting the
> `CYWEB_BRIDGE_TMPDIR` environment variable.

### Event Forwarding to Claude

The MCP protocol is request-response: Claude calls a tool and receives one
result. There is no persistent server→client push channel. This constrains
how `CyWebEvents` (host Event Bus events) are surfaced to Claude.

**Recommended approach — polling tool:**

```typescript
// MCP tool: cytoscape_wait_for_event
//   eventType: keyof CyWebEvents  (e.g. "selection:changed")
//   timeoutMs: number              (default: 30000)
//
// Returns the first matching event detail, or { timeout: true } on expiry.

server.tool(
  'cytoscape_wait_for_event',
  schema,
  async ({ eventType, timeoutMs }) => {
    return page.evaluate(
      ({ eventType, timeoutMs }) =>
        new Promise((resolve) => {
          const handler = (e: Event) => {
            clearTimeout(timer)
            resolve((e as CustomEvent).detail)
          }
          const timer = setTimeout(() => {
            window.removeEventListener(eventType, handler)
            resolve({ timeout: true })
          }, timeoutMs)
          window.addEventListener(eventType, handler, { once: true })
        }),
      { eventType, timeoutMs },
    )
  },
)
```

**How it works:**

1. Claude calls `cytoscape_wait_for_event('selection:changed', 30000)`
2. The tool blocks inside `page.evaluate()` until the event fires or times out
3. Claude receives the event detail as the tool result
4. To monitor continuously, Claude calls the tool again in a loop

**Properties:**

| Concern              | Handling                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Multiple events      | One `wait_for_event` call = one event. Claude re-calls to get the next                      |
| Backpressure         | Implicit — Claude's call frequency is the throttle                                          |
| Cancellation         | `timeoutMs` expiry calls `removeEventListener`, then returns `{ timeout: true }`            |
| Multiple event types | Claude issues parallel tool calls with different `eventType` values                         |
| Missed events        | Events that fire between polls are not captured; this is acceptable for an interactive demo |

> **Why not `page.exposeFunction`?** `exposeFunction` installs a Node→Browser
> callback, but MCP has no way to push unsolicited messages to Claude between
> tool calls. The polling approach fits MCP's request-response model cleanly.

### Waiting for API Readiness

On attach, the MCP Server waits for `cywebapi:ready` before exposing tools:

```typescript
await page.evaluate(
  () =>
    new Promise<void>((resolve) => {
      if ((window as any).CyWebApi) {
        resolve()
        return
      }
      window.addEventListener('cywebapi:ready', () => resolve(), { once: true })
    }),
)
```

### Source Files

```
claude-bridge/mcp-server/
├── package.json              { deps: @modelcontextprotocol/sdk, playwright }
├── server.ts                 Entry: stdio MCP server, browser attach/wait
├── callApi.ts                Shared dispatcher (dispatches claude:* events)
└── tools/
    ├── workspaceTools.ts
    ├── networkTools.ts
    ├── elementTools.ts
    ├── selectionTools.ts
    ├── tableTools.ts
    ├── layoutTools.ts
    ├── visualStyleTools.ts
    ├── viewportTools.ts
    └── exportTools.ts
```

### Claude Code Configuration (`.claude/settings.json`)

```json
{
  "mcpServers": {
    "cytoscape": {
      "command": "node",
      "args": ["/path/to/claude-bridge/mcp-server/dist/server.js"],
      "env": {
        "CYWEB_URL": "http://localhost:5500",
        "CDP_URL": "http://localhost:9222"
      }
    }
  }
}
```

---

## Interaction Scenarios

Scenarios have been moved to **[SCENARIOS.md](SCENARIOS.md)** to keep this
document focused on architecture and contracts.

| Scenario | Summary                                           |
| -------- | ------------------------------------------------- |
| 1        | Create a network, apply layout, fit viewport      |
| 2        | Highlight the current selection via visual bypass |
| 3        | React to UI events with polling                   |
| 4        | External analysis (NetworkX) + data-driven style  |

---

## Startup Sequence

```bash
# Step 1 — start Cytoscape Web host
cd cytoscape-web && npm run dev          # localhost:5500

# Step 2 — launch Chrome with debug port (Mode A)
/path/to/chrome \
  --remote-debugging-port=9222 \
  --remote-allow-origins=http://localhost:9222 \
  http://localhost:5500

# Step 3 — start the MF Plugin dev server (panel UI only)
cd cytoscape-web-app-examples
npm run dev:claude-bridge                # localhost:6000

# Step 4 — start Claude Code (MCP auto-starts the MCP server subprocess)
claude                                   # cytoscape_* tools are now available
```

Connection order:

1. Cytoscape Web initialises → `window.CyWebApi` assigned → `cywebapi:ready` fires
2. MF Plugin panel loads → begins listening for `claude:*` events on `window`
3. Claude Code starts → MCP Server subprocess spawned → attaches via CDP
4. MCP Server waits for `cywebapi:ready` (already fired → resolves immediately)
5. MCP Server dispatches `claude:connected` → panel shows **● Connected**
6. Claude Code can now call all `cytoscape_*` tools

---

## Key Design Decisions

Architecture Decision Records (ADRs) have been moved to **[adr/](adr/)**.

| ADR  | Decision                                                                               |
| ---- | -------------------------------------------------------------------------------------- |
| 0001 | [Use CDP page.evaluate() as transport](adr/0001-cdp-page-evaluate-as-transport.md)     |
| 0002 | [Prefer attach mode over launch mode](adr/0002-attach-mode-over-launch-mode.md)        |
| 0003 | [Panel as pure observer via claude:\* events](adr/0003-panel-as-pure-observer.md)      |
| 0004 | [Guard tool registration with cywebapi:ready](adr/0004-cywebapi-ready-guard.md)        |
| 0005 | [Mapping-first styling, bypass as exception](adr/0005-mapping-first-styling.md)        |
| 0006 | [Explicit-call policy for MCP tools](adr/0006-explicit-call-policy.md)                 |
| 0007 | [Summary shaping for large tool results](adr/0007-summary-shaping-for-tool-results.md) |

---

## Security Model

CDP grants full JavaScript execution rights on the connected page. The security
model must prevent accidental or malicious connection to the wrong page.

### 1. Origin whitelist for tab selection

The MCP Server **must not** use substring matching (e.g. `url.includes('cytoscape')`)
to find the target page. Instead, it parses the full URL and compares the `origin`
against an explicit whitelist configured via the `CYWEB_ALLOWED_ORIGINS` environment
variable (comma-separated). The default is `http://localhost:5500`.

After the origin check passes, the server additionally verifies that
`window.CyWebApi` exists on the candidate page before attaching. See the
`findCyWebPage()` function in [Attaching to Chrome](#attaching-to-chrome).

### 2. CDP endpoint binding

Chrome's `--remote-debugging-port` must bind to `127.0.0.1` only (the default).
Never use `--remote-debugging-address=0.0.0.0`. The `--remote-allow-origins` flag
should restrict connections to the expected local origin:

```bash
--remote-debugging-port=9222 \
--remote-allow-origins=http://localhost:9222
```

### 3. No remote CDP endpoints

The MCP Server is designed for **local-only** CDP connections. Connecting to a
remote CDP endpoint (e.g. over a network) is not supported and not tested.
The `CDP_URL` environment variable defaults to `http://localhost:9222`.

### 4. Scope of CDP access

Once connected, `page.evaluate()` can execute arbitrary JavaScript in the page's
context. The MCP Server limits itself to:

- Calling `window.CyWebApi.*` methods
- Dispatching `claude:*` custom events on `window`
- Reading `window.CyWebApi` existence for readiness checks

No other page state is accessed or modified.

### 5. User responsibility

The user must explicitly opt in by launching Chrome with `--remote-debugging-port`.
This is not enabled by default. The MCP Server will fail with a clear error message
if it cannot connect to the CDP endpoint.

---

## File Map

```
claude-bridge/
├── package.json                  MF Plugin package
│                                 peerDeps: react, react-dom, @mui/material
├── webpack.config.js             Module Federation (port 6000, name: claudeBridge)
├── tsconfig.json
├── mcp-server/
│   ├── package.json              deps: @modelcontextprotocol/sdk, playwright
│   ├── server.ts                 stdio MCP server; browser attach + readiness wait
│   ├── callApi.ts                Dispatcher: page.evaluate + claude:* event dispatch
│   └── tools/
│       ├── workspaceTools.ts
│       ├── networkTools.ts
│       ├── elementTools.ts
│       ├── selectionTools.ts
│       ├── tableTools.ts
│       ├── layoutTools.ts
│       ├── visualStyleTools.ts
│       ├── viewportTools.ts
│       └── exportTools.ts
└── src/
    ├── index.ts
    ├── ClaudeBridgeApp.tsx
    ├── remotes.d.ts
    └── components/
        ├── BridgePanel.tsx       Subscribes to claude:* and CyWebEvents
        └── CommandLog.tsx        Timestamped, scrollable log entries
```

---

## Post-Implementation Checklist

The following items should be verified after initial implementation:

- [ ] **CommandLog truncation under large payloads** — Confirm that the 10 KB
      truncation rule (see [Source Files — MF Plugin](#source-files)) prevents
      UI jank when `claude:result` carries a multi-MB host response (e.g. a
      full CX2 from `exportToCx2`). Test with networks exceeding
      `maxNetworkElementsThreshold` (26 000 elements).
- [ ] **Session directory cleanup on normal and abnormal exit** — Verify that
      the shutdown hook (`process.on('exit', ...)`) removes
      `cyweb-bridge-<session-uuid>/` on graceful shutdown **and** that
      `SIGINT` / `SIGTERM` handlers also trigger cleanup (see
      [Temp File Lifecycle](#temp-file-lifecycle)). Confirm that a crash
      (`kill -9`) leaves orphaned dirs but does **not** affect other sessions.
- [ ] **`claude:result` → `claude:error(SHAPING_ERROR)` panel timeline** —
      Simulate a File-shaping failure (e.g. read-only `/tmp/`) and confirm the
      panel renders the two-event sequence clearly: a success entry followed by
      a `SHAPING_ERROR` entry for the same `id`, so the user sees that the host
      API succeeded but bridge post-processing failed.
