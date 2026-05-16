# Resource Registration Patterns

This guide covers the three ways to register UI resources (panels, menu items)
and context menu items in a Cytoscape Web app.

---

## Decision Tree

```
What are you registering?
├── Panel or Menu Item
│   ├── Static (always shown) → Declarative `resources` on CyApp
│   └── Dynamic (conditional) → `apis.resource.registerPanel()` in mount()
└── Context Menu Item → `apis.contextMenu.addContextMenuItem()` in mount()
```

---

## 1. Declarative Registration (resources[])

**Best for:** Panels and menu items that are always present.

Declare resources directly on your `CyApp` object. The host registers them
automatically when your app loads — no `mount()` needed.

```typescript
import { lazy } from 'react'
import type { CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const MyApp: CyAppWithLifecycle = {
  id: 'myApp',
  name: 'My App',

  resources: [
    {
      slot: 'right-panel',       // Where the host renders this
      id: 'MainPanel',           // Unique within this app + slot
      title: 'My App',           // Tab label
      component: lazy(() => import('./components/MainPanel')),
      order: 10,                 // Lower = further left (optional)
      requires: {
        network: true,           // Hide tab when no network is loaded
      },
    },
    {
      slot: 'apps-menu',
      id: 'ExportAction',
      title: 'Export via My App',
      component: lazy(() => import('./components/ExportMenuItem')),
      closeOnAction: true,       // Auto-close the dropdown after click
    },
  ],
}
```

### ResourceDeclaration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slot` | `'right-panel' \| 'apps-menu'` | Yes | Host rendering slot |
| `id` | `string` | Yes | Unique ID within `(appId, slot)` |
| `component` | `React.ComponentType<any>` | Yes | Lazy-loaded component |
| `title` | `string` | No | Display label (defaults to `id`) |
| `order` | `number` | No | Sort order (ascending, `undefined` = last) |
| `group` | `string` | No | Grouping key (future use) |
| `requires.network` | `boolean` | No | Hide when no network is loaded |
| `requires.selection` | `boolean` | No | Hide when nothing is selected |
| `closeOnAction` | `boolean` | No | Auto-close Apps dropdown (menu items only) |
| `errorFallback` | `React.ComponentType` | No | Custom error boundary fallback |

### Host Props

The host passes props to your component depending on the slot:

**Panel components** receive `PanelHostProps`:

```typescript
interface PanelHostProps {
  // Currently empty — reserved for future host-injected props
}
```

**Menu item components** receive `MenuItemHostProps`:

```typescript
interface MenuItemHostProps {
  /** Call this to close the Apps dropdown. */
  handleClose: () => void
}
```

> When `closeOnAction: true`, the host wraps your component and calls
> `handleClose()` for you. You do not need to call it manually.

---

## 2. Imperative Registration (mount())

**Best for:** Resources that depend on runtime conditions or APIs.

Use `apis.resource.registerPanel()` / `registerMenuItem()` inside `mount()`:

```typescript
mount(context: AppContext) {
  const { apis } = context

  // Register a panel only if the host supports the slot
  if (apis.resource.getSupportedSlots().includes('right-panel')) {
    apis.resource.registerPanel({
      id: 'ConditionalPanel',
      title: 'Conditional',
      component: lazy(() => import('./components/ConditionalPanel')),
      requires: { network: true },
    })
  }
}
```

### Upsert Semantics

Re-registering with the same `id` replaces the resource in place (no flicker,
tab selection preserved):

```typescript
// First call: registers the panel
apis.resource.registerPanel({ id: 'Panel', title: 'V1', component: PanelV1 })

// Second call: replaces title and component, keeps same slot position
apis.resource.registerPanel({ id: 'Panel', title: 'V2', component: PanelV2 })
```

### Batch Registration

Register multiple resources in a single call. Partial failures are logged
but do not block other entries:

```typescript
const result = apis.resource.registerAll([
  { slot: 'right-panel', id: 'Panel1', component: Panel1 },
  { slot: 'apps-menu', id: 'Menu1', component: Menu1 },
])

if (result.success && result.data.errors.length > 0) {
  console.warn('Some registrations failed:', result.data.errors)
}
```

### Unregistration

