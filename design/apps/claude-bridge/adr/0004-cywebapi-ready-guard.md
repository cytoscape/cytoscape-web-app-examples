# 0004: Guard Tool Registration with cywebapi:ready

## Status

Proposed

## Context

The MCP server may attach to Chrome before the Cytoscape Web host has finished
hydration. During hydration, Zustand stores are initialised, IndexedDB is
opened, and `window.CyWebApi` is assigned. Calling API methods before this
sequence completes would produce runtime errors or undefined behaviour.

A synchronisation mechanism is needed to ensure the MCP server does not call
tools until the host is fully operational.

## Decision

On attach, the MCP server waits for the `cywebapi:ready` custom event
dispatched by the host on `window` after hydration completes:

```typescript
await page.evaluate(
  () =>
    new Promise<void>((resolve) => {
      if (window.CyWebApi) return resolve()
      window.addEventListener('cywebapi:ready', () => resolve(), { once: true })
    }),
)
```

If `window.CyWebApi` already exists (the event has already fired), the promise
resolves immediately. Otherwise it waits until the event fires.

## Rationale

### Polling `window.CyWebApi` existence (rejected)

A `setInterval` / retry loop would work but introduces arbitrary timing. The
event-based approach is deterministic — it resolves exactly when the host is
ready, not on some polling cadence.

### No guard (rejected)

Relying on "the host is probably ready by now" is fragile. Network latency,
large IndexedDB datasets, or slow machines can delay hydration. A guard
removes timing assumptions entirely.

## Consequences

- The MCP server never races with store initialisation
- Tools become available only after the host API is fully operational
- The startup sequence has a well-defined synchronisation point between
  the host and the MCP server
- If the host never fires `cywebapi:ready` (e.g., a crash), the MCP server
  blocks indefinitely — a timeout with a clear error message should be added
  during implementation
