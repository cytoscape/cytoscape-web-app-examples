# Cytoscape Web App Project Template

This app is the boilerplate for third-party developers creating a new
Cytoscape Web App.

It is intentionally small, but it includes the patterns most apps need on day
one:

- a `CyAppWithLifecycle` app config
- both a panel component and a menu component
- a simple `NetworkApi` action example
- read patterns using `WorkspaceApi` and `TableApi`
- reactive refresh using `EventBus`

| Field                   | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| Federation name         | `createNetwork`                                      |
| Dev server port         | `5555`                                               |
| Entry point (local dev) | `createNetwork@http://localhost:5555/remoteEntry.js` |

## Run locally

```bash
# Terminal 1 — host app
cd ../cytoscape-web
npm install
npm run dev

# Terminal 2 — this template app
cd project-template
npm install
npm run dev
```

Open `http://localhost:5500`, enable the app from **Apps** → **App Settings**,
then:

- open the right-side panel to inspect the App API examples
- open the **Apps** menu and click `Create example network`

## Project structure

```text
project-template/
├── src/
│   ├── index.ts
│   ├── TemplateApp.tsx
│   └── components/
│       ├── TemplatePanel.tsx
│       └── TemplateMenuItem.tsx
├── webpack.config.js
├── tsconfig.json
└── package.json
```

## What the template demonstrates

### 1. App config with panel and menu

`src/TemplateApp.tsx` registers both UI surface types:

- `ComponentType.Panel` for the app panel area
- `ComponentType.Menu` for the Apps menu

The template uses `lazy()` inside the app config, so webpack only needs to
expose `./AppConfig`.

### 2. App API usage

`src/components/TemplatePanel.tsx` uses `useWorkspaceApi()` to read workspace
metadata, network lists, and network summaries, then calls
`switchCurrentNetwork()`.

Use this pattern when you want a stable, app-facing contract:

```tsx
const workspaceApi = useWorkspaceApi()
const result = workspaceApi.getWorkspaceInfo()

if (result.success) {
  console.log(result.data.networkCount)
}
```

In real apps, replace the example UI with your own rendering and error
handling. Always branch on `result.success` before reading `result.data`.

### 3. Menu-triggered actions

`src/components/TemplateMenuItem.tsx` uses `useNetworkApi()` and creates a
small example network with `createNetworkFromEdgeList()`.

This is the recommended menu pattern:

- perform one clear action
- use an App API where possible
- call `handleClose?.()` after success so the menu closes cleanly

### 4. Table API reads and EventBus refresh

The panel also shows a simple `TableApi.getRow()` example for the sample
network created by the menu item. It refreshes automatically with:

- `useCyWebEvent('network:created', ...)`
- `useCyWebEvent('network:deleted', ...)`
- `useCyWebEvent('network:switched', ...)`
- `useCyWebEvent('data:changed', ...)`

This is the recommended replacement for direct store subscriptions in external
apps: re-read through App APIs when the host emits a relevant event.

Pattern used in the template:

```tsx
const refreshSnapshot = useCallback(() => {
  const workspace = workspaceApi.getWorkspaceInfo()
  const networkList = workspaceApi.getNetworkList()
  const nodeRow = tableApi.getRow(networkId, 'node', '0')
}, [tableApi, workspaceApi])

useCyWebEvent('network:created', refreshSnapshot)
useCyWebEvent('network:switched', refreshSnapshot)
```

## Customization checklist

When turning this template into a real app, update these first:

1. Rename the package in `package.json`.
2. Change the Module Federation `name` and dev server port in `webpack.config.js`.
3. Update `id`, `name`, `description`, and `version` usage in `src/TemplateApp.tsx`.
4. Replace `TemplatePanel` and `TemplateMenuItem` with your actual UI.
5. Register the app in the host's `src/assets/apps.local.json` for local testing.

## Recommended development direction

- Prefer `cyweb/WorkspaceApi`, `cyweb/NetworkApi`, and the other App APIs for
  integration logic.
- Avoid `cyweb/*Store` imports in new external apps. They are deprecated.
- Keep React, ReactDOM, and MUI as shared singletons in webpack.
- Expose only `./AppConfig` unless you have a specific reason to use the legacy
  per-component expose pattern.
