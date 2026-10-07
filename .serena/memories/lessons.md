# Agent Lessons — cytoscape-web-app-examples

Shared lessons learned across agent sessions. Update this file after corrections or unexpected failures.

## Module Federation

- **Shared singletons are mandatory:** all FIVE of `react`, `react-dom`, `@mui/material`, `@emotion/react` and `@emotion/styled` must be in the `shared` block of `vite.config.ts`, with `import: false`. Miss React and hooks break outright; miss Emotion and MUI silently gets a second cache (duplicated styles, host theme ignored).
- **Import MUI from the root barrel, never a subpath.** Share keys match exactly and MUI subpaths are not in the plugin's known-subpath list, so `@mui/material/Box` bundles MUI into the app instead of resolving the host's. React works either way, which is why this hides. `npm run check:imports` enforces it.
- **`type: 'module'` on the `cyweb` remote is required** and fails silently when missing — the plugin default (`'var'`) resolves no exports against the host's ESM entry.
- **`cyweb/*` types come from `@cytoscape-web/api-types`**, which declares every exposed module. There is no per-app declaration file to write or keep in sync; list the package in each tsconfig's `types`.
- **Ports are unique per app, and each app's port lives in the `cyweb` block of its `package.json`** — the one source the dev server, `defineCyWebApp` and the install manifest read. Check the other apps' blocks before choosing one.
- **Leave `base` unset** in `vite.config.ts`: the MF plugin then resolves `publicPath: 'auto'`, so chunks resolve relative to `remoteEntry.js` wherever it is deployed.

## Host API Integration

- **App API is on the host's `development` branch.** The `cyweb/XxxApi` hooks (ElementApi, NetworkApi, etc.) were once confined to a `new-app-api` feature branch; that is no longer true and both repos track `development`.
- **`ApiResult<T>` pattern:** All host App API functions return `ApiResult<T>`. Always check `result.success` before accessing `result.data`. Never assume success.
- **Use the `cyweb/*Api` hooks, not the `cyweb/*Store` exposes.** The stores are legacy (README "Deprecated APIs"): they return raw state rather than `ApiResult`, skip the API's validation, and their state shapes are not part of the published contract.

## Release

- **A registry wait that times out after a publish is usually the registry being slow, not the publish failing.** On 2026-10-07 the packument showed the old version for over 5 minutes. Check `npm view <pkg> dist-tags`; if the version is there, use **Re-run failed jobs** — the decide step skips already-published versions, so nothing is republished. See `design/specifications/app-sdk/phase6-release-runbook.md` §3f.
- **No apostrophes inside a workflow's `node -e '…'` script.** The script is single-quoted for the shell, so `step's` ends the quote and breaks the whole `run` block — and only a real (not dry) release reaches the read-back and smoke steps. Extract the `run` blocks and check each with `bash -n` before merging a workflow change.

## Build & Tooling

- **No `import React from 'react'`:** The project uses `react-jsx` transform. Adding this import causes duplicate React errors.
- **No `console.log`:** Remove before committing. Use `debug` logger if in the host; for plugin code just remove the log.
- **`npm run dev` starts all apps:** It uses `concurrently`. Individual apps can be run with `npm run dev:<app-name>`.
- **Build output goes to `dist/`:** The `npm run deploy` script copies `dist/` to `docs/<app-name>/` for GitHub Pages.
- **Do not assume local formatter binaries are installed:** Check for `node_modules/.bin/prettier` before using it for documentation-only validation; when dependencies are absent, use repository-independent structural checks rather than installing packages just to validate Markdown.
- **Keep sibling-repository searches separate:** `cytoscape-web-app-examples` has package-local tests and scripts, while host types and tests live under the sibling `cytoscape-web` repository. Set the matching worktree for each `rg` command instead of passing paths from both layouts to one search.
- **`app-runtime`'s `manifestCommand.test.ts` fails on macOS's default `TMPDIR`:** `/var/folders/…` sits under the `/var → /private/var` symlink, and `cyweb-app manifest --out` refuses to write through a symlink, so six `--out` tests exit 1. Not a regression — run with a real-path `TMPDIR` (e.g. under `/private/tmp`) and all pass.
- **Never `npm pack` a workspace from more than one test file.** `npm pack` runs prepack, which rebuilds `dist/` in place, and Vitest runs files in parallel — two packers race over the same `dist/` (app-runtime's CI failed once this way). Pack once in a Vitest `globalSetup` and `inject()` the tarball, as `packages/app-runtime/test/globalSetup.ts` does. And pack with `--loglevel=error`, not `--silent`, which also swallows npm's own error.
- **Validate orchestration JavaScript delimiters:** when wrapping a single tool call in `functions.exec`, check the closing `});` before execution; an extra parenthesis can fail an otherwise completed plan update.

## File Update Checklist (when host API changes)

When the host exposes a new `cyweb/XxxModule`:

1. Bump `@cytoscape-web/api-types` in the root and the apps (a `package.json` change: ask first) — it declares every `cyweb/*` module
2. Component files — update imports and usage
3. `npm run typecheck` and `npm run build` — verify no TS errors
