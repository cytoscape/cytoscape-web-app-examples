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

# 3. Start the dev server (host must be running on :5500)
npm run dev
```

Open `http://localhost:5500` → **Apps** → **App Settings** → enable your app.

---

## What to change after copying

### 1. `package.json`

- `name` → your package name
- `version` → your version

### 2. `vite.config.ts`

- `DEV_SERVER_PORT` → pick an unused port
- `name` in `federation()` → unique camelCase string (must match
  `id` in your app config)

Leave the rest of the `federation()` block alone — `type: 'module'`,
`runtimePlugins`, the sentinel entry and the five `import: false` shares each
fail in a way that is hard to read. The comments in the file say which.

### 3. `src/TemplateApp.tsx`

- `id` → must match the federation `name` in `vite.config.ts`
- `name`, `description` → human-readable labels
- `resources` → add/remove panels and menu items
- `mount()` → customize the context menu item or add more (edge, canvas)
- `unmount()` → add cleanup for any event listeners you register

### 4. `src/components/`

- `TemplatePanel.tsx` → replace with your panel UI
- `TemplateMenuItem.tsx` → replace with your menu action

### 5. Host registration

Add your app to the host's `src/assets/apps.local.json` (a JSON array):

```json
{
  "id": "myApp",
  "name": "My App (display name)",
  "url": "http://localhost:XXXX/remoteEntry.js",
  "author": "Your Name",
  "description": "Short description",
  "version": "0.1.0"
}
```

> The `id` field is the unique identifier and must match the `id` in
> your `CyApp` object and the federation `name` in `vite.config.ts`.
> The `name` field is the display label shown in App Settings.

> **Note:** The template itself is not pre-registered in `apps.local.json`.
> To test it before copying, add:
>
> ```json
> {
>   "id": "template",
>   "name": "App Template",
>   "url": "http://localhost:5555/remoteEntry.js",
>   "version": "0.1.0"
> }
> ```

---

## File structure

```text
project-template/
├── src/
│   ├── index.ts                  ← re-exports app config as default
│   ├── TemplateApp.tsx           ← app config: id, name, resources, lifecycle
│   ├── contextMenus.ts           ← context menu registration (Graph Traversal example)
│   └── components/
│       ├── TemplatePanel.tsx     ← right-panel component (WorkspaceApi example)
│       └── TemplateMenuItem.tsx  ← apps-menu component (NetworkApi example)
├── vite.config.ts                ← Module Federation config (name, port, shares)
├── index.html                    ← remote-only stub (Vite needs an HTML entry)
├── src/cywebHostSentinel.ts      ← entry a production build ships when no host is known
├── src/mfRuntimePlugin.ts        ← resolves the host URL at runtime
├── test/mfRuntimePlugin.test.ts  ← covers both remote arrays + every rejection
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
| `vite.config.ts` | The federation block: exact share keys, `import: false`, the `noSharedPayload` gate |
| `src/mfRuntimePlugin.ts` | Runtime host resolution — one build works against any deployment |

---

## Context menus

Right-click a node to see **"Template: Select Neighbors"** — it uses
`getConnectedNodes()` to find adjacent nodes, then `additiveSelect()` to
highlight them. The registration lives in `src/contextMenus.ts`.

To add more items, create a new function in `contextMenus.ts` and call it
from `mount()`. Items are auto-cleaned when the app is disabled.

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

---

## Further reading

- [hello-world/](../hello-world/) — full reference app with 13 examples covering
  all APIs
- [guides/](../guides/) — App Developer Guide (getting started, architecture,
  registration patterns, lifecycle, troubleshooting)
- [@cytoscape-web/api-types](https://www.npmjs.com/package/@cytoscape-web/api-types) —
  TypeScript types for all host APIs
