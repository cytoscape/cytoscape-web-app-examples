# Implementation Checklist — Webpack → Vite Migration

> Track progress across all eight phases. Mark `[x]` when complete. Run the
> per-phase verification before starting the next phase.
>
> **Phases are strictly ordered.** Phase 2 must be *deployed to production*
> before Phase 4 publishes anything, and nothing Webpack-breaking happens
> outside the app that is currently migrating.

_Design: [vite-migration.md](vite-migration.md) — full rationale, measurements, and the reasoning behind every decision below. Section references (§) point into it._

**Format note:** the host repo uses one checklist file per phase
(`cytoscape-web/docs/design/module-federation/checklists/`). This migration
keeps all phases in one file because Phases 4–6 are the same procedure applied
to five apps — the shared block is defined once in **Phase 4** and referenced
by 5 and 6.

**Repository note:** unless a step says otherwise, paths are relative to
`cytoscape-web-app-examples/`. Steps in the **host** repo are prefixed
`cytoscape-web/`.

---

## Phase 1: Decide, then act on the decisions

_Design: §7.1, §7.5, §8_

No migration work happens here. The point is to close the questions that would
otherwise be discovered mid-flight and change the shape of everything after.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `package.json` | `workspaces`, `copy-dist` — the built vs published sets |
| `.github/workflows/deploy-pages.yml` | The other built vs published set; they disagree |
| `patterns/webpack.config.js`, `patterns/src/` | The delete/keep decision |
| `cytoscape-web/src/assets/apps.json` | Canonical published URL |
| `package-lock.json` | `@cytoscape-web/api-types` resolved version |

### Deliverables — decisions (write them down)

