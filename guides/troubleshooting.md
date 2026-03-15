# Troubleshooting & FAQ

Common issues and solutions for Cytoscape Web app developers.

---

## Build & Configuration Errors

### "Module not found: Can't resolve 'cyweb/...'"

**Cause:** Missing Module Federation type declarations.

**Fix:** Install the type package:

```bash
npm install --save-dev @cytoscape-web/api-types
```

This provides `cyweb/*` module declarations in `dist/mf-declarations.d.ts`.
Ensure your `tsconfig.json` includes `node_modules/@cytoscape-web/api-types`.

### "Shared module is not available for eager consumption"

**Cause:** Your app's entry point is not wrapped for async loading.

**Fix:** Create an async bootstrap file:

```typescript
// src/index.ts
import('./bootstrap')

// src/bootstrap.ts
import { MyApp } from './MyApp'
export default MyApp
```

Or use the pattern from `project-template` where `src/index.ts` does
`export default MyApp` and webpack handles the async boundary.

### Host dev server shows "Container missing" or blank panel

**Cause:** The `name` in your webpack `ModuleFederationPlugin` does not
match the `name` in `apps.local.json`.

**Fix:** Ensure all three match:

```
webpack.config.js:  name: 'myApp'
apps.local.json:    { "name": "myApp", "url": "..." }
MyApp.ts:           id: 'myApp'
```

---

## Runtime Errors

### "Cannot assign to read only property '_status'"

**Cause:** A `React.lazy()` component was stored in an Immer-managed
Zustand store. Immer freezes the object, preventing React from updating
its internal `_status` property when the lazy component resolves.

**This is a host-side issue, not a plugin issue.** The host's
`AppResourceStore` does not use Immer (by design) to avoid this problem.

If you see this error:
1. Ensure you are using the latest version of the host
2. If you have a custom store that holds React components, do NOT use
   Immer middleware on that store

### "useAppContext() returned null"

**Cause:** Your component is rendering outside of `AppIdProvider`.

**When this happens:**
- Component rendered before the host wraps it in `AppIdProvider`
- Component used in a test without providing the context

**Fix:** Guard against null:

```typescript
const ctx = useAppContext()
if (!ctx) return <div>Loading...</div>
```

### Panel renders but shows error boundary fallback

**Cause:** Your component threw during rendering. The host wraps each
plugin resource in `PluginErrorBoundary`, so one broken component does
not crash the entire panel area.

**Fix:** Check the browser console for the error. The fallback shows
the `appId` and `slot` to help identify which component failed.

To provide a custom fallback:

```typescript
resources: [
  {
    slot: 'right-panel',
    id: 'MainPanel',
    component: MainPanel,
    errorFallback: ({ error, resetErrorBoundary }) => (
      <div>
        <p>Something went wrong: {error.message}</p>
        <button onClick={resetErrorBoundary}>Retry</button>
      </div>
    ),
  },
]
```

### Context menu items not appearing

**Possible causes:**

1. **App is disabled** — Items from disabled apps are removed automatically.
   Re-enable the app in App Settings.

2. **Wrong targetTypes** — If you register with `targetTypes: ['node']`,
   the item only appears when right-clicking a node, not an edge or canvas.

3. **Empty label** — `addContextMenuItem` returns `fail(InvalidInput)` if
   the label is empty. Check the return value.

### Menu item does not close the dropdown

**Fix:** Either set `closeOnAction: true` on the resource declaration,
or call `handleClose()` manually:

```typescript
// Option A: Declarative
{ slot: 'apps-menu', closeOnAction: true, ... }

// Option B: Manual
const MyMenuItem = ({ handleClose }: MenuItemHostProps) => {
  const onClick = () => {
    doSomething()
    handleClose()  // close the dropdown
  }
  return <li onClick={onClick}>Action</li>
}
```

---

## Development Workflow

### How to switch between local and production host

Your webpack config can read an environment variable:

```javascript
const LOCAL_CYWEB = 'cyweb@http://localhost:5500/remoteEntry.js'
const PROD_CYWEB = 'cyweb@https://web.cytoscape.org/remoteEntry.js'

remotes: {
  cyweb: isProduction ? PROD_CYWEB : LOCAL_CYWEB,
},
```

### How to debug API results

All API functions return `ApiResult<T>`. Log the full result to see
error codes and messages:

```typescript
const result = apis.element.getNode(networkId, nodeId)
if (!result.success) {
  console.error('API error:', result.error)
  // { code: 'NODE_NOT_FOUND', message: 'Node xyz not found in network abc' }
}
```

### Hot reload not working for plugin changes

Module Federation remotes are loaded once at startup. After changing
your plugin code:

1. The plugin dev server rebuilds automatically (HMR)
2. **Refresh the host page** in the browser — the host re-fetches
   `remoteEntry.js` on page load

---

## FAQ

### Can I use MUI components in my plugin?

Yes. MUI is a shared singleton provided by the host. Import and use it
normally:

```typescript
import { Button, Typography } from '@mui/material'
```

Do NOT add `@mui/material` to your `dependencies` — it should only be
in `devDependencies` and `shared` in webpack config.

### Can I use other UI libraries (e.g. Chakra UI)?

Yes, but they will be bundled into your plugin (not shared with the host).
This increases your bundle size. MUI is recommended for consistency with
the host UI.

### Can I access the host's Zustand stores directly?

The stores are exposed via `cyweb/NetworkStore`, `cyweb/TableStore`, etc.
However, these are **internal implementation details** and may change
without notice.

**Use the API hooks instead** (`cyweb/ElementApi`, `cyweb/NetworkApi`, etc.)
— they provide a stable, documented contract with `ApiResult<T>` error handling.

### What happens if the host is not running?

Your plugin dev server starts but cannot load shared modules. The browser
will show errors about missing remote containers. Start the host first:

```bash
cd cytoscape-web && npm run dev  # port 5500
```

### Can I publish my app to npm?

Apps are loaded via Module Federation at runtime, not installed via npm.
To deploy, host your `remoteEntry.js` on a static server (Netlify, S3,
etc.) and add the URL to the host's `apps.json`.

### What TypeScript version should I use?

Use the same TypeScript version as the host (currently 5.x). The
`@cytoscape-web/api-types` package is built with the host's TypeScript
version.

### How do I test my app without the host?

For unit tests, mock the `cyweb/*` imports:

```typescript
jest.mock('cyweb/AppIdContext', () => ({
  useAppContext: () => ({
    appId: 'test',
    apis: {
      element: { getNode: jest.fn() },
      // ... mock other APIs
    },
  }),
}))
```

For integration testing, run both the host and your plugin dev server.

---

## Next Steps

- [Getting Started](./getting-started.md) — Scaffold and run a new app
- [Architecture Overview](./architecture-overview.md) — Module Federation, type system, API layers
- [Resource Registration Patterns](./registration-patterns.md) — Panels, menus, context menus
- [App Lifecycle & Cleanup](./lifecycle-and-cleanup.md) — mount/unmount patterns
