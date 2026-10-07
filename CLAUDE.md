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
- Expose one module, `./AppConfig`, via their own `remoteEntry.js`; panels are React components, Apps-menu entries are plain data
- Are registered in the host's `src/assets/apps.json` (production) or `src/assets/apps.local.json` (local dev)

### App Registry

| App                | Federation Name      | Port | Components                                                                              |
| ------------------ | -------------------- | ---- | --------------------------------------------------------------------------------------- |
| hello-world        | `hello`              | 2222 | HelloApp, HelloPanel (13 examples), menuActions (one apps-menu action that opens a dialog) |
| network-statistics | `networkStatistics`  | 3333 | NetworkStatisticsApp (non-React — no UI components)                                     |
| network-workflows  | `networkWorkflows`   | 7001 | NetworkWorkflowsApp, menuActions (two apps-menu actions), JupyterConnectorPanel          |
| project-template   | `template`           | 5555 | TemplateApp, TemplatePanel, menuActions + context menu                                    |

---

## 3. Plugin Architecture

### CyApp Config Pattern (Phase 2)

Every plugin exports a `CyAppWithLifecycle` object that declares its identity, resources, and lifecycle:

```typescript
// src/<AppName>.tsx
import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'
// Identity comes from the `cyweb` block and the standard fields in
// package.json. Do NOT `import packageJson from '../package.json'`: that pulls
// the whole file into the browser bundle to read one string.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

export const MyApp: CyAppWithLifecycle = {
  id, // the Module Federation name, the CyApp id and the registry id at once
  name: displayName,
  description,
  version,
  apiVersion: '1.0',

  // Declarative resource registration — panels and menu items
  resources: [
    { slot: 'right-panel', id: 'MyPanel', title: 'My Panel',
      component: lazy(() => import('./components/MyPanel')) },
    { slot: 'apps-menu', id: 'MyMenu', label: 'My Action',
      onClick: (apis) => { /* apis.network..., or apis.dialog.open(...) for UI */ } },
  ],

  // Optional: context menus, event listeners, etc.
  mount(context) { /* context.apis has all APIs */ },
  unmount() { /* clean up event listeners only */ },
}
```

- `slot: 'right-panel'` → rendered in the right-side App Panel
- `slot: 'apps-menu'` → a row the HOST renders under the Apps dropdown, from
  `label`, `tooltip`, `icon` and `onClick(apis)`. It takes no `component`, and
  nothing an app renders lives inside the menu: an action that needs UI opens it
  with `apis.dialog.open(...)`
- Context menus → registered in `mount()` via `context.apis.contextMenu`

