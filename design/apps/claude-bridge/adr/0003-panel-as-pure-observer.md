# 0003: Panel as Pure Observer via claude:\* Custom Window Events

## Status

Proposed

## Context

The MF Plugin panel displays a live command log showing what Claude sends to
Cytoscape Web and what results come back. Two architectural options exist for
how the panel receives this information:

1. **Panel in the command path:** MCP → Panel → `CyWebApi` → Panel → MCP.
   The panel relays commands and results.
2. **Panel as observer:** MCP → `CyWebApi` (direct via CDP). The dispatcher
   broadcasts `claude:*` custom events on `window` as side-effects for the
   panel to observe.

A related sub-decision is which event mechanism to use for panel
communication.

## Decision

### Panel is a pure observer

The panel has no role in the command execution path. All MCP → `CyWebApi`
communication happens via CDP `page.evaluate()` (see
[ADR-0001](0001-cdp-page-evaluate-as-transport.md)). The panel subscribes to
`window` events and renders a read-only log.

### Use `claude:*` custom events on `window`

The `callApi()` dispatcher emits three custom events on `window`:

| Event            | Payload                                    | When                  |
| ---------------- | ------------------------------------------ | --------------------- |
| `claude:command` | `{ domain, method, args }`                 | Before API call       |
| `claude:result`  | `{ domain, method, data }` (shaped output) | After successful call |
| `claude:error`   | `{ domain, method, code, message, ...}`    | After failed call     |

These events are **distinct** from the host's `CyWebEvents` system. They are
emitted only by the MCP server's dispatcher and consumed only by the panel.

## Rationale

### Panel in the command path (rejected)

Routing commands through the panel would create a hard dependency: removing or
disabling the panel would break Claude's ability to control Cytoscape Web.
The panel is a debugging and demonstration aid, not load-bearing
infrastructure. Coupling it to the command path violates this principle.

### Using CyWebEvents / EventBus (rejected)

`CyWebEvents` represent host state changes (`selection:changed`,
`data:changed`, `style:changed`). Mixing bridge-internal bookkeeping events
into the host event bus would:

- Pollute the `CyWebEvents` namespace with non-host concerns
- Confuse consumers that subscribe to all events
- Create a dependency on the host event bus for bridge-internal communication

A separate `claude:*` namespace keeps bridge events cleanly isolated.

## Consequences

- The panel can be added, removed, or disabled without affecting Claude's
  ability to control Cytoscape Web
- No state synchronisation is needed between the panel and the MCP server
- The `claude:*` event namespace is reserved for bridge-internal use
- The panel receives shaped output (post-shaping), which may be truncated for
  large payloads (see `CommandLog` truncation rule in the design document)
