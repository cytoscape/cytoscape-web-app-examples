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

### 2. `webpack.config.js`

- `DEV_SERVER_PORT` → pick an unused port
- `name` in `ModuleFederationPlugin` → unique camelCase string (must match
  `id` in your app config)

### 3. `src/TemplateApp.tsx`

- `id` → must match the webpack federation `name`
- `name`, `description` → human-readable labels
- `resources` → add/remove panels and menu items
- `mount()` → customize the context menu item or add more (edge, canvas)
- `unmount()` → add cleanup for any event listeners you register

### 4. `src/components/`

- `TemplatePanel.tsx` → replace with your panel UI
- `TemplateMenuItem.tsx` → replace with your menu action

### 5. Host registration

Add your app to the host's `src/assets/apps.local.json`:

```json
{ "name": "myApp", "url": "http://localhost:XXXX/remoteEntry.js" }
```

---

## File structure

```text
project-template/
├── src/
│   ├── index.ts              ← re-exports app config as default
│   ├── TemplateApp.tsx       ← app config: id, name, resources, lifecycle
│   ├── contextMenus.ts      ← context menu registration (Graph Traversal example)
│   └── components/
│       ├── TemplatePanel.tsx  ← right-panel component (WorkspaceApi example)
│       └── TemplateMenuItem.tsx ← apps-menu component (NetworkApi example)
├── webpack.config.js          ← Module Federation config (name, port, remotes)
├── tsconfig.json
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
| `webpack.config.js` | `env.production` flag switches between local and production host URL |

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
npx webpack --env production
```

This switches the host remote from `localhost:5500` to `web.cytoscape.org` and
enables minification.

---

## Further reading

- [hello-world/](../hello-world/) — full reference app with 12 examples covering
  all APIs
- [guides/](../guides/) — App Developer Guide (getting started, architecture,
  registration patterns, lifecycle, troubleshooting)
- [@cytoscape-web/api-types](https://www.npmjs.com/package/@cytoscape-web/api-types) —
  TypeScript types for all host APIs
