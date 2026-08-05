# Agent Lessons — cytoscape-web-app-examples

Shared lessons learned across agent sessions. Update this file after corrections or unexpected failures.

## Module Federation

- **Shared singletons are mandatory:** all FIVE of `react`, `react-dom`, `@mui/material`, `@emotion/react` and `@emotion/styled` must be in the `shared` block of `vite.config.ts`, with `import: false`. Miss React and hooks break outright; miss Emotion and MUI silently gets a second cache (duplicated styles, host theme ignored).
- **Import MUI from the root barrel, never a subpath.** Share keys match exactly and MUI subpaths are not in the plugin's known-subpath list, so `@mui/material/Box` bundles MUI into the app instead of resolving the host's. React works either way, which is why this hides. `npm run check:imports` enforces it.
- **`type: 'module'` on the `cyweb` remote is required** and fails silently when missing — the plugin default (`'var'`) resolves no exports against the host's ESM entry.
- **`remotes.d.ts` must stay in sync:** Any `cyweb/XxxModule` import used in source code must have a `declare module 'cyweb/XxxModule'` entry in `remotes.d.ts`, or TypeScript will error at build time.
- **Templates need their own `remotes.d.ts`:** The `project-template` app does not inherit remote module declarations automatically. If you add `cyweb/*` imports to the template, create or update `project-template/src/remotes.d.ts` in the same change.
- **Port conflicts:** Each plugin must use a unique dev server port. Current assignments: hello-world=2222, simple-menu=3333, simple-panel=4001, project-template=5555. Check before assigning a new port.
- **Leave `base` unset** in `vite.config.ts`: the MF plugin then resolves `publicPath: 'auto'`, so chunks resolve relative to `remoteEntry.js` wherever it is deployed.

## Host API Integration

- **App API is on the host's `development` branch.** The `cyweb/XxxApi` hooks (ElementApi, NetworkApi, etc.) were once confined to a `new-app-api` feature branch; that is no longer true and both repos track `development`.
- **`ApiResult<T>` pattern:** All host App API functions return `ApiResult<T>`. Always check `result.success` before accessing `result.data`. Never assume success.
- **Store access pattern:** Host stores are consumed via Zustand selector hooks: `const value = useXxxStore((state: any) => state.field)`. The `any` cast is intentional — plugin types for state are not always available.

## Build & Tooling

- **No `import React from 'react'`:** The project uses `react-jsx` transform. Adding this import causes duplicate React errors.
- **No `console.log`:** Remove before committing. Use `debug` logger if in the host; for plugin code just remove the log.
- **`npm run dev` starts all apps:** It uses `concurrently`. Individual apps can be run with `npm run dev:<app-name>`.
- **Build output goes to `dist/`:** The `npm run deploy` script copies `dist/` to `docs/<app-name>/` for GitHub Pages.

## File Update Checklist (when host API changes)

When the host exposes a new `cyweb/XxxModule`:

1. `<app>/src/remotes.d.ts` — add `declare module 'cyweb/XxxModule'`
2. Component files — update imports and usage
3. `npm run build` — verify no TS errors