```typescript
apis.resource.unregisterPanel('ConditionalPanel')
apis.resource.unregisterMenuItem('SomeMenu')
apis.resource.unregisterAll()  // remove all resources for this app
```

### Introspection

```typescript
// List all resources registered by this app
const resources = apis.resource.getRegisteredResources()
// → [{ id, slot, title, resourceId, order }, ...]

// Check why a specific resource is visible or hidden
const vis = apis.resource.getResourceVisibility('MainPanel')
// → { registered, visible, reason? }
```

---

## 3. Context Menu Items (mount() only)

Context menu items are registered imperatively because their handlers
typically need access to `apis`.

```typescript
mount(context: AppContext) {
  const { apis } = context

  apis.contextMenu.addContextMenuItem({
    label: 'Inspect Node',
    targetTypes: ['node'],         // 'node' | 'edge' | 'canvas'
    handler: (ctx) => {
      // ctx.type — 'node', 'edge', or 'canvas'
      // ctx.id — element ID (undefined for canvas)
      // ctx.networkId — current network
      const result = apis.element.getNode(ctx.networkId, ctx.id!)
      if (result.success) {
        console.info('Node:', result.data)
      }
    },
  })
}
```

### Auto-Cleanup

Items registered via `context.apis.contextMenu` (the per-app factory) are
**automatically removed** when your app is disabled. You do not need to
store item IDs or remove them in `unmount()`.

### Interactive Registration (inside components)

You can also register context menu items from React components using
`useAppContext()`:

```typescript
import { useAppContext } from 'cyweb/AppIdContext'

function MyComponent() {
  const ctx = useAppContext()
  const [itemId, setItemId] = useState<string | null>(null)

  const addItem = () => {
    if (!ctx) return
    const result = ctx.apis.contextMenu.addContextMenuItem({
      label: 'Dynamic Item',
      targetTypes: ['node', 'edge'],
      handler: (menuCtx) => { /* ... */ },
    })
    if (result.success) {
      setItemId(result.data.itemId)
    }
  }

  const removeItem = () => {
    if (ctx && itemId) {
      ctx.apis.contextMenu.removeContextMenuItem(itemId)
      setItemId(null)
    }
  }

  // Clean up on unmount (optional — host auto-cleans on app disable)
  useEffect(() => {
    return () => {
      if (ctx && itemId) {
        ctx.apis.contextMenu.removeContextMenuItem(itemId)
      }
    }
  }, [ctx, itemId])
}
```

---

## Combining Declarative and Imperative

An app can use both patterns. Declarative resources are registered first;
`mount()` can register additional resources or upsert over declarative ones:

```typescript
export const MyApp: CyAppWithLifecycle = {
  id: 'myApp',
  name: 'My App',

  // Static UI — always present
  resources: [
    { slot: 'right-panel', id: 'MainPanel', title: 'Main', component: MainPanel },
  ],

  // Dynamic additions
  mount(context: AppContext) {
    // Add context menu items (need apis)
    context.apis.contextMenu.addContextMenuItem({ ... })

    // Conditionally register a second panel
    if (someCondition) {
      context.apis.resource.registerPanel({
        id: 'OptionalPanel',
        title: 'Extra',
        component: OptionalPanel,
      })
    }

    // Upsert: update the declarative panel's title at runtime
    context.apis.resource.registerPanel({
      id: 'MainPanel',        // same id as declarative
      title: 'Main (Updated)',
      component: MainPanel,
    })
  },
}
```

---

## Summary

| Pattern | Use For | Cleanup |
|---------|---------|---------|
| `resources[]` | Static panels and menu items | Automatic |
| `apis.resource.*` in `mount()` | Dynamic/conditional panels and menu items | Automatic |
| `apis.contextMenu.*` in `mount()` | Context menu items | Automatic |
| `apis.contextMenu.*` in components | Interactive context menu items | Manual on component unmount; automatic on app disable |

---

## Next Steps

- [Getting Started](./getting-started.md) — Scaffold and run a new app
- [Architecture Overview](./architecture-overview.md) — Module Federation, type system, API layers
- [App Lifecycle & Cleanup](./lifecycle-and-cleanup.md) — mount/unmount, event listeners, cleanup
- [Troubleshooting & FAQ](./troubleshooting.md) — Common issues and solutions