`CyApp.components` (`ComponentType.Menu` / `ComponentType.Panel`) was removed
from the App API in `1.0.0-beta.5` (cytoscape/cytoscape-web#786). The host
ignores the field, and `cyweb/ApiTypes` no longer exports `ComponentType`, so an
app that references it does not load. The beta.5 types this repository depends
on declare neither, so the type checker rejects both: do not reintroduce them.

### Entry Point Pattern

```typescript
// src/index.ts — the module named by `exposes['./AppConfig']`
export { default } from './MyApp'
```

### Type Declarations

Install `@cytoscape-web/api-types` for full type support — no `remotes.d.ts` needed for
API hooks. The package provides ambient module declarations for all `cyweb/*` remotes.

### vite.config.ts Pattern

Every app's `vite.config.ts` is the same three lines:

```typescript
import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url)
```

Identity (`id`, `displayName`, `port`) lives in the `cyweb` block of the app's
`package.json`. Extra Vite options go in `defineCyWebApp(import.meta.url, { vite: { … } })`;
touching a field the SDK owns fails the build with the path named.

`defineCyWebApp` (`packages/app-runtime/src/vite/`) generates the federation
block below. Four things in it are load-bearing and each fails in a way that is
hard to read, so do not simplify them away when working on the SDK.

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
   entry URL on `window.__CYWEB_HOST__` at boot and
   `packages/app-runtime/src/runtime/mfRuntimePlugin.ts` swaps it in, so one
   build works against any deployment. Shipping `localhost:5500` instead would
   point a deployed app at the *end user's* own loopback address.
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
`<appId>-<version>.zip` for App Store submission — off by default, and reached
through `npm run build:zip`.

Packaging verifies the build before it packages it, classifies members with
denies before allows (a file class the allowlist does not name fails the build
rather than being uploaded), and injects a generated **`cy-manifest.json`** at
the archive root. That manifest is derived from `package.json` and never edited
or committed; `npx cyweb-app manifest` prints the same bytes without building an
archive. See `design/specifications/app-sdk/cy-manifest.md` for the wire format
and `guides/getting-started.md` §5b for what to fill in before submitting.

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
npm run dev   # starts all 4 apps concurrently

# Or individually:
npm run dev:hello-world
npm run dev:network-statistics
npm run dev:network-workflows
npm run dev:project-template
```

### Connect to Local Host

The host app (`cytoscape-web`) must be running on `localhost:5500`.

The host's dev server serves `src/assets/apps.local.json` as its app catalog, and that file already lists the four apps here at their `localhost:XXXX` dev server URLs — nothing in the host repo is edited or copied. Enable an app under **Apps → Manage Apps...**. Reload the host page after changing an app: HMR does not cross the federation boundary.

An app that is not in `apps.local.json` installs through the link its own `npm run dev` prints (`http://localhost:5500/?installApp=…`).

### When Host API Changes

When `cytoscape-web` adds or changes exposed modules:

1. Bump `@cytoscape-web/api-types` in the affected apps — it declares every `cyweb/*` module, so there is no `remotes.d.ts` to maintain. This changes `package.json`, so ask first (§1)
2. No config change is needed for a host URL change — it is resolved at runtime (§3)
3. Update component imports and usage to match new API signatures
4. Run `npm run build` to verify no TypeScript errors

### Developing against an unpublished api-types

When the host's `development` carries an api-types version that is not on npm
yet, install the host's types from a local tarball without touching
`package.json` or the lockfile. (`1.0.0-beta.5` was developed this way until its
publish on 2026-10-05.)

```bash
# in cytoscape-web
npm run build:api-types
npm pack -w packages/api-types --ignore-scripts --pack-destination /tmp

# in this repository
npm install --no-save /tmp/cytoscape-web-api-types-<version>.tgz
npm ls @cytoscape-web/api-types   # every workspace should show <version>
```

Not `npm link` or a symlink: the declarations `import('react')`, and through
a link TypeScript resolves that from the host's `node_modules`, a different
`@types/react` from this repository's — under `skipLibCheck: false` the two
collide. Not a `file:` range either: it would commit a path outside the
repository. Any later `npm install` / `npm ci` restores the published version,
and a change to the host's types needs a fresh pack — re-run both halves.
Bump the ranges (step 1 above) only once the version is on npm.

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
| Panel component (13 API examples) | `hello-world/src/components/HelloPanel.tsx`              |
| Apps-menu action (plain data)     | `project-template/src/menuActions.ts`                     |
| Build config (what the SDK sets up) | `project-template/vite.config.ts`                     |
| Federation block (generated)      | `packages/app-runtime/src/vite/`                        |
| Template for new apps             | `project-template/`                                     |
| App Developer Guide               | `guides/`                                               |
| Host API types (source of truth)  | `../cytoscape-web/src/app-api/types/index.ts`           |
| Host API architecture             | `../cytoscape-web/src/app-api/CLAUDE.md`                |
| Host federation exposes           | `../cytoscape-web/src/app-api/federation/federationExposes.ts` |

---

## 8. Creating a New App

1. Run `npm create cytoscape-app my-app`, or copy `project-template/` and rename it
2. Update `package.json`: `name`, `version`, `description`, and the `cyweb`
   block (`id`, `displayName`, `port`)
3. Leave `vite.config.ts` as it is — it reads the `cyweb` block
4. Update `src/TemplateApp.tsx`: the export name and `resources`
5. Replace the panel in `src/components/`, the action in `src/menuActions.ts`
   and the item in `src/contextMenus.ts`
6. If you copied `project-template/`, run `npm install` in the copy; the
   generator has already installed the dependencies
7. Run `npm run dev` and open the install link it prints

See `guides/getting-started.md` for the full walkthrough.

---

## 9. Project Status

**App API 1.0 is merged into the host's `development`.** It is no longer behind
a feature branch — the `cyweb/*Api` hooks, the event bus and app resource
registration are all on `development`, and `@cytoscape-web/api-types` publishes
their declarations to npm.

**All four apps build with Vite** (repository release `1.1.0`; the apps
themselves are independently versioned). The Webpack toolchain is gone; see
`design/specifications/vite-migration/` for the plan, the measurements and the
decisions that changed under measurement.
