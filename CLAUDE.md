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

| App              | Federation Name | Port | Components                               |
|------------------|-----------------|------|------------------------------------------|
| hello-world      | `hello`         | 2222 | HelloApp, HelloPanel                     |
| network-workflows| `networkWorkflows` | 7000 | NetworkWorkflowsApp, CreateNetworkMenu, CreateNetworkFromCx2Menu, JupyterConnectorPanel |
| simple-menu      | `simpleMenu`    | 3333 | SimpleMenuApp, AppMenuItem               |
| simple-panel     | `simplePanel`   | 4001 | SimplePanelApp, SimplePanel              |
| project-template | `createNetwork` | 5555 | TemplateApp, TemplatePanel               |

---

## 3. Plugin Architecture

### CyApp Config Pattern

Every plugin exports a `CyApp` object that declares its identity and components:

```typescript
// src/<AppName>.tsx
import { ComponentType, CyApp } from '@cytoscape-web/types'

export const MyApp: CyApp = {
  id: 'myApp',           // unique, matches Module Federation name
  name: 'My App',
  description: '...',
  components: [
    { id: 'MyMenuItem', type: ComponentType.Menu },
    { id: 'MyPanel',    type: ComponentType.Panel },
  ],
}
```

- `ComponentType.Menu` → rendered under the "App" menu bar
- `ComponentType.Panel` → rendered in the right-side App Panel area

### Entry Point Pattern

```typescript
// src/index.ts — must be the webpack entry point
export { default } from './MyApp'
```

### remotes.d.ts

Each app declares type-safe access to host modules. Update this file when new host modules are added:

```typescript
// src/remotes.d.ts
declare module 'cyweb/WorkspaceStore'
declare module 'cyweb/NetworkStore'
declare module 'cyweb/TableStore'
declare module 'cyweb/ViewModelStore'
declare module 'cyweb/VisualStyleStore'
declare module 'cyweb/LayoutStore'
declare module 'cyweb/NetworkSummaryStore'
declare module 'cyweb/CreateNetwork'
declare module 'cyweb/CreateNetworkFromCx2'
// Add new cyweb/* modules here as the host API evolves
```

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
  remotes: { cyweb: cywebUrl },   // cywebUrl switches by env.production
  exposes: {
    './MyApp':       './src/MyApp',
    './MyMenuItem':  './src/components/MyMenuItem.tsx',
  },
  shared: {
    react:          { singleton: true, requiredVersion: deps.react },
    'react-dom':    { singleton: true, requiredVersion: deps['react-dom'] },
    '@mui/material':{ singleton: true, requiredVersion: deps['@mui/material'] },
  },
})
```

---

## 4. API Usage Patterns

### Importing Host Stores (Available Now)

```typescript
import { useWorkspaceStore } from 'cyweb/WorkspaceStore'
import { useNetworkStore }   from 'cyweb/NetworkStore'
import { useTableStore }     from 'cyweb/TableStore'
import { useVisualStyleStore } from 'cyweb/VisualStyleStore'
// etc. — see network-workflows/src/remotes.d.ts for a fuller example
```

### Importing App APIs (Phase 1 — `new-app-api` branch)

The host exposes high-level App APIs. **Read `cytoscape-web/src/app-api/CLAUDE.md`** before using these.

```typescript
import { useNetworkApi }    from 'cyweb/NetworkApi'
import { useElementApi }    from 'cyweb/ElementApi'
import { useSelectionApi }  from 'cyweb/SelectionApi'
// See cytoscape-web/webpack.config.js for the full list of exposed modules
```

All API functions return `ApiResult<T>`, a discriminated union:

```typescript
const result = await networkApi.getNetworkSummary(networkId)
if (result.success) {
  console.log(result.data)   // typed T
} else {
  console.error(result.error) // ApiError
}
```

### Component Props

- **Panel components** receive `{ message: string }` prop
- **Menu components** receive `{ handleClose: () => void }` prop (to close the menu after action)

---

## 5. Development Workflow

### Start All Dev Servers

```bash
# In this repo root:
npm run dev   # starts all 5 apps concurrently

# Or individually:
npm run dev:hello-world
npm run dev:network-workflows
npm run dev:simple-menu
npm run dev:simple-panel
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

| Purpose                        | Path                                                        |
|-------------------------------|-------------------------------------------------------------|
| App config pattern             | `hello-world/src/HelloApp.tsx`                              |
| Panel component pattern        | `simple-panel/src/components/SimplePanel.tsx`               |
| Menu component pattern         | `simple-menu/src/components/AppMenuItem.tsx`                |
| MF config pattern              | `hello-world/webpack.config.js`                             |
| Type declarations for host MF  | `network-workflows/src/remotes.d.ts`                        |
| Template for new apps          | `project-template/`                                         |
| Root workspace scripts         | `package.json`                                              |
| Host API types (source of truth) | `../cytoscape-web/src/app-api/types/index.ts`             |
| Host API architecture          | `../cytoscape-web/src/app-api/CLAUDE.md`                    |
| Host webpack exposes           | `../cytoscape-web/webpack.config.js`                        |
| Agent lessons                  | `.serena/memories/lessons.md`                               |
| Design docs (cross-cutting)    | `design/specifications/README.md`                           |
| Design docs (per-app)          | `design/apps/<app-name>/README.md`                          |

---

## 8. Creating a New App

1. Copy `project-template/` and rename it
2. Update `package.json`: `name`, `version`
3. Update `webpack.config.js`:
   - Change `DEV_SERVER_PORT` to an unused port
   - Change `name` in `ModuleFederationPlugin` to a unique camelCase string
   - Update `exposes` to list your app config and components
4. Rename/replace files in `src/` (keep the `index.ts` → `AppConfig` → component structure)
5. Update `remotes.d.ts` to declare any `cyweb/*` modules you need
6. Register your app in the host's `src/assets/apps.local.json` for local dev testing

---

## 9. Branch Context

Current active branch: `new-app-api`

This branch develops the new App API (Phase 1a–1g). Examples on this branch will be updated to demonstrate usage of the new `cyweb/XxxApi` hooks as they are implemented in the host.

See the parent workspace `CLAUDE.md` at `../CLAUDE.md` for the full phase roadmap.
