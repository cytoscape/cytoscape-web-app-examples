# CLAUDE.md

> Agent context for the `cytoscape-web-app-examples` repository.
> Read this before working on any task in this repo.

## 1. AI Agent Workflow & Rules

- **Plan First:** Enter plan mode for non-trivial tasks (3+ steps or architectural decisions).
- **Context First:** Before planning, read `CLAUDE.md` (this file) and the host's `src/app-api/CLAUDE.md` for API architecture context.
- **Halt and Re-plan:** If something goes wrong, STOP immediately and re-plan.
- **Capture Lessons:** After corrections or unexpected failures, record what you learned in `.serena/memories/lessons.md`.
- **Safety:** Never modify `package.json` dependencies without explicit user confirmation.

---

## 2. Repository Purpose & Relationship to Host

This repo contains **reference implementations** for Cytoscape Web plugin apps built with Module Federation (Vite).

**Host application:** `cytoscape-web` runs on `localhost:5500` and exposes federated modules under the `cyweb/` prefix.

**Plugin apps** in this repo:

- Import host stores and APIs via `cyweb/<ModuleName>` imports
- Export React components (menus, panels) via their own `remoteEntry.js`
- Are registered in the host's `src/assets/apps.json` (production) or `src/assets/apps.local.json` (local dev)

### App Registry

| App                | Federation Name      | Port | Components                                                                              |
| ------------------ | -------------------- | ---- | --------------------------------------------------------------------------------------- |
| hello-world        | `hello`              | 2222 | HelloApp, HelloPanel                                                                    |
| network-statistics | `networkStatistics`  | 3333 | NetworkStatisticsApp (non-React — no UI components)                                     |
| network-workflows  | `networkWorkflows`   | 7000 | NetworkWorkflowsApp, CreateNetworkMenu, CreateNetworkFromCx2Menu, JupyterConnectorPanel |
| project-template   | `template`           | 5555 | TemplateApp, TemplatePanel, TemplateMenuItem + context menu                             |

---

## 3. Plugin Architecture

### CyApp Config Pattern (Phase 2)

Every plugin exports a `CyAppWithLifecycle` object that declares its identity, resources, and lifecycle:

```typescript
// src/<AppName>.tsx
import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'
import packageJson from '../package.json'
const { version } = packageJson

export const MyApp: CyAppWithLifecycle = {
  id: 'myApp', // must match the Module Federation name in vite.config.ts
  name: 'My App',
  description: '...',
  version,
  apiVersion: '1.0',

  // Declarative resource registration — panels and menu items
  resources: [
    { slot: 'right-panel', id: 'MyPanel', title: 'My Panel',
      component: lazy(() => import('./components/MyPanel')) },
    { slot: 'apps-menu', id: 'MyMenu', title: 'My Action',
      component: lazy(() => import('./components/MyMenu')), closeOnAction: true },
  ],

  // Optional: context menus, event listeners, etc.
  mount(context) { /* context.apis has all APIs */ },
  unmount() { /* clean up event listeners only */ },
}
```

- `slot: 'right-panel'` → rendered in the right-side App Panel
- `slot: 'apps-menu'` → rendered under the Apps dropdown
- Context menus → registered in `mount()` via `context.apis.contextMenu`

### Entry Point Pattern

```typescript
// src/index.ts — the module named by `exposes['./AppConfig']`
export { default } from './MyApp'
```

### Type Declarations

Install `@cytoscape-web/api-types` for full type support — no `remotes.d.ts` needed for
API hooks. The package provides ambient module declarations for all `cyweb/*` remotes.

### vite.config.ts Pattern

All plugin apps share the same federation block. Four things in it are load-bearing
and each fails in a way that is hard to read, so do not simplify them away.

```typescript
federation({
  name: 'myApp',              // unique, camelCase; must equal CyApp.id
  filename: 'remoteEntry.js',
  dts: false,
  runtimePlugins: [mfRuntimePlugin],   // (3)
  remotes: {
    cyweb: {
      type: 'module',         // (1) REQUIRED
      name: 'cyweb',
      entryGlobalName: 'cyweb',
      shareScope: 'default',
      entry: command === 'serve'
        ? 'http://localhost:5500/remoteEntry.js'
        : CYWEB_HOST_REQUIRED,          // (2)
    },
  },
  exposes: { './AppConfig': './src/index.ts' },
  shared: CONFIGURED_SHARED,            // (4)
  manifest: { additionalData: … },      // embeds the audit fields the verifier reads
})
```

1. **`type: 'module'`** — the host is a Vite build and emits an ESM
   `remoteEntry.js`. The plugin's default is `'var'` (a Webpack-style global),
   which resolves **no exports** against an ESM host and fails *silently*: the
   remote appears to load and exports nothing.
2. **The production entry is a sentinel, not a URL.** The host publishes its own
   entry URL on `window.__CYWEB_HOST__` at boot and `src/mfRuntimePlugin.ts`
   swaps it in, so one build works against any deployment. Shipping
   `localhost:5500` instead would point a deployed app at the *end user's* own
   loopback address.
3. **`runtimePlugins` is the load-bearing half of (2).** The resolver file on
   its own is inert; without this line the app silently keeps its compiled-in
   entry.
4. **`shared` keys are exact and match the host's five singletons** — `react`,
   `react-dom`, `@mui/material`, `@emotion/react`, `@emotion/styled` — all with
   `import: false`. This only works because app sources import the MUI **root
   barrel**. See §6.

`npm run verify:federation` asserts all four against the built output, because
every one of them looks correct in the config when it is wrong.

