# 0001: Use CDP page.evaluate() as the MCP-to-Browser Transport

## Status

Proposed

## Context

The MCP server (a Node.js process) needs to invoke `window.CyWebApi` methods
inside the browser page running Cytoscape Web. The transport mechanism must:

- Work identically for `http://localhost` during development and HTTPS origins
  in production
- Have no dependency on the MF Plugin panel (the panel is a display aid, not
  infrastructure)
- Add minimal latency per round-trip

Two primary candidates were evaluated:

1. **CDP `page.evaluate()`** — execute JavaScript directly in the page's V8
   context via Chrome DevTools Protocol (Playwright)
2. **WebSocket relay** — embed a WebSocket server in the MF Plugin panel and
   route commands through it

## Decision

Use CDP `page.evaluate()` as the sole transport mechanism.

`page.evaluate()` runs inside the page's JS context. Because the code is
injected at the V8 level, it bypasses the browser's same-origin policy and
Mixed Content restrictions. This makes the architecture work identically for
`localhost` and any public HTTPS origin without additional configuration.

The shared `callApi()` dispatcher batches three steps into a single
`page.evaluate()` call:

1. Dispatch `claude:command` custom event (for the panel)
2. Call `window.CyWebApi.<domain>.<method>(...args)`
3. Dispatch `claude:result` or `claude:error` custom event (for the panel)

## Rationale

### WebSocket relay (rejected)

Adding a WebSocket server to the MF Plugin panel would require:

- A server-side component in the panel, complicating the pure-frontend MF
  architecture
- CORS / Mixed Content handling for HTTPS → WS connections
- Additional authentication and authorization for the WebSocket endpoint
- A persistent bidirectional channel that must be kept alive and reconnected
  on failures

These complications are unnecessary when CDP provides direct, secure access to
the page context with zero additional infrastructure.

### postMessage relay (rejected)

Using `window.postMessage` between a content script and the page would require
a browser extension to inject the script. This adds a deployment dependency
(extension install) and a same-origin trust boundary that CDP avoids entirely.

## Consequences

- The MCP server requires a Chrome instance launched with
  `--remote-debugging-port`
- Communication is limited to local CDP connections — remote browser control
  is explicitly out of scope (see Security Model)
- Playwright provides the CDP client implementation, keeping the codebase
  dependency-light
- All browser interaction flows through a single `page.evaluate()` dispatcher,
  making the command path auditable
