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

This repo contains **reference implementations** for Cytoscape Web plugin apps built with Webpack Module Federation.

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
  id: 'myApp', // must match Module Federation name in webpack.config.js
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
// src/index.ts — must be the webpack entry point
export { default } from './MyApp'
```

### Type Declarations

Install `@cytoscape-web/api-types` for full type support — no `remotes.d.ts` needed for
API hooks. The package provides ambient module declarations for all `cyweb/*` remotes.

### webpack.config.js Pattern

All plugin apps follow the same webpack structure. Key points:

- `name`: unique federation name (no spaces, camelCase)
- `filename`: always `remoteEntry.js`
- `remotes.cyweb`: points to host (`localhost:5500` dev, `web.cytoscape.org` prod)
- `exposes`: registers the app config + each component
- `shared`: React, react-dom, and @mui/material **must** be `singleton: true`

```javascript
new ModuleFederationPlugin({
  name: 'myApp',
  filename: 'remoteEntry.js',
  remotes: { cyweb: cywebUrl }, // cywebUrl switches by env.production
  exposes: {
    './AppConfig': './src/index.ts',  // only one expose needed
  },
  shared: {
    react: { singleton: true, requiredVersion: deps.react },
    'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
    '@mui/material': {
      singleton: true,
      requiredVersion: deps['@mui/material'],
    },
  },
})
```

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
2. Update `webpack.config.js` remotes if the host URL structure changes
3. Update component imports and usage to match new API signatures
4. Run `npm run build` to verify no TypeScript errors

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
| MF config (env.production switch) | `project-template/webpack.config.js`                    |
| Template for new apps             | `project-template/`                                     |
| App Developer Guide               | `guides/`                                               |
| Host API types (source of truth)  | `../cytoscape-web/src/app-api/types/index.ts`           |
| Host API architecture             | `../cytoscape-web/src/app-api/CLAUDE.md`                |
| Host webpack exposes              | `../cytoscape-web/webpack.config.js`                    |

---

## 8. Creating a New App

1. Copy `project-template/` and rename it
2. Update `package.json`: `name`, `version`
3. Update `webpack.config.js`: `DEV_SERVER_PORT`, `name` in `ModuleFederationPlugin`
4. Update `src/TemplateApp.tsx`: `id` (must match MF name), `name`, `resources`
5. Replace panel/menu components in `src/components/`
6. Register your app in the host's `src/assets/apps.local.json`

See `guides/getting-started.md` for the full walkthrough.

---

## 9. Branch Context

Current active branch: `new-app-api`

Phase 0–2 of the App API are complete (types, 10 domain APIs, Event Bus, App
Resource Registration). Phase 3 focuses on documentation and examples.

See the parent workspace `CLAUDE.md` at `../CLAUDE.md` for the full phase roadmap.