- [ ] **Canonical published URL** confirmed as
      `https://cytoscape.org/cytoscape-web-app-examples/` (host `apps.json` and
      this repo's `README.md` both use it)
- [ ] **Built set** decided — which apps are npm workspaces
- [ ] **Published set** decided — which apps are copied into `docs/`.
      Today the workflow copies 4 and `copy-dist` copies 5; pick one answer
- [ ] **`patterns/` decision** recorded (§7.5 recommends delete)

### Deliverables — actions

- [ ] Delete `patterns/` (or, if kept, file a separate issue — do **not** carry
      it into Phase 3 unresolved)
- [ ] Bump `@cytoscape-web/api-types` to the host's published version
      (`1.0.0-beta.3`) **in `package.json`**
- [ ] Run `npm install` and **commit the updated `package-lock.json`** — the
      lockfile currently pins `beta.2`; a range change alone does not move it

### Verification (Phase 1)

- [ ] `npm ci` completes cleanly
- [ ] `node -e "console.log(require('./package-lock.json').packages['node_modules/@cytoscape-web/api-types'].version)"` prints the host's version
- [ ] `npm run build` still succeeds for every remaining app (Webpack)
- [ ] No open "which app / which URL" question remains

---

## Phase 2: Host repository

_Design: §6.3, §8 (release gate), §11.2, §11 step 11a_

**Everything here is in `cytoscape-web/`.** This phase ends with the descriptor
live in production — not merely merged.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `cytoscape-web/src/boot/bootstrap.tsx` | Where the descriptor is published |
| `cytoscape-web/src/app-api/federation/federationExposes.ts` | `FEDERATION_NAME`, `FEDERATION_FILENAME`; **no change needed** to the shared list (§5.8) |
| `cytoscape-web/src/features/AppManager/ExternalComponent.tsx` | Imports MF runtime by name; still a transitive dependency |
| `cytoscape-web/test/fixtures/remote-app/vite.config.ts` | No `remotes`, no `runtimePlugins` today |
| `cytoscape-web/package.json` | `verify:federation` script; `@module-federation/runtime` missing from deps |
| `cytoscape-web/.github/workflows/ci.yml` | Build job — where `verify:federation` must run |

### Deliverables — host descriptor

- [ ] Create `cytoscape-web/src/app-api/federation/hostDescriptor.ts`:
  - `APP_API_VERSION` constant
  - `CyWebHostDescriptor` interface — `readonly name: 'cyweb'` (literal, not
    `string`), `readonly remoteEntry: string`, `readonly apiVersion: string`
  - `declare global { interface Window { readonly __CYWEB_HOST__?: CyWebHostDescriptor } }`
  - `buildHostRemoteEntryUrl(base, href, filename)` — **pure helper**, exported
- [ ] Modify `cytoscape-web/src/boot/bootstrap.tsx` — publish
      `window.__CYWEB_HOST__` **synchronously** in the boot chunk via
      `Object.defineProperty(… { writable: false, configurable: false })` with an
      `Object.freeze`d value, calling `buildHostRemoteEntryUrl()`
  - Must **not** go on `window.CyWebApi` (async import, gated behind
    `cywebapi:ready`)
- [ ] Create `cytoscape-web/src/app-api/federation/hostDescriptor.test.ts`
      (§11 step 11a):
  - `buildHostRemoteEntryUrl('/', 'https://h/y/z', 'remoteEntry.js')` → `https://h/remoteEntry.js`
  - `buildHostRemoteEntryUrl('/cytoscape/', 'https://h/y/z', 'remoteEntry.js')` → `https://h/cytoscape/remoteEntry.js`
  - Descriptor is frozen and the property is non-writable/non-configurable

### Deliverables — host dependencies and CI

- [ ] Add `@module-federation/runtime` (`2.5.1`) to `cytoscape-web/package.json`
      `devDependencies` — `ExternalComponent.tsx` imports it by name while it is
      only transitive today
- [ ] Add `npm run verify:federation` to the CI **build job, immediately after
      `npm run build`** (a separate job has no `dist/`)

### Deliverables — E2E fixture (remote → host direction)

- [ ] Create `cytoscape-web/test/fixtures/remote-app/cywebHostSentinel.ts` —
      same sentinel **string** the examples will use (§6.4)
- [ ] Create `cytoscape-web/test/fixtures/remote-app/mfRuntimePlugin.ts` —
      mirrors §6.4: local structural type (generic `beforeInit`), writes **both**
      `userOptions.remotes` and `options.remotes`, validates `name` + URL,
      throws on sentinel
- [ ] Create `cytoscape-web/test/fixtures/remote-app/cyweb.d.ts` — fixture-local
      minimal declaration. **Match the real API**: `WorkspaceInfo.workspaceId`
      (not `id`), and `ApiResult` is a discriminated union, not
      `success: boolean` + optional `data`
- [ ] Modify `cytoscape-web/test/fixtures/remote-app/vite.config.ts`:
  - `remotes: { cyweb: { type: 'module', name: 'cyweb', entry: <sentinel>, entryGlobalName: 'cyweb', shareScope: 'default' } }`
  - **`runtimePlugins: [<absolute, normalized path to the resolver>]`** — copying
    the resolver without registering it leaves it inert and the test "passes"
    while exercising nothing
- [ ] Modify `cytoscape-web/test/fixtures/remote-app/AppConfig.tsx` — call
      `useWorkspaceApi().getWorkspaceInfo()` at **runtime** (not `import type`)
      and render `workspaceId` into the DOM
- [ ] Extend `cytoscape-web/test/playwright/remote-app-load.spec.ts` — assert the
      rendered `workspaceId` **value**, not merely that an element exists

### Deliverables — preflight (host-side)

- [ ] Add a Playwright check for the full **§8 descriptor contract**:
      `name === 'cyweb'`; `remoteEntry` absolute `http(s)`; non-empty
      `apiVersion`; `Object.isFrozen()` + property descriptor; JS MIME type;
      `await import(url)` yields `init`/`get` as functions
- [ ] Use `page.waitForFunction(fn, undefined, { timeout })` — **options is the
      third parameter**; `index.tsx` dynamically imports `bootstrap`, so the
      descriptor is not present at `load`

### Deliverables — deployment

- [ ] Deploy the host to production (`web.cytoscape.org`)

### Verification (Phase 2)

- [ ] `npm run lint` passes (host)
- [ ] `npm run test:unit` passes (host), including the new `hostDescriptor` tests
- [ ] `npm run build` + `npm run verify:federation` pass (host)
- [ ] `npx playwright test remote-app-load --project=chromium` passes — the
      remote→host direction is now covered
- [ ] **The full §8 descriptor contract passes against `web.cytoscape.org`**,
      deployed, not merely merged

---

## Phase 3: Scaffolding only

_Design: §7.1, §8, §11.0, §12_

**Nothing in this phase may touch an unmigrated app.** Adding `noEmit` to the
app tsconfigs would break `ts-loader`; enabling the Vite verifier repo-wide
would fail every Webpack bundle by construction. All five apps still build with
Webpack at the end of this phase.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `package.json` | Root deps and scripts |
| `.github/workflows/deploy-pages.yml` | Hardcoded `rm -rf` / `cp -r`; Node 22 |
| `*/package.json` (5 apps) | No `typecheck` script exists yet |
| `guides/getting-started.md` | "Node.js 18+" |

### Deliverables — dependencies (add only, remove nothing)

- [ ] `vite` — `8.0.13` (match host)
- [ ] `@module-federation/vite` — `1.16.8` (match host)
- [ ] `@module-federation/runtime` — `2.5.1` (§6.4 imports it by name)
- [ ] `@vitejs/plugin-react` — match host (`^5.0.0`)
- [ ] `@types/node` — pin explicitly (currently only transitive via `webpack-dev-server`)
- [ ] `vitest` — match host (`^4.1.8`)
- [ ] `@playwright/test` — `1.61.0` (match host)
- [ ] **Do not remove** `webpack`, `webpack-cli`, `webpack-dev-server`,
      `ts-loader`, `clean-webpack-plugin` — that is Phase 7

### Deliverables — manifest and tooling

- [ ] Create `apps.manifest.json` — one entry per app with `workspaceDir`,
      `publishPath`, `federationName`, `port`, `bundler`, `published`,
      `exposes`, `smokeObservable`, `configuredShared`
  - All five entries start at `"bundler": "webpack"`
  - `workspaceDir`, `publishPath` and `federationName` are **three different
    strings** (`hello-world` / `hello-world` / `hello`)
  - `configuredShared` holds **full records**, not a name list;
    `network-statistics` is explicitly `{}`
- [ ] Create `scripts/manifest.mjs` — the single loader, with validations:
  - `workspaceDir` set equals the root `workspaces` set, **both directions**
  - `workspaceDir`, `publishPath`, `federationName`, `port` each unique
  - `publishPath` rejects `""`, `.`, `..`, and any `/` or `\`
  - `publishPath` not in the reserved set `{data, images, index.html}`
  - `dirname(resolved) === docsRoot && resolved !== docsRoot`
  - Strict schema: unknown fields rejected, `bundler` enum, no duplicate `exposes`
  - `smokeObservable` required when `published === true`
  - `requiredVersion` cross-checked against `peerDependencies` — **`bundler: 'vite'` entries only**
  - An app removed from the manifest is an **error**, not a cleanup trigger
- [ ] Create `scripts/verify-federation-build.mjs` (§11.0) — run per app,
      gated on `bundler === 'vite'`:
  - `remoteEntry.js` is an ES module exporting `init` and `get`
  - Container name equals `federationName`
  - Every expected expose present
  - **Configured** shared records exactly equal `configuredShared`
  - **Effective** shared keys ⊇ configured, extras within
    `DERIVED_SHARED_ALLOWLIST` (a named constant: `react/jsx-runtime`,
    `react/jsx-dev-runtime`, `react-dom/client`)
  - `cyweb` remote present with `type: 'module'`
  - `cyweb` entry equals `CYWEB_HOST_REQUIRED` exactly (production build)
  - `cyweb-host-resolver` present **in the built bundle**, not only in the manifest
- [ ] Create `scripts/check-imports.mjs` — bans `@mui/material/` subpaths and
      `@mui/icons-material` in `<workspaceDir>/src`. Match **import/export
      specifiers**, not raw text. Gated on `bundler === 'vite'` (inert now)
- [ ] Rewrite `copy-dist` around the manifest — iterate `published === true`,
      **delete then copy**, validate all entries before deleting anything, stage
      into a temp directory and swap
  - `bundler: 'webpack'` → replace-copy the whole `dist/`, no class check
  - `bundler: 'vite'` → the §8 exclusive publish classes, unknown files fatal
- [ ] Create `scripts/preflight-host.mjs` — `npm run preflight:host <url>`,
      running the full §8 descriptor contract

### Deliverables — per-app scripts (against the **existing** tsconfigs)

- [ ] Add `"typecheck": "tsc --noEmit -p tsconfig.json"` to all five apps.
      **Do not** add `noEmit` to the tsconfig files themselves — that breaks
      `ts-loader`

### Deliverables — CI and Node version

- [ ] Create the PR CI workflow with the fixed §8 job table:
  - `check:imports` — `bundler === 'vite'` apps
  - `typecheck` — always all five
  - `build` + verifier — build always; **verifier step gated on `bundler`**;
    both in the **same job** (`dist/` does not cross a job boundary)
  - `test` — `npm run test --workspaces --if-present`
- [ ] Point `deploy-pages.yml` at `npm run copy-dist` instead of its hardcoded
      `rm -rf` / `cp -r` lines
- [ ] Add `npx playwright install --with-deps chromium` + the production-host
      preflight step to `deploy-pages.yml`
- [ ] `node-version: '22'` → `'24'` in the workflow
- [ ] Add `"engines": { "node": ">=24.0.0" }` to the root `package.json`
- [ ] Add `.nvmrc` with `24`
- [ ] Update `guides/getting-started.md` — "Node.js 18+" → 24

### Verification (Phase 3)

- [ ] `npm install` clean
- [ ] `node scripts/manifest.mjs --validate` passes
- [ ] **All five apps still build with Webpack** (`npm run build`)
- [ ] `npm run typecheck --workspaces` passes against the existing tsconfigs
- [ ] `npm run deploy` produces the **same** `docs/` output as before the rewrite
      (diff it)
- [ ] `npm run preflight:host https://web.cytoscape.org` passes
- [ ] PR CI green

---

## Phase 4: `project-template` pilot

_Design: §5.1–§5.8, §6.4, §7.2–§7.6, §11_

Deliberately one app. Everything unknown becomes verified fact here before the
pattern is replicated four times.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `project-template/webpack.config.js` | The config being replaced |
| `project-template/package.json` | Declares **no dependencies** today |
| `project-template/tsconfig.json` | `typeRoots` points at a directory that does not exist |
| `project-template/src/components/*.tsx` | MUI subpath imports to rewrite |
| `cytoscape-web/test/fixtures/remote-app/` | The Phase 2 resolver this must be equivalent to |
| `cytoscape-web/src/assets/apps.local.json` | Has **no** `template` entry |

### Deliverables — the per-app migration block

> **Phases 5 and 6 repeat this block.** Only the app-specific values differ.

**New files**

- [ ] `src/cywebHostSentinel.ts` — `export const CYWEB_HOST_REQUIRED = 'cyweb:__CYWEB_HOST_REQUIRED__'`
- [ ] `src/mfRuntimePlugin.ts` (§6.4):
  - Local structural type, **generic** `beforeInit: <T extends BeforeInitArgs>(args: T) => T`
    (a non-generic signature drops `origin`/`shareInfo` → TS2322)
  - **No** import from `@module-federation/runtime` — its types reach `webpack`
  - `readHostEntry()` validates `name === 'cyweb'`, non-empty, absolute `http(s)`
  - Writes **both** `userOptions.remotes` and `options.remotes`
  - Throws on the sentinel with the pinned "missing or invalid" message
- [ ] `test/mfRuntimePlugin.test.ts` — **outside `src/`**, against a **real
      `ModuleFederation` instance**:
  - First init (populated `userOptions.remotes`, empty `options.remotes`)
  - Re-init (populated `options.remotes`)
  - Descriptor absent, dev build → entry untouched
  - Malformed descriptor, production build → parameterized: absent, `name`
    missing, `name` wrong, empty URL, relative URL, non-HTTP scheme
- [ ] `index.html` — the §5.3 remote-only stub
- [ ] `vite.config.ts` (§5.5) containing:
  - `normalizePath(fileURLToPath(...))` for the runtime-plugin path
  - `CONFIGURED_RUNTIME_PLUGINS` constant; federation receives a **spread copy**
  - `CYWEB_REMOTE` constant with `type: 'module'` and the
    `command === 'serve' ? localhost : CYWEB_HOST_REQUIRED` entry
  - `CONFIGURED_SHARED` with full records, **exact** keys (no trailing slash),
    `import: false`, explicit `requiredVersion`
  - `manifest.additionalData` embedding `configuredShared`, `configuredRemote`,
    `configuredRuntimePlugins`
  - `noSharedPayload()` plugin **after** `federation()`, `apply: 'build'`,
    `enforce: 'post'`, **namespace prefixes** (`/node_modules/@mui/` etc.)
  - `base` **not set**; `build.target: 'esnext'`; `server` port/strictPort/origin/headers
- [ ] `tsconfig.node.json` — `vite.config.ts`, `types: ["node"]`, `skipLibCheck: true`
- [ ] `tsconfig.test.json` — `test/**/*`, `skipLibCheck: true`

**Modified files**

- [ ] `tsconfig.json` — `moduleResolution: "bundler"`, `isolatedModules`,
      `noEmit`, `lib: ["ESNext","DOM","DOM.Iterable"]`, `types: ["@cytoscape-web/api-types"]`,
      **`typeRoots` deleted**, `skipLibCheck` **false**
- [ ] `package.json` — self-contained `dependencies` / `peerDependencies` /
      `devDependencies` with **concrete versions**, `engines`, and scripts:
      `build`, `dev`, `typecheck` (all three configs), `test`
- [ ] All `@mui/material/X` imports → root barrel `import { X } from '@mui/material'` (§5.8)
- [ ] **Delete** `webpack.config.js`

**Manifest**

- [ ] Flip this app's `bundler` to `'vite'` — **in the same commit** as its
      `peerDependencies` and `vite.config.ts`

### Deliverables — pilot-only

- [ ] Add a `template` entry to `cytoscape-web/src/assets/apps.local.json`
      (id `template`, port 5555) — it does not exist today
- [ ] Add the gate's own fixtures: positive (root barrel) and **three** negative
      (`@mui/material/Box`, `@mui/icons-material/Home`, **`@mui/utils`**)
- [ ] Record the §5.7 A-vs-B measurement (transferred bytes, both ways)
- [ ] Record the §5.8 measurement and confirm the root-barrel result
- [ ] Make the §8 SSR decisions from the pilot's **real** output:
      Decision A (absolute build-machine paths in `remoteEntry.js`) and
      Decision B (publish the SSR files or not) — they are **independent**
- [ ] Record the pilot's actual emitted file set and encode it as the publish set

### Verification (Phase 4)

- [ ] §11 step 1 — `npm run typecheck` passes (all three configs)
- [ ] §11 step 2 — `npm run build` emits `dist/remoteEntry.js`
- [ ] §11 step 3 — `npm run verify:federation` passes
- [ ] §11 step 4 — `npm run dev` serves on 5555; `curl -I` → 200 with
      `Access-Control-Allow-Origin: *`
- [ ] §11 step 5 — loads in the host from `apps.local.json`, mounts, panel renders
- [ ] §11 step 6 — MUI styles correct, no duplicate-Emotion warning
- [ ] §11 step 9 — a **production** build (carrying the sentinel) loads in a
      running host; the descriptor was used
- [ ] §11 step 10 — descriptor absent → the pinned error, **not** a localhost attempt
- [ ] §11 step 12 — **clean copy** outside the monorepo (excluding
      `node_modules/`, `dist/`) → `npm install && npm run typecheck && npm test && npm run build`
- [ ] §11 step 13 (build half) — no React / ReactDOM / MUI / Emotion module in
      `dist/`; before/after transferred bytes recorded
- [ ] `npm test` passes — all four runtime-plugin cases
- [ ] Publish to Pages and run §11 step 14 against the production host

---

## Phase 5: `hello-world`

_Design: §7.6, §11 steps 6–7, 13_

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `hello-world/src/components/HelloHeader.tsx` | Reads `__webpack_public_path__` at module scope |
| `hello-world/webpack.config.js` | Two exposes, `TerserPlugin` |
| `hello-world/README.md` | "Node.js 18+" |

### Deliverables

- [ ] Apply the **Phase 4 per-app migration block**, with two exposes
      (`./AppConfig`, `./NetworkSummaryMenuItem`)
- [ ] Fix `HelloHeader.tsx` (§7.6): remove `__webpack_public_path__`. Show
      `import.meta.url` as the current chunk URL and **drop the
      `remoteEntry.js` concatenation** — appending to a chunk path yields
      `…/assets/remoteEntry.js`, a 404
- [ ] Update the surrounding prose comments that describe Webpack behaviour
- [ ] Grep this app for `__webpack_`, `require.context`, `require.ensure`, and
      DefinePlugin-style `process.env.NODE_ENV`
- [ ] Update `hello-world/README.md` — build/dev commands, "Node.js 18+" → 24

### Verification (Phase 5)

- [ ] All Phase 4 verification steps, for this app
- [ ] §11 step 7 — `./NetworkSummaryMenuItem` renders **inside the host's React
      tree** and its hooks work (single shared React across the boundary)
- [ ] §11 step 13 (runtime half) — the singletons in use are the host's; a
      remote MUI component picks up the host's theme (shared Emotion cache)
- [ ] `HelloHeader` renders a URL that actually resolves

---

## Phase 6: Remaining apps

_Design: §3 (defects), §7.3, §11 step 8_

### Deliverables — `network-statistics`

- [ ] Apply the per-app block, **non-React shape**: no `react()` plugin, no MUI
      or Emotion peers, `configuredShared` is `{}`
- [ ] Keep `@types/react` in `devDependencies` — the published api-types
      declarations reference React types. Do not "clean this up"
- [ ] `smokeObservable` is `kind: "console"` — this app renders nothing

### Deliverables — `network-workflows`

- [ ] Apply the per-app block
- [ ] Fix the pre-existing defect: `mode: 'development'` was hardcoded, ignoring
      `isProduction` — the Vite config has no such branch, but confirm the
      production build is actually a production build
- [ ] Leave `JupyterConnectorPanel`'s `http://localhost:8888/lab` default alone —
      it is legitimate, and the verifier must not ban `localhost` blanket-wise

### Deliverables — `claude-bridge`

- [ ] Apply the per-app block
- [ ] `claude-bridge/mcp-server/` is **out of scope** — plain `tsc`, never
      bundled

### Verification (Phase 6)

- [ ] All Phase 4 verification steps, for each app
- [ ] §11 step 8 — `network-statistics` still logs statistics on network switch,
      and builds with no `react()` plugin
- [ ] All five manifest entries now have `bundler: 'vite'`
- [ ] CI: all four jobs now cover all five apps

---

## Phase 7: Remove the Webpack toolchain

_Design: §7.1, §8, §10_

The **only** phase that removes shared tooling. Per-app `webpack.config.js`
files were already deleted with their apps in Phases 4–6.

### Deliverables — dependencies and scripts

- [ ] Remove from root `devDependencies`: `webpack`, `webpack-cli`,
      `webpack-dev-server`, `ts-loader`, `clean-webpack-plugin`
- [ ] Move `@mui/material`, `react`, `react-dom` out of the root
      `peerDependencies` — it is currently the repo's **only direct declaration
      of `@mui/material`**, so delete it only after §7.3 has landed everywhere
- [ ] Remove the `bundler: 'webpack'` branch from `copy-dist`
- [ ] Reconcile the built vs published sets in the manifest (Phase 1's decision)

### Deliverables — documentation

- [ ] `README.md` — "Webpack Module Federation" → Vite; setup steps; the
      `typeRoots` install instructions; the "hot-reloads your plugin" claim (§9)
- [ ] `CLAUDE.md` — rewrite the "webpack.config.js Pattern" section; fix the §7
      host-config row
- [ ] `guides/getting-started.md` — config walkthrough
- [ ] `guides/architecture-overview.md` — bundler naming, `shared`/`singleton`,
      **add** how the host address is resolved (§6)
- [ ] `guides/troubleshooting.md` — **add** a `type: 'module'` symptom entry
      (§5.1) and a "descriptor missing / wrong host" entry (§6)
- [ ] `docs/index.html` — links, app list, **and the registration instructions**:
      it tells users to add a `remoteEntry.js` URL under Apps → App Settings,
      but the host takes a single-entry **manifest** URL and enforces an origin
      allowlist that excludes `cytoscape.org`. Wrong today, wrong after
- [ ] `docs/<app>/*.js` — 32 tracked Webpack build outputs. Replace or stop
      tracking
- [ ] `design/apps/*/` — `claude-bridge` and `project-template` design docs
- [ ] `.serena/memories/` — `project_overview.md`, `style_and_conventions.md`,
      `lessons.md`

### Verification (Phase 7)

- [ ] `npm install` clean; no `webpack*` in the tree
- [ ] All five apps build, typecheck, test, and verify
- [ ] `grep -ri webpack` finds nothing in **live sources, configs, scripts or
      user-facing docs**. This spec and the other design/history documents keep
      theirs — they explain why the migration happened
- [ ] Pages deploy green

---

## Phase 8: Production verification

_Design: §11 steps 13–14_

### Deliverables

- [ ] Run the production smoke (§11 step 14) for **every `published: true`** app
- [ ] Record final bundle sizes and compare against the Phase 4 baseline

### Verification (Phase 8)

- [ ] **First**: every `published: true` app has `bundler === 'vite'`. After
      Phase 7 the two sets coincide; a mismatch means an app was published
      unmigrated, and a Webpack `var` remote cannot load in a host that
      registers `type: 'module'`
- [ ] Then, per app:
  - Transport — deployed `remoteEntry.js` and one hashed chunk fetch
    cross-origin with correct CORS headers and JS MIME type
  - `remoteEntry.js` — response URL equals the cache-busted URL **exactly**, and
    its body hash matches the SHA-256 map
  - Chunks — same origin, under `/<publishPath>/assets/`, **path and body hash
    both in the SHA-256 map**. They carry no `?v=`: a relative ESM import does
    not inherit the parent URL's query
  - The app loads through the **real host loader** and produces its manifest
    `smokeObservable`
- [ ] §11 step 13 — shared packages come from the host, not the remote

---

## Final Verification

### Build & test

- [ ] `npm run typecheck --workspaces` passes
- [ ] `npm run test --workspaces --if-present` passes
- [ ] `npm run build --workspaces` succeeds
- [ ] `npm run verify:federation` passes for all five apps
- [ ] `npm run check:imports` passes for all five apps
- [ ] `npm run deploy` produces exactly the approved publish set

### Contract

- [ ] Every `remoteEntry.js` is an ES module (not `var <name>;`)
- [ ] Every production `dist/` carries the sentinel, never `localhost:5500`
- [ ] No React / ReactDOM / MUI / Emotion implementation in any remote's bundle
- [ ] The host's `FEDERATION_SHARED_SINGLETONS` is **unchanged** — §5.8's
      root-barrel decision is what made that possible

### Deferred, deliberately

- [ ] §6.6 — API version-skew enforcement. `__CYWEB_HOST__.apiVersion` and
      `CyApp.apiVersion` both exist; nothing compares them, and
      `requiredVersion` does **not** do it (§5.7)
- [ ] `.eslintrc.json` → oxlint alignment with the host
- [ ] `dev.remoteHmr` — cross-federation HMR is off by default; enabling it is a
      follow-up experiment, not a claim this migration makes

### Known non-issues

- [ ] Plugin 1.16.8 prints `Shared dependency "@emotion/styled" has import: false
      but is not installed locally` on correct builds. Do **not** treat plugin
      warnings as CI errors on account of it
