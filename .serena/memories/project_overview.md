# Project Overview — cytoscape-web-app-examples

## Purpose

Reference implementation and template repository for Cytoscape Web plugin apps built with Module Federation (Vite). Plugins extend the host app (`cytoscape-web`) with custom menu items and panel components.

## Tech Stack

- **Language:** TypeScript 5.6, React 18.3 (JSX transform — no `import React` needed)
- **Build:** Vite 8 + @module-federation/vite (matching the host)
- **UI:** @mui/material (singleton, provided by host)
- **Types:** @cytoscape-web/types (model types), @cytoscape-web/api-types (App API)
- **Workspace:** npm workspaces (4 apps + 2 SDK packages)

## Repository Structure

```
cytoscape-web-app-examples/
├── hello-world/        # Port 2222, federation name: hello
├── network-statistics/ # Port 3333, federation name: networkStatistics (non-React)
├── network-workflows/  # Port 7000, federation name: networkWorkflows
├── project-template/   # Port 5555, federation name: template
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
- App API 1.0 is merged into the host's `development`; no feature branch is required

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
└── vite.config.ts         # Module Federation config
```
