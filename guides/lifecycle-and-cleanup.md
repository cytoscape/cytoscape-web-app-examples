# App Lifecycle & Cleanup

This guide explains the lifecycle of a Cytoscape Web app — from loading
through mount, disable, re-enable, and page unload — and what you need
to clean up at each stage.

---

## Lifecycle Overview

```
  App loads (Module Federation)
        │
        ▼
  Host calls registerApp(cyApp)
        │
        ▼
  Host processes declarative resources[]
  (panels and menu items auto-registered)
        │
        ▼
  Host calls mount(context)
  (context menu items, event listeners, etc.)
        │
        ▼
  App is ACTIVE ◄──────────────────────┐
        │                              │
  User disables app                    │
        │                              │
        ▼                              │
  Host calls cleanupAllForApp(appId)   │
  (auto-removes resources + context    │
   menu items)                         │
        │                              │
        ▼                              │
  Host calls unmount()                 │
  (app cleans up manual listeners)     │
        │                              │
        ▼                              │
  App is INACTIVE                      │
        │                              │
  User re-enables ─────────────────────┘
```

---

## What the Host Cleans Up Automatically

When your app is disabled or the page unloads, the host automatically:

| Resource Type | Cleanup Mechanism |
|---------------|-------------------|
| Panels (right-panel) | `AppResourceStore.removeAllByAppId()` |
| Menu items (apps-menu) | `AppResourceStore.removeAllByAppId()` |
| Context menu items (per-app) | `ContextMenuItemStore.removeAllByAppId()` |

This is handled by the **App Cleanup Registry** — each store registers its
own cleanup function. You do not need to manually unregister resources or
context menu items in `unmount()`.

---

## What You Must Clean Up in unmount()

Only **manual** subscriptions need explicit cleanup:

### DOM Event Listeners

```typescript
let _handler: ((e: Event) => void) | null = null

mount(context: AppContext) {
  _handler = (e: Event) => {
    const { networkId } = (e as CustomEvent).detail
    console.log('Network switched:', networkId)
  }
  window.addEventListener('network:switched', _handler)
}

unmount() {
  if (_handler) {
    window.removeEventListener('network:switched', _handler)
    _handler = null
  }
}
```

> **Important:** Store the function reference. `removeEventListener`
> requires the exact same function that was passed to `addEventListener`.

### Timers and Intervals

```typescript
let _intervalId: ReturnType<typeof setInterval> | null = null

mount(context: AppContext) {
  _intervalId = setInterval(() => { /* polling logic */ }, 5000)
}

unmount() {
  if (_intervalId !== null) {
    clearInterval(_intervalId)
    _intervalId = null
  }
}
```

### WebSocket Connections

```typescript
let _ws: WebSocket | null = null

mount(context: AppContext) {
  _ws = new WebSocket('wss://example.com')
  _ws.onmessage = (e) => { /* handle messages */ }
}

unmount() {
  if (_ws) {
    _ws.close()
    _ws = null
  }
}
```

---

## mount() Best Practices

### Keep mount() Fast

The host warns if `mount()` takes longer than 100ms. Avoid heavy computation
or long network requests inside mount. If you need async initialization,
return a Promise but keep it short:

```typescript
// Good — fast, non-blocking
mount(context: AppContext) {
  context.apis.contextMenu.addContextMenuItem({ ... })
}

// Acceptable — short async
async mount(context: AppContext) {
  const config = await fetchConfig()  // < 100ms
  // ... use config
}

// Bad — blocks app activation
async mount(context: AppContext) {
  const data = await fetchLargeDataset()  // > 100ms
}
```

### mount() Failure

If `mount()` throws, the host:
1. Calls `cleanupAllForApp(appId)` to remove any resources registered before the error
2. Logs the error
3. Marks the app as failed

This ensures no orphaned resources remain from a partially-initialized app.

---

## unmount() Best Practices

### Called for Every Mounted App

Once `mount()` has completed successfully, `unmount()` is guaranteed to be
called — whether the user disables the app or the page unloads (`beforeunload`).
If `mount()` was never called (e.g., declarative-only apps) or if `mount()`
threw an error, `unmount()` is not called.

