# Troubleshooting & FAQ

Common issues and solutions for Cytoscape Web app developers.

---

## Build & Configuration Errors

### "Module not found: Can't resolve 'cyweb/...'"

**Cause:** Missing Module Federation type declarations.

**Fix:** Install the type package and reference its declarations file from
your `tsconfig.json`:

```bash
npm install --save-dev @cytoscape-web/api-types
```

```jsonc
{
  "include": ["src/**/*"],
  "compilerOptions": {
    "moduleResolution": "bundler",
    "types": ["@cytoscape-web/api-types"]
  }
}
```

Listing the package in `types` is what pulls in its ambient `cyweb/*`
declarations. Do **not** set `typeRoots`: the examples used to point it at
`./node_modules/@types`, a directory that does not exist in a workspace, and
setting it suppresses the default lookup that would have found the types. See
any of the example apps' `tsconfig.json` for a working reference.

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
`export default MyApp` and the bundler handles the async boundary.

### Host dev server shows "Container missing" or blank panel

**Cause:** The federation container name, your `CyApp.id` and the id the host
registered are not the same string. The host refuses to load an app whose
`CyApp.id` does not match the id it registered, and says so only in a
debug-gated console warning.

**Fix:** They come from one place — the `cyweb` block in `package.json`:

```json
"cyweb": { "id": "myApp", "displayName": "My App", "port": 6000 }
```

`defineCyWebApp` uses `cyweb.id` as the federation name, your app reads it from
`virtual:cyweb-app-meta`, and the dev install manifest is generated from it. If
they disagree, something is not reading it:

- Does `src/MyApp.tsx` still hardcode `id: 'myApp'` instead of importing it?
- Did you install this app under an older id, before renaming it? Uninstall it
  in **Apps → App Settings** and open the printed install link again — the host
  keeps what it installed, not what your dev server now serves.

### The app "loads" but nothing happens, and there is no error

**Cause:** the `cyweb` remote is missing `type: 'module'`.

The host is a Vite build and emits an **ESM** `remoteEntry.js`. The plugin's
default remote type is `'var'` — a Webpack-style global — and against an ESM
entry that resolves **no exports at all**. The runtime finds no `init`/`get`,
the remote never registers, and nothing throws. This is the least legible
failure in the whole setup, which is why the build verifier checks for it.

**Fix:** use the object form, not the string shorthand:

```typescript
remotes: {
  cyweb: {
    type: 'module',          // ← without this it silently does nothing
    name: 'cyweb',
    entryGlobalName: 'cyweb',
    shareScope: 'default',
    entry: /* … */,
  },
}
```

`npm run verify:federation` asserts this against the built output.

### "This app must be loaded by Cytoscape Web: window.__CYWEB_HOST__ is missing or invalid"

**Cause:** your production build is running against a host that does not
publish the host descriptor, or is not running inside a Cytoscape Web host at
all.

A production build deliberately compiles in a sentinel instead of a host URL,
so the runtime plugin throws this named error rather than silently attempting to
reach `localhost:5500` — which, on a deployed app, would mean the **end user's
own machine**.

**Check, in order:**

1. Is the app being opened inside a running Cytoscape Web page? A production
   `remoteEntry.js` cannot be loaded standalone.
2. Does that host publish the descriptor? In the browser console:
   `window.__CYWEB_HOST__` should be a frozen object with `name: 'cyweb'` and
   an absolute `remoteEntry` URL. A host predating this feature has no such
   global and cannot load Vite-built apps.
3. Are you still going through `defineCyWebApp`? It registers the runtime
   plugin for you, and a config that assembles `federation()` by hand without
   `runtimePlugins` leaves the resolver inert — identical symptom. `npx
   cyweb-app verify` asserts the resolver is present in the built output, which
   is the fastest way to tell.

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

**You do not.** This used to require a build flag and two hardcoded URLs; it
no longer does.

`vite dev` compiles in `http://localhost:5500/remoteEntry.js` as a developer
convenience, and `vite build` compiles in a sentinel that the host's published
descriptor replaces at runtime. The same production artifact therefore works
against production, a staging host, or a colleague's machine — switching hosts
means loading the app from a different host, not rebuilding it.

<details>
<summary>The old, removed approach</summary>

```javascript
const LOCAL_CYWEB = 'cyweb@http://localhost:5500/remoteEntry.js'
const PROD_CYWEB = 'cyweb@https://web.cytoscape.org/remoteEntry.js'

remotes: {
  cyweb: isProduction ? PROD_CYWEB : LOCAL_CYWEB,
},
```

It bound each artifact to one host deployment: the published build could only
ever be loaded by `web.cytoscape.org`.

</details>

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

**Expected.** HMR does not cross the federation boundary — that is a separate
plugin feature (`dev.remoteHmr`) which is off by default. Module Federation
remotes are loaded once, when the host page starts.

After changing your plugin code:

1. Your dev server rebuilds the changed module immediately
2. **Refresh the host page** — the host re-fetches `remoteEntry.js` on load

You never rebuild or restart the *host* for an app change, which is the part
that matters; only the page reload.

---

## FAQ

### Can I use MUI components in my plugin?

Yes. MUI is a shared singleton provided by the host. Import and use it
normally:

```typescript
import { Button, Typography } from '@mui/material'
```

Import from the **root barrel** as shown — never `@mui/material/Button`. A
subpath import misses the share key and bundles MUI into your app.

`@mui/material` belongs in `devDependencies` and `peerDependencies`, never
`dependencies`, and it must appear in the `shared` block of your
`vite.config.ts` with `import: false`.

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
