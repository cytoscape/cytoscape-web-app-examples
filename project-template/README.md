# Cytoscape Web App — Starter Template

A ready-to-use Cytoscape Web plugin with a panel, a menu action, and a
context menu item. Copy this directory to scaffold a new app.

| Field | Value |
|---|---|
| Federation name | `template` (change this) |
| Dev server port | `5555` (change this) |
| Entry point | `template@http://localhost:5555/remoteEntry.js` |

---

## Quick start

```bash
# 1. Copy the template
cp -r project-template my-app
cd my-app

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

The dev server prints the link that installs your app into a local host:

```
  Cytoscape Web app template — http://localhost:5555

  Install it into a local host:
  http://localhost:5500/?installApp=http://localhost:5555/cyweb-app.json
```

Start the host (`cd cytoscape-web && npm run dev`), open that URL, confirm the
install, and enable the app under **Apps → App Settings**.

**You do not edit anything in the host repository.** The host has accepted a
manifest URL through `?installApp=` all along; the dev server serves yours at
`/cyweb-app.json`, generated from your `package.json` on every request, so it
cannot go stale when you change the port or the version.

---

## What to change after copying

### 1. `package.json`

```json
{
  "name": "@you/my-app",
  "version": "0.1.0",
  "description": "What your app does — shown in App Settings",
  "cyweb": {
    "id": "myApp",
    "displayName": "My App",
    "port": 6000
  }
}
```

That is your app's whole identity, and it is written **once**. `cyweb.id` is the
Module Federation container name, the `CyApp.id` and the id the host registers,
all at the same time — before this block those were three separate strings that
had to be kept in agreement by hand.

Pick a port nothing else uses. The examples occupy 2222, 3333, 5555, 6100 and
7000, and the host takes 5500.

### 2. `vite.config.ts`

Nothing. It is three lines and it reads the block above:

```ts
import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url)
```

The federation wiring lives in `@cytoscape-web/app-runtime`, because four parts
of it are load-bearing and each fails in a way that is hard to read — an ESM
remote type, a production entry that is a sentinel rather than a URL, the
runtime plugin that resolves the host, and five shared singletons that must
match the host exactly. The comments in the file say what each one does.

Need a plugin, an alias or a `define`? Pass `{ vite: { … } }`; it is merged
last. Touching a field the SDK owns fails the build and names the path.

### 3. `src/TemplateApp.tsx`

- `resources` → add or remove panels and menu items
- `mount()` → customize the context menu item, or add more (edge, canvas)
- `unmount()` → clean up any event listeners you registered

Identity is already handled: `id`, `displayName`, `version` and `description`
arrive from `virtual:cyweb-app-meta`, which the build fills in from
`package.json`. Do not import `package.json` directly — that pulls the whole
file, `devDependencies` included, into your browser bundle to read one string.

### 4. `src/components/`

- `TemplatePanel.tsx` → replace with your panel UI
- `TemplateMenuItem.tsx` → replace with your menu action

---

## File structure

```text
project-template/
├── src/
│   ├── index.ts                  ← re-exports app config as default
│   ├── TemplateApp.tsx           ← app config: resources and lifecycle
│   ├── contextMenus.ts           ← context menu registration (Graph Traversal example)
│   └── components/
│       ├── TemplatePanel.tsx     ← right-panel component (WorkspaceApi example)
│       └── TemplateMenuItem.tsx  ← apps-menu component (NetworkApi example)
├── vite.config.ts                ← three lines: defineCyWebApp(import.meta.url)
├── index.html                    ← remote-only stub (Vite needs an HTML entry)
├── test/appConfig.test.ts        ← identity, and the shape of what ./AppConfig exports
├── tsconfig.json                 ← app sources (skipLibCheck: false)
├── tsconfig.node.json            ← vite.config.ts
├── tsconfig.test.json            ← test/
└── package.json
```

---

## What each file demonstrates

| File | Pattern |
|---|---|
| `TemplateApp.tsx` | Declarative `resources[]`, `mount()` delegates to `contextMenus.ts` |
| `contextMenus.ts` | `getConnectedNodes()` + `additiveSelect()` — Graph Traversal + Selection APIs |
| `TemplatePanel.tsx` | `useWorkspaceApi()` + `ApiResult<T>` pattern, MUI shared singletons |
| `TemplateMenuItem.tsx` | `useNetworkApi().createNetworkFromEdgeList()`, `closeOnAction: true` |
| `vite.config.ts` | One call. The federation block, the runtime host resolution and the bundled-shared gate all come from `@cytoscape-web/app-runtime` |
| `package.json` (`cyweb` block) | The app's identity, written once and read by the build, the app config and the dev install manifest |

---

## Context menus

Right-click a node to see **"Template: Select Neighbors"** — it uses
`getConnectedNodes()` to find adjacent nodes, then `additiveSelect()` to
highlight them. The registration lives in `src/contextMenus.ts`.

To add more items, create a new function in `contextMenus.ts` and call it
from `mount()`. Items are auto-cleaned when the app is disabled.

---

## Verifying a build

```bash
npm run build && npx cyweb-app verify
```

Checks the built output against the federation contract: the ESM remote shape,
the production sentinel, the registered runtime plugin, the shared singletons,
and two artifact-hygiene rules — that `package.json` did not end up in your
bundle, and that build-machine paths stayed out of your chunks.

It reads this directory only, so it keeps working after you copy the app out of
this repository.

---

## Building for production

```bash
npm run build
```

There is no production/development flag any more. The build ships a **sentinel**
instead of a host URL, and the running host supplies its own address at load
time via `window.__CYWEB_HOST__` — so the same artifact works against
production, a staging host, or a colleague's `localhost:5500`.

Verify the output before publishing:

```bash
npm run verify:federation   # from the repo root
```

## Submitting to the App Store

The same `npm run build` also writes **`<appId>-<version>.zip`** next to
`package.json` — for this template, `template-1.0.0.zip`. Upload that file on
the App Store submission page; nothing else to prepare.

The zip holds the browser publish set, not the whole of `dist/`. Three things
are excluded on purpose:

| Excluded | Why |
| --- | --- |
| `mf-manifest.json` | embeds absolute build-machine paths — your home directory and username |
| `mf-stats.json` | build metadata; nothing fetches it at runtime |
| `remoteEntry.ssr.js`, `ssrEntryLoader-*`, `module-runner-*` | ~34 kB of Node-only code, unreachable in a browser |

It is exactly what this repository publishes to GitHub Pages, so the store
serves what the examples site serves.

The file list is an **allowlist**: if a future plugin version emits a file class
`vite.config.ts` does not name, the build fails rather than uploading it. If you
hit that, classify the new file in `APP_STORE_PUBLISH_CLASSES` — the failure is
deliberate.

---

## Further reading

- [hello-world/](../hello-world/) — full reference app with 13 examples covering
  all APIs
- [guides/](../guides/) — App Developer Guide (getting started, architecture,
  registration patterns, lifecycle, troubleshooting)
- [@cytoscape-web/api-types](https://www.npmjs.com/package/@cytoscape-web/api-types) —
  TypeScript types for all host APIs