The host calls `cleanupAllForApp()` **before** calling `unmount()`, so
by the time your `unmount()` runs, resources and context menu items are
already removed.

### No Async Work After unmount()

No async operations should survive past `unmount()`. Cancel pending
requests, close connections, and clear timers.

```typescript
unmount() {
  // Cancel ongoing fetch
  _abortController?.abort()
  _abortController = null

  // Remove DOM listeners
  if (_handler) {
    window.removeEventListener('network:switched', _handler)
    _handler = null
  }

  // Reset module-level state
  _isInitialized = false
}
```

---

## Component-Level Cleanup

Inside React components, use standard `useEffect` cleanup for
component-scoped resources:

```typescript
function MyComponent() {
  const ctx = useAppContext()

  useEffect(() => {
    if (!ctx) return
    const result = ctx.apis.contextMenu.addContextMenuItem({
      label: 'Temp Item',
      handler: (menuCtx) => { /* ... */ },
    })

    return () => {
      // Clean up when component unmounts
      if (result.success) {
        ctx.apis.contextMenu.removeContextMenuItem(result.data.itemId)
      }
    }
  }, [ctx])
}
```

---

## Event Listeners: Component vs App Scope

| Scope | Pattern | Cleanup |
|-------|---------|---------|
| Component | `useCyWebEvent('event', handler)` | Automatic (hook cleanup) |
| App | `window.addEventListener(...)` in mount() | Manual in unmount() |

Use component-scoped listeners when the listener is tied to a specific UI
component. Use app-scoped listeners when you need them to persist across
component mounts/unmounts.

```typescript
// Component scope — automatic cleanup
import { useCyWebEvent } from 'cyweb/EventBus'

function NetworkWatcher() {
  useCyWebEvent('network:switched', (detail) => {
    console.log('Switched to:', detail.networkId)
  })
}

// App scope — manual cleanup in unmount()
mount(context: AppContext) {
  _handler = (e: Event) => { /* ... */ }
  window.addEventListener('network:switched', _handler)
}
```

---

## Re-Enable Behavior

When a user re-enables a previously disabled app:

1. The host calls `processDeclarativeResources()` again — declarative
   `resources[]` are re-registered
2. The host calls `mount(context)` again — imperative registrations
   and event listeners are set up fresh
3. Context menu items from the previous session are gone — they were
   cleaned up on disable

Your app should be **idempotent**: calling `mount()` a second time should
produce the same result as the first time.

---

## Cleanup Summary

| What | Who Cleans Up | When |
|------|---------------|------|
| Declarative resources (panels, menus) | Host (automatic) | App disable / page unload |
| Imperative resources (`registerPanel`) | Host (automatic) | App disable / page unload |
| Per-app context menu items | Host (automatic) | App disable / page unload |
| DOM event listeners | **You** (in `unmount()`) | App disable / page unload |
| Timers / intervals | **You** (in `unmount()`) | App disable / page unload |
| WebSocket connections | **You** (in `unmount()`) | App disable / page unload |
| Component-scoped context menus | **You** (in `useEffect` cleanup) | Component unmount |

---

## Non-React Apps

Apps do **not** need React components. You can build a fully functional app
using only `mount()` and `unmount()` — no `resources` array, no panels, no
menus. This pattern is ideal for headless analytics, browser extensions, or
LLM agent bridges.

See [network-statistics/](../network-statistics/) for a complete example that:

- Listens for `network:switched` and `selection:changed` events
- Computes network topology statistics via the Graph Traversal API
- Outputs results to the browser console

The same lifecycle rules apply: store event handler references at module level
and remove them in `unmount()`.

---

## Next Steps

- [Getting Started](./getting-started.md) — Scaffold and run a new app
- [Architecture Overview](./architecture-overview.md) — Module Federation, type system, API layers
- [Resource Registration Patterns](./registration-patterns.md) — Panels, menus, context menus
- [Troubleshooting & FAQ](./troubleshooting.md) — Common issues and solutions
