# Project Overview — cytoscape-web-app-examples

## Purpose

Reference implementation and template repository for Cytoscape Web plugin apps built with Webpack Module Federation. Plugins extend the host app (`cytoscape-web`) with custom menu items and panel components.

## Tech Stack

- **Language:** TypeScript 5.6, React 18.3 (JSX transform — no `import React` needed)
- **Build:** Webpack 5 + Module Federation
- **UI:** @mui/material (singleton, provided by host)
- **Types:** @cytoscape-web/types (model types), @cytoscape-web/api-types (App API)
- **Workspace:** npm workspaces (5 sub-packages)

## Repository Structure

```
cytoscape-web-app-examples/
├── hello-world/        # Port 2222, federation name: hello
├── network-statistics/ # Port 3333, federation name: networkStatistics (non-React)
├── network-workflows/  # Port 7000, federation name: networkWorkflows
├── project-template/   # Port 5555, federation name: template
├── claude-bridge/      # Port 6100, federation name: claudeBridge (not published)
├── design/             # Design docs (specifications + per-app)
├── docs/               # GitHub Pages target (compiled JS bundles — do not add docs here)
├── CLAUDE.md           # Agent context — read first
├── .eslintrc.json      # Shared ESLint config
└── .prettierrc.json    # Shared Prettier config
```

## Host Relationship

- Host (`cytoscape-web`) runs on `localhost:5500`
- Plugins import from host via `cyweb/<ModuleName>` Module Federation remotes
- Plugin components are registered in host's `src/assets/apps.json` (prod) or `apps.local.json` (dev)
- Both repos must be on the same branch (`new-app-api`) for Phase 1 API features

## Each App Structure

```
<app>/
├── src/
│   ├── index.ts           # Entry point (exports app config)
│   ├── <App>App.tsx       # CyApp config object
│   ├── remotes.d.ts       # TypeScript declarations for cyweb/* MF modules
│   └── components/        # Menu and Panel React components
├── package.json
├── tsconfig.json
└── webpack.config.js      # Module Federation config
```
