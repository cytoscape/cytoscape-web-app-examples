# Agent Lessons — cytoscape-web-app-examples

Shared lessons learned across agent sessions. Update this file after corrections or unexpected failures.

## Module Federation

- **Shared singletons are mandatory:** If `react`, `react-dom`, or `@mui/material` are missing from the `shared` section in `webpack.config.js`, the plugin will load its own copy and break React context (hooks won't work).
- **`remotes.d.ts` must stay in sync:** Any `cyweb/XxxModule` import used in source code must have a `declare module 'cyweb/XxxModule'` entry in `remotes.d.ts`, or TypeScript will error at build time.
- **Templates need their own `remotes.d.ts`:** The `project-template` app does not inherit remote module declarations automatically. If you add `cyweb/*` imports to the template, create or update `project-template/src/remotes.d.ts` in the same change.
- **Port conflicts:** Each plugin must use a unique dev server port. Current assignments: hello-world=2222, simple-menu=3333, simple-panel=4001, project-template=5555. Check before assigning a new port.
- **`publicPath: 'auto'`** must be set in webpack output to enable dynamic URL resolution for the remote entry.

## Host API Integration

- **App API is on `new-app-api` branch only:** The `cyweb/XxxApi` hooks (ElementApi, NetworkApi, etc.) are not available on the main `development` branch of the host. Both repos must be on `new-app-api`.
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
