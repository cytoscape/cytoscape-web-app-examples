# Cytoscape Web App Template

This directory is the smallest starting point for a new Cytoscape Web app.

For full setup instructions, App API details, and local development workflow,
see the repository root [README.md](../README.md).

## What is in this template

- a minimal `CyAppWithLifecycle` app config
- one panel component
- one menu component
- a simple example action using the public App API
- a minimal context menu example for the canvas

| Field           | Value                                                |
| --------------- | ---------------------------------------------------- |
| Federation name | `createNetwork`                                      |
| Dev server port | `5555`                                               |
| Entry point     | `createNetwork@http://localhost:5555/remoteEntry.js` |

## Files to edit first

When you copy this template, update these files first:

1. `package.json`
2. `webpack.config.js`
3. `src/TemplateApp.tsx`
4. `src/components/TemplatePanel.tsx`
5. `src/components/TemplateMenuItem.tsx`

## Minimal structure

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

## What each file does

- `src/index.ts` exports the app config as the default export.
- `src/TemplateApp.tsx` defines the app id, name, version, and registered components.
- `src/components/TemplatePanel.tsx` is a minimal panel that shows the workspace name.
- `src/components/TemplatePanel.tsx` also includes a minimal context menu example.
- `src/components/TemplateMenuItem.tsx` is a simple menu action example.
- `webpack.config.js` defines the Module Federation name, port, and exposed modules.

## Copy and rename

```bash
cp -r project-template my-app
cd my-app
```

After copying, make these changes:

1. Rename the package in `package.json`.
2. Change the Module Federation `name` and dev server port in `webpack.config.js`.
3. Change the app `id`, `name`, and `description` in `src/TemplateApp.tsx`.
4. Replace the placeholder panel and menu with your own UI.

To try the context menu example, open the template panel and click
`Register Context Menu Item`, then right-click the canvas background.

The app `id` must match the Module Federation `name`.

## Notes

- Prefer the public App API such as `cyweb/WorkspaceApi` and `cyweb/NetworkApi`.
- Avoid `cyweb/*Store` imports in new third-party apps.
- Keep the template small. Use [hello-world/](../hello-world/) if you need a fuller reference.