The config also carries two build-time gates, both deliberately fatal:
`noSharedPayload` (a shared package's implementation must not end up in the
remote's own chunks) and `zipForAppStore`, which writes
`<appId>-<version>.zip` for App Store submission from an allowlist — a file
class the list does not name fails the build rather than being uploaded.

---

## 4. API Usage Patterns

### Importing App APIs

```typescript
import { useNetworkApi } from 'cyweb/NetworkApi'
import { useElementApi } from 'cyweb/ElementApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { useCyWebEvent } from 'cyweb/EventBus'
import { useAppContext } from 'cyweb/AppIdContext'
```

All API functions return `ApiResult<T>`:

```typescript
const result = workspaceApi.getCurrentNetworkId()
if (result.success) {
  console.log(result.data.networkId)
} else {
  console.error(result.error.message)
}
```

### Per-App Context (Phase 2)

Inside plugin components, use `useAppContext()` for per-app APIs:

```typescript
import { useAppContext } from 'cyweb/AppIdContext'

const ctx = useAppContext()
// ctx.apis.resource — register panels/menus at runtime
// ctx.apis.contextMenu — per-app context menu (auto-cleaned)
```

### Host Store Imports (Legacy)

Direct store imports (`cyweb/NetworkStore`, etc.) still work but are deprecated.
New apps should use `cyweb/*Api` hooks instead.

---

## 5. Development Workflow

### Start All Dev Servers

```bash
# In this repo root:
npm run dev   # starts all 3 apps concurrently

# Or individually:
npm run dev:hello-world
npm run dev:network-workflows
npm run dev:project-template
```

### Connect to Local Host

The host app (`cytoscape-web`) must be running on `localhost:5500`.

To load local plugins in the host, copy `src/assets/apps.local.json` over `src/assets/apps.json` in the host repo. The `apps.local.json` points to `localhost:XXXX` dev server URLs.

### When Host API Changes

When `cytoscape-web` adds or changes exposed modules:

1. Update `remotes.d.ts` in affected apps to declare new `cyweb/*` modules
2. No config change is needed for a host URL change — it is resolved at runtime (§3)
3. Update component imports and usage to match new API signatures
4. Run `npm run build` to verify no TypeScript errors

### Publishing

`npm run deploy` builds every workspace and copies each `dist/` into
`docs/<publishPath>`, which GitHub Pages serves.

**`docs/.nojekyll` is load-bearing — do not delete it, and do not remove the
line in `copy-dist.mjs` that writes it.** The Pages site is configured as
`build_type: legacy`, so it runs `docs/` through Jekyll, which drops every path
beginning with `_`. Vite's Module Federation plugin names five chunks per app
`_virtual_mf-*`, including the shared-scope import map that `remoteEntry.js`
imports first. Without `.nojekyll` every published app 404s on its first
transitive import while `remoteEntry.js` still answers 200 — which is exactly
what happened on 8/5/2026.

Three checks cover three different things, and none substitutes for another:

| Command | Reads | Catches |
| --- | --- | --- |
| `npm run verify:federation` | `dist/` | a wrong federation shape at build time |
| `npm run preflight:host -- <hostUrl>` | the host | a host that publishes no usable descriptor |
| `npm run preflight:apps -- <hostUrl> <appsBase>` | the **served** apps | anything the serving layer breaks |

The third runs a real `import()` inside a real host page — the only way a
missing transitive chunk is visible. `.github/workflows/verify-published-apps.yml`
runs it after a publish; note that with legacy Pages it can only *detect*, since
pushing to `main` publishes `docs/` without consulting any workflow.

---

## 6. Code Style

Shared config files at repo root apply to all apps:

- `.eslintrc.json` — ESLint with TypeScript + React + Prettier
- `.prettierrc.json` — Formatting rules

**Formatting:**

- No semicolons
- Single quotes
- Trailing commas
- 2-space indentation, 80-char line width

**Components:**

- Functional components only
- `react-jsx` transform — do NOT add `import React from 'react'`
- No `console.log` in committed code

---

## 7. Key Files

| Purpose                          | Path                                                     |
| -------------------------------- | -------------------------------------------------------- |
| App config (resources + lifecycle) | `hello-world/src/HelloApp.tsx`                          |
| Panel component (12 API examples) | `hello-world/src/components/HelloPanel.tsx`              |
| Menu component (closeOnAction)    | `project-template/src/components/TemplateMenuItem.tsx`   |
| MF config (canonical, commented)  | `project-template/vite.config.ts`                       |
| Template for new apps             | `project-template/`                                     |
| App Developer Guide               | `guides/`                                               |
| Host API types (source of truth)  | `../cytoscape-web/src/app-api/types/index.ts`           |
| Host API architecture             | `../cytoscape-web/src/app-api/CLAUDE.md`                |
| Host federation exposes           | `../cytoscape-web/src/app-api/federation/federationExposes.ts` |

---

## 8. Creating a New App

1. Copy `project-template/` and rename it
2. Update `package.json`: `name`, `version`
3. Update `vite.config.ts`: `DEV_SERVER_PORT`, `name` in `federation()`
4. Update `src/TemplateApp.tsx`: `id` (must match MF name), `name`, `resources`
5. Replace panel/menu components in `src/components/`
6. Register your app in the host's `src/assets/apps.local.json`

See `guides/getting-started.md` for the full walkthrough.

---

## 9. Project Status

**App API 1.0 is merged into the host's `development`.** It is no longer behind
a feature branch — the `cyweb/*Api` hooks, the event bus and app resource
registration are all on `development`, and `@cytoscape-web/api-types` publishes
their declarations to npm.

**All five apps build with Vite** (repository release `1.1.0`; the apps
themselves are independently versioned). The Webpack toolchain is gone; see
`design/specifications/vite-migration/` for the plan, the measurements and the
decisions that changed under measurement.

See the parent workspace `CLAUDE.md` at `../CLAUDE.md` for the full phase roadmap.
