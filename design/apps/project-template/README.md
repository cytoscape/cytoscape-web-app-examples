# project-template — Design Document

## Overview

Boilerplate for creating new Cytoscape Web plugin apps. Contains the minimum viable structure with placeholder components.

| Property | Value |
|----------|-------|
| Federation name | `createNetwork` |
| Dev port | 5555 |
| App config file | `project-template/src/TemplateApp.tsx` |
| Host API phase | Phase 0 (no host API usage) |

## Components

| Component | File | Purpose |
|-----------|------|---------|
| `TemplatePanel` | `src/components/TemplatePanel.tsx` | Empty panel — replace with your implementation |

## How to Use This Template

See the "Create a New App" section in the root [`README.md`](../../../README.md#create-a-new-app) for step-by-step instructions.

## Design Intent

- **Minimal by design** — Only a panel component is included. Add menu components as needed.
- **`createNetwork` federation name** — This is a placeholder name. **Must be changed** before using as a real app.
- **Port 5555** — Placeholder port. **Must be changed** to avoid conflicts with other apps.

## Checklist When Cloning This Template

- [ ] Rename the directory to your app name
- [ ] Update `package.json` → `name`
- [ ] Update `webpack.config.js` → `DEV_SERVER_PORT`, `name`, `exposes`
- [ ] Rename `TemplateApp.tsx` and update app `id`, `name`, `description`
- [ ] Rename `TemplatePanel.tsx` and implement your component
- [ ] Update `src/remotes.d.ts` to add any `cyweb/*` modules you need
- [ ] Register the app in the host's `src/assets/apps.local.json`
- [ ] Add a design doc in `design/apps/<your-app-name>/README.md`
- [ ] Add the app to the port registry in `design/specifications/README.md`
