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
- **Driving a host with Playwright: match the app catalog by its exact path.** To give a page an empty catalog, route only `pathname === '<base>apps.json'`. A pattern that matches any URL ending in `apps.json` also catches `/src/assets/apps.json?import`, a module a 1.1.1 dev server imports; answering it with JSON stops the host from ever becoming ready (`CyWebApi.whenReady` never appears).
- **A fresh host profile opens a welcome dialog and a cookie banner, and Escape closes neither.** Click "Explore on my own" and "Decline" before clicking the toolbar. The toolbar's "Apps" is not a `button` role: find it by its text.
- **A local host sends Google Analytics page views.** 1.1.0 sends them without consent. Abort requests to `google-analytics.com` and `google.com/g/collect` in any automated run.
- **Host 1.1.1 needs Node 24.22.1 or later, and enforces it.** Its `.npmrc` sets `engine-strict` and `engines` asks for `>=24.22.1`, while the parent directory's `mise.toml` may pin an older Node (24.21.0 on 2026-11-16). `mise exec node@24.22.1 -- npm ci` installs with the right Node without changing the pin. Start a host with `npx vite --host`, not `npm run dev`, when no browser window should open.
- **`@cytoscape-web/api-types` declares more types than it exports.** `VisualMappingFunction`, `ColorType`, `VisualPropertyValueType` and `ContinuousFunctionControlPoint` are in `dist/index.d.ts` and not in its export list, so importing them fails with TS2305. Check the `export { … }` line at the end of the file, and write or derive the shape instead.
- **`Math.min(...xs)` throws a `RangeError` past about 120,000 elements** (measured: 120,000 passes and 150,000 fails, in Node 24 and Chromium). Any array sized by a network goes through a loop, never a spread into a call. The host loads networks that large: `maxNetworkElementsThreshold` only picks the default layout.
- **The host's `Api.md` is not checked by the types.** Its `createContinuousMapping` example passes `'NODE_BACKGROUND_COLOR'`; the real name is `'nodeBackgroundColor'`, and only that compiles. Take names from the declarations, not from the prose.
- **Vite library mode resolves `build.lib.entry` against `root`.** A virtual entry id such as `virtual:entry` becomes `<root>/virtual:entry` and fails with `UNRESOLVED_ENTRY`. Give the plugin an absolute path under `root` to answer for (`cookbook/runner/run.mjs`).
- **`git checkout -- <path>` restores nothing in an untracked directory, and says so only on stderr.** Before a deliberate mutation of a new file, copy it aside and restore from the copy; then `cmp` the two.
- **A host write to a row that does not exist reports success and does nothing.** `setValue`/`setValues` only change existing rows, and an edge-list network (`createNetworkFromEdgeList`) has no edge rows. Read a value back after writing it in any case; `editRows` creates rows (and replaces them whole). Found by the `create-network-from-table` case, on 1.1.0 and 1.1.1.
- **A mapping keeps the default it copied when it was made.** `setDefault` afterwards does not change what mapped elements without a value show. Make the mapping again after changing the default.
- **Cases can check the canvas.** Both host releases publish their Cytoscape.js instance on `window.debug.cy` while debug is on; the runner turns debug on, and `ctx.rendered(id, property)` reads it. Use it for anything a style claim depends on: the store says what was asked, the canvas what happened.
- **In zsh, `>` will not overwrite an existing file (noclobber).** `git show HEAD:f > f` fails with "file exists" and leaves f as it was, so a "revert to the previous version" check silently tests the new one. Use `>|`, and `cmp` the file against its backup to confirm it changed.
- **A check of unbounded work can hang the runner.** Running a case against a version with an unbounded loop (Phase 2's 20,000-node selection) froze the page past the tool's timeout. Run such checks with `timeout`, and restore files from a backup taken before the run, not after it.
- **In zsh, a command in a variable is not split into words.** `C="git commit -q"; $C -m x` runs a program literally named `git commit -q`. Use a shell function, and `while read` (not `for t in $ids`) to loop over lines.
- **In zsh, `"$R:src/x"` applies the `:s` modifier to `$R`.** Write `"${R}:src/x"` when building `git show <rev>:<path>` arguments.
- **Validate orchestration JavaScript delimiters:** when wrapping a single tool call in `functions.exec`, check the closing `});` before execution; an extra parenthesis can fail an otherwise completed plan update.

## File Update Checklist (when host API changes)

When the host exposes a new `cyweb/XxxModule`:

1. Bump `@cytoscape-web/api-types` in the root and the apps (a `package.json` change: ask first) — it declares every `cyweb/*` module
2. Component files — update imports and usage
3. `npm run typecheck` and `npm run build` — verify no TS errors
