# Developing Apps for _[Cytoscape Web](https://web.cytoscape.org/)_

- API version 1.0 beta: March 2026

> Reference implementations for Cytoscape Web app development

- [Live examples](https://cytoscape.org/cytoscape-web-app-examples/)
- [API types package (`@cytoscape-web/api-types`)](https://www.npmjs.com/package/@cytoscape-web/api-types)

## Introduction

This repository is for third-party developers who want to build apps for
[Cytoscape Web](https://web.cytoscape.org).

You do not need to change the host source code. Your app is loaded by the host
through Webpack Module Federation.

Apps can add:

- menu items in the **Apps** menu
- context menu actions for right-click workflows
- panel components in the right-side **App Panel**

## Quick Start

The cleanest way to try examples in this repository is to create a new directory and
clone both repositories into it.

### Recommended local workspace

```bash
mkdir cytoscape-web-dev
cd cytoscape-web-dev

git clone https://github.com/cytoscape/cytoscape-web.git
git clone https://github.com/cytoscape/cytoscape-web-app-examples.git
```

You should end up with this structure:

```text
cytoscape-web-dev/
├── cytoscape-web/
└── cytoscape-web-app-examples/
```

This keeps the host app and your example or third-party app projects side by
side, which makes local development simpler.

### What you need

- Node.js LTS
- the [Cytoscape Web](https://github.com/cytoscape/cytoscape-web) host repo
- the host running on `http://localhost:5500`

> **The public Cytoscape Web site loads apps from a curated allowlist.
> To publish your app there, contact the Cytoscape Web team after your app is
> ready.**

### 1. Run the example apps

```bash
npm install
npm run dev
```

This starts all example apps in this repository.

### 2. Run the host with the local app registry

```bash
# in the cytoscape-web host repo
npm install
npm run dev:local
```

This runs the host with `APPS_JSON=./src/assets/apps.local.json`.
`apps.local.json` already points to the local dev servers used by the example
apps, so you do not need to copy files manually.

### 3. Check that it works

1. Open `http://localhost:5500`.
2. Open **Apps** -> **App Settings**.
3. Enable one of the example apps.
4. Open the **Apps** menu or the right-side **App Panel**.

If you want the smallest starting point, enable the template app first.

---

## Build Your First App

The recommended path is to copy [project-template/](project-template/).

### 1. Copy the template

```bash
cp -r project-template my-app
cd my-app
```

### 2. Update the basic app identity

Update these files first:

- `package.json` for the npm package name and version
- `webpack.config.js` for the Module Federation `name` and dev server port
- `src/TemplateApp.tsx` for the app `id`, `name`, and `description`

The app `id` must match the Module Federation `name`.

### 3. Replace the starter UI

Start by replacing these files with your own code:

- `src/TemplateApp.tsx`
- `src/components/TemplatePanel.tsx`
- `src/components/TemplateMenuItem.tsx`

Keep the `src/index.ts` pattern:

```typescript
export { MyApp as default } from './MyApp'
```

### 4. Register the app in the host

Add your local app to the host file `src/assets/apps.local.json`:

```json
{ "name": "myApp", "url": "http://localhost:6000/remoteEntry.js" }
```

### 5. Verify in the browser

```bash
npm install
npm run dev
```

Then confirm all of these:

1. `http://localhost:6000/remoteEntry.js` loads.
2. Your app appears in **Apps** -> **App Settings**.
3. Your menu item or panel appears in the Cytoscape Web UI.

---

## App Structure

Most apps need only a few files:

```text
my-app/
├── src/
│   ├── index.ts
│   ├── MyApp.tsx
│   └── components/
│       ├── MyPanel.tsx
│       └── MyMenuItem.tsx
├── webpack.config.js
├── tsconfig.json
└── package.json
```

What each file does:

- `src/index.ts` exports your app config as the default export
- `src/MyApp.tsx` defines your `CyAppWithLifecycle` object
- `src/components/` contains your UI components
- `webpack.config.js` exposes your app to the host as `remoteEntry.js`
- `package.json` provides the app version and package metadata

The template app already uses this shape.

---

## The App Entry Point

Every app exports one `CyAppWithLifecycle` object.
This object tells the host what your app is called and which UI parts it adds.

```typescript
import { lazy } from 'react'
import { ComponentType, CyAppWithLifecycle } from '@cytoscape-web/api-types'
import packageJson from '../package.json'

const { version } = packageJson

export const MyApp: CyAppWithLifecycle = {
  id: 'myApp',
  name: 'My App',
  description: 'Short description of your app',
  version,
  apiVersion: '1.0',
  components: [
    {
      id: 'MyPanel',
      type: ComponentType.Panel,
      component: lazy(() => import('./components/MyPanel')),
    },
    {
      id: 'MyMenuItem',
      type: ComponentType.Menu,
      component: lazy(() => import('./components/MyMenuItem')),
    },
  ],
}
```

If you need app-level setup or cleanup, add optional `mount()` and `unmount()`
callbacks.

---

## Use the App API

New third-party apps should use the Cytoscape Web App API, not internal stores.

If you are building outside this repository, install the types package:

```bash
npm install --save-dev @cytoscape-web/api-types
```

Then add it to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@cytoscape-web/api-types"]
  }
}
```

### Main APIs

| API              | Import                 | Use it for                     |
| ---------------- | ---------------------- | ------------------------------ |
| `ElementApi`     | `cyweb/ElementApi`     | nodes and edges                |
| `NetworkApi`     | `cyweb/NetworkApi`     | creating and deleting networks |
| `SelectionApi`   | `cyweb/SelectionApi`   | current selection              |
| `ViewportApi`    | `cyweb/ViewportApi`    | zoom, pan, fit                 |
| `TableApi`       | `cyweb/TableApi`       | node and edge tables           |
| `VisualStyleApi` | `cyweb/VisualStyleApi` | style changes                  |
| `LayoutApi`      | `cyweb/LayoutApi`      | layouts                        |
| `ExportApi`      | `cyweb/ExportApi`      | export                         |
| `WorkspaceApi`   | `cyweb/WorkspaceApi`   | workspace and current network  |

All API methods return `ApiResult<T>`.
Always check `result.success` before reading `result.data`.

```typescript
import { useNetworkApi } from 'cyweb/NetworkApi'

export const MyMenuItem = () => {
  const networkApi = useNetworkApi()

  const handleClick = () => {
    const result = networkApi.createNetworkFromEdgeList({
      name: 'My Example Network',
      edgeList: [['A', 'B', 'interacts-with']],
      addToWorkspace: true,
    })

    if (!result.success) {
      return
    }
  }

  return <button onClick={handleClick}>Run action</button>
}
```

---

## Events and Non-React Access

Use `useCyWebEvent` inside React components when your UI needs to refresh after
host changes.

Common events include:

- `network:created`
- `network:deleted`
- `network:switched`
- `selection:changed`
- `data:changed`

Outside React, the same APIs are available through `window.CyWebApi`, and you
can listen with `window.addEventListener(...)`.

---

## UI Extension Points

![App UI Screenshot](docs/images/app-overview-ui.png)

### Menu items

Use menu items for clear actions such as importing data, creating a network, or
opening another tool.

Menu components receive `handleClose`, which should usually be called after the
action succeeds.

### Context menu actions

Use context menu actions when the action depends on what the user right-clicked.
Examples include node-specific, edge-specific, or canvas-specific actions.

Keep these actions short and focused.

### Panel components

Use panels for richer UI, status displays, forms, and multi-step workflows.

Panels are a good place to show data from `WorkspaceApi`, `TableApi`, and
`SelectionApi`.

---

## Which Example to Read

| Example                                  | Best for                                                   |
| ---------------------------------------- | ---------------------------------------------------------- |
| [project-template/](project-template/)   | your first app and the smallest starting point             |
| [hello-world/](hello-world/)             | full app lifecycle, multiple APIs, and event handling      |
| [network-workflows/](network-workflows/) | menu-driven workflows, CX2 import, and Jupyter integration |

Recommended order:

1. [project-template/](project-template/)
2. [hello-world/](hello-world/)
3. [network-workflows/](network-workflows/)

---

## Troubleshooting

### My app does not appear in the host

Check these first:

1. The host is running on `localhost:5500`.
2. Your app dev server is running.
3. The app is listed in the host `apps.local.json`.
4. The app is enabled in **Apps** -> **App Settings**.

### `remoteEntry.js` loads, but the app still does not show up

The most common cause is a name mismatch.

Make sure these values match:

- the Module Federation `name` in `webpack.config.js`
- the app `id` in your `CyAppWithLifecycle` object

### TypeScript cannot find the Cytoscape Web types

Install `@cytoscape-web/api-types` and add it to the `types` field in
`tsconfig.json`.

---

## Development Commands

```bash
# run all example apps
npm run dev

# run one example app
npm run dev:hello-world
npm run dev:network-workflows
npm run dev:project-template

# build all example apps
npm run build

# build and copy to docs/
npm run deploy
```

You can also use the VS Code task **Start Both Dev Servers**.

---

## Advanced Example

If your app needs to talk to another browser app, you can use `postMessage`.
See [network-workflows/](network-workflows/) for the Jupyter integration
example.

---

## Deprecated APIs

Older examples used direct store imports. They still work, but new third-party
apps should use the App API instead.

| Deprecated pattern         | Recommended replacement |
| -------------------------- | ----------------------- |
| `useWorkspaceStore`        | `useWorkspaceApi`       |
| `useNetworkStore`          | `useNetworkApi`         |
| `useTableStore`            | `useTableApi`           |
| `useVisualStyleStore`      | `useVisualStyleApi`     |
| `useCreateNetworkWithView` | `useNetworkApi`         |
| `useCreateNetworkFromCx2`  | `useNetworkApi`         |

Using the App API keeps your app aligned with the public integration contract.
