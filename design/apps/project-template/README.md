# project-template — Design Document

## Overview

Boilerplate for creating new Cytoscape Web plugin apps. Contains one working
example of each extension point — a right panel, an Apps-menu action and a
context menu item — so a new app starts from code that already loads.

| Property | Value |
|----------|-------|
| Federation name | `template` |
| Dev port | 5555 |
| App config file | `project-template/src/TemplateApp.tsx` |
| App API | `apiVersion: '1.0'`, `@cytoscape-web/api-types` `^1.0.0-beta.4` |

`create-cytoscape-app` builds its templates from this directory
(`packages/create-cytoscape-app/scripts/sync-templates.mjs`), so a change here
reaches newly scaffolded apps with the next release of that package.

## Resources

Declared in the `resources` array of `TemplateApp.tsx`:

| Slot | Resource id | Source | Purpose |
|------|-------------|--------|---------|
| `'right-panel'` | `TemplatePanel` | `src/components/TemplatePanel.tsx` (lazy) | Shows the workspace name via `useWorkspaceApi()` — replace with your implementation |
| `'apps-menu'` | `TemplateMenuItem` | `createExampleNetwork` in `src/menuActions.ts` | Plain-data menu entry; its `onClick(apis)` creates a small network |

Registered in `mount()`, because the handler needs `context.apis`:

| Kind | Label | Source | Purpose |
|------|-------|--------|---------|
| Context menu item | Template: Select Neighbors | `src/contextMenus.ts` | Selects the direct neighbors of the clicked node |

## How to Use This Template

See the "Build Your First App" section in the root
[`README.md`](../../../README.md#build-your-first-app) for step-by-step
instructions. `npm create cytoscape-app my-app` is the recommended start;
copying this directory gives the same shape by hand.

## Design Intent

- **One of each extension point** — a panel, a menu action and a context menu item. Delete what you do not need.
- **Menu entries are data, not components** — an `'apps-menu'` entry is a `label` and an `onClick(apis)`. The host renders the row and closes the dropdown. An action that needs UI opens it with `apis.dialog.open(...)`; nothing renders inside the menu.
- **Identity is written once** — `id`, `displayName` and `port` live in the `cyweb` block of `package.json`. The build, the app config (through `virtual:cyweb-app-meta`) and the dev install manifest all read from there.
- **No build configuration to write** — `vite.config.ts` is `defineCyWebApp(import.meta.url)`. The federation settings belong to `@cytoscape-web/app-runtime`.
- **`template` and port 5555 are placeholders** — both **must be changed** in a real app to avoid colliding with this one.

## Host Modules Used

```typescript
cyweb/ApiTypes      // types only
cyweb/WorkspaceApi  // useWorkspaceApi() in TemplatePanel
```

## Checklist When Cloning This Template

- [ ] Rename the directory to your app name
- [ ] Update `package.json` → `name`, `version`, `description`
- [ ] Update `package.json` → `cyweb.id`, `cyweb.displayName`, `cyweb.port`
- [ ] Rename `TemplateApp.tsx` and its export, and update `src/index.ts`
- [ ] Rename `TemplatePanel.tsx` and implement your component
- [ ] Replace the action in `src/menuActions.ts` and the item in `src/contextMenus.ts`, or remove them
- [ ] Leave `vite.config.ts` as it is
- [ ] (No `remotes.d.ts` needed — `@cytoscape-web/api-types` declares every `cyweb/*` module)
- [ ] Run `npm install` in the copy
- [ ] Run `npm run dev` and open the install link it prints; nothing in the host repository is edited
- [ ] Add a design doc in `design/apps/<your-app-name>/README.md`
