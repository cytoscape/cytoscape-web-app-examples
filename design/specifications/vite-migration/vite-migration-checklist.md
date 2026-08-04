# Implementation Checklist — Webpack → Vite Migration

> Track progress across all eight phases. Mark `[x]` when complete. Run the
> per-phase verification before starting the next phase.
>
> **Phases are strictly ordered**, and nothing Webpack-breaking happens outside
> the app that is currently migrating.
>
> The original rule — *Phase 2 must be deployed to production before Phase 4
> publishes anything* — was **waived on 8/1/2026** (that deployment is not
> available in the team's workflow). The hazard it guarded against is
> unchanged, so its enforcement now rests entirely on **Phase 3's Pages
> preflight**. See "Release gate — where it went" at the end of Phase 2 before
> Phase 4 publishes.

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

## Phase 1: Decide, then act on the decisions ✅ **COMPLETE (8/1/2026)**

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

- [x] **Canonical published URL** confirmed as
      `https://cytoscape.org/cytoscape-web-app-examples/` (host `apps.json` and
      this repo's `README.md` both use it) — `docs/index.html` agrees too; no
      change needed anywhere
- [x] **Built set** decided — **all five workspaces**: `hello-world`,
      `network-statistics`, `network-workflows`, `project-template`,
      `claude-bridge`. Unchanged from today
- [x] **Published set** decided — **four apps**; `claude-bridge` is
      `published: false`. It is a developer tool that talks to a local MCP
      bridge server, so a Pages copy cannot function for a visitor. This matches
      `deploy-pages.yml` and the four directories tracked under `docs/`; the
      root `copy-dist` script (which copies five) is the one that is wrong, and
      **Phase 3's manifest rewrite is what corrects it** — do not hand-edit it
      here
- [x] **`patterns/` decision** recorded — **delete** (§7.5)

> **Not the same as the host registry.** `cytoscape-web/src/assets/apps.json`
> lists only three apps (`hello`, `networkWorkflows`, `networkStatistics`).
> `project-template` is published to Pages as the copy-paste starting point but
> is deliberately not an installable app. That third set stays out of the
> manifest.

### Deliverables — actions

- [x] Delete `patterns/` — directory and its untracked `dist/` removed; git
      history retains it. Only stale reference left was
      `.serena/memories/project_overview.md`, updated
- [x] Bump `@cytoscape-web/api-types` to the host's published version
      (`1.0.0-beta.3`) **in `package.json`** — range now `^1.0.0-beta.3`
- [x] Run `npm install` and **commit the updated `package-lock.json`** — the
      lockfile currently pins `beta.2`; a range change alone does not move it

### Verification (Phase 1)

- [x] `npm ci` completes cleanly
- [x] `node -e "console.log(require('./package-lock.json').packages['node_modules/@cytoscape-web/api-types'].version)"` prints the host's version → `1.0.0-beta.3`
- [x] `npm run build` still succeeds for every remaining app (Webpack) — all
      five, no errors
- [x] No open "which app / which URL" question remains

---

## Phase 2: Host repository ✅ **COMPLETE (declared 8/1/2026)**

_Design: §6.3, §8 (release gate), §11.2, §11 step 11a_

**Everything here is in `cytoscape-web/`.** As written, this phase ended with
the descriptor live in production. **It was closed without that**, deliberately
— read the two notes below before treating it as unconditionally done.

> **Production deploy: waived.** Deploying to `web.cytoscape.org` is not
> available in the team's current workflow, so Phase 2 is declared complete on
> the code and its local verification, and the deployed-host contract check is
> deferred to a dev deployment. **This moves the release gate** — see the
> "Release gate — where it went" section at the end of this phase, which Phase 4
> depends on.
>
> **CI: green.** Run [30720488880](https://github.com/cytoscape/cytoscape-web/actions/runs/30720488880)
> on PR [#655](https://github.com/cytoscape/cytoscape-web/pull/655) — all six
> jobs passed, including `Verify Module Federation build output` (36/36) and
> the E2E on all three browsers. `remote-app-load` in particular exercises the
> remote → host direction, which is the direction this whole phase exists to
> enable, and it had never run before this.

> **Two decisions taken during implementation:**
>
> - **The descriptor publish is a function, not inline.** `hostDescriptor.ts`
>   exports `publishHostDescriptor(target, base, href)` and `bootstrap.tsx`
>   calls it with `window`. §6.3 showed `Object.defineProperty` inline, which
>   cannot be unit-tested: importing `bootstrap.tsx` runs the whole boot. Taking
>   `target` makes the immutability contract — the part a remote depends on and
>   the part nothing else would notice breaking — assertable against a plain
>   object. Same reasoning that made `buildHostRemoteEntryUrl` a pure helper.
> - **The contract spec can target a deployed host.** `CYWEB_HOST_URL=<url>`
>   overrides Playwright's `baseURL` and suppresses the `webServer` block, so
>   one spec file covers CI, production and Netlify branch previews. Phase 2's
>   exit criterion needs a production run before Phase 3's
>   `preflight-host.mjs` exists, and waiting out a local production build to
>   check a remote URL is pure cost.

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

- [x] Create `cytoscape-web/src/app-api/federation/hostDescriptor.ts`:
  - `APP_API_VERSION` constant
  - `CyWebHostDescriptor` interface — `readonly name: 'cyweb'` (literal, not
    `string`), `readonly remoteEntry: string`, `readonly apiVersion: string`
  - `declare global { interface Window { readonly __CYWEB_HOST__?: CyWebHostDescriptor } }`
  - `buildHostRemoteEntryUrl(base, href, filename)` — **pure helper**, exported
  - `publishHostDescriptor(target, base, href)` — see the decision note above
- [x] Modify `cytoscape-web/src/boot/bootstrap.tsx` — publish
      `window.__CYWEB_HOST__` **synchronously** in the boot chunk via
      `Object.defineProperty(… { writable: false, configurable: false })` with an
      `Object.freeze`d value, calling `buildHostRemoteEntryUrl()`
  - Must **not** go on `window.CyWebApi` (async import, gated behind
    `cywebapi:ready`)
  - Landed as a one-line `publishHostDescriptor(window, import.meta.env.BASE_URL,
    window.location.href)` at boot-chunk top level; verified present in the
    built `dist/assets/bootstrap-*.js` with `writable:!1,configurable:!1`
- [x] Create `cytoscape-web/src/app-api/federation/hostDescriptor.test.ts`
      (§11 step 11a):
  - `buildHostRemoteEntryUrl('/', 'https://h/y/z', 'remoteEntry.js')` → `https://h/remoteEntry.js`
  - `buildHostRemoteEntryUrl('/cytoscape/', 'https://h/y/z', 'remoteEntry.js')` → `https://h/cytoscape/remoteEntry.js`
  - Descriptor is frozen and the property is non-writable/non-configurable
  - 7 tests, all passing

### Deliverables — host dependencies and CI

- [x] Add `@module-federation/runtime` (`2.5.1`) to `cytoscape-web/package.json`
      `devDependencies` — `ExternalComponent.tsx` imports it by name while it is
      only transitive today. The tree already resolved 2.5.1, so the lockfile
      moved by one line
- [x] Add `npm run verify:federation` to the CI **build job, immediately after
      `npm run build`** (a separate job has no `dist/`) — passes locally, 36/36

### Deliverables — E2E fixture (remote → host direction)

- [x] Create `cytoscape-web/test/fixtures/remote-app/cywebHostSentinel.ts` —
      same sentinel **string** the examples will use (§6.4)
- [x] Create `cytoscape-web/test/fixtures/remote-app/mfRuntimePlugin.ts` —
      mirrors §6.4: local structural type (generic `beforeInit`), writes **both**
      `userOptions.remotes` and `options.remotes`, validates `name` + URL,
      throws on sentinel
- [x] Create `cytoscape-web/test/fixtures/remote-app/cyweb.d.ts` — fixture-local
      minimal declaration. **Match the real API**: `WorkspaceInfo.workspaceId`
      (not `id`), and `ApiResult` is a discriminated union, not
      `success: boolean` + optional `data`
- [x] Modify `cytoscape-web/test/fixtures/remote-app/vite.config.ts`:
  - `remotes: { cyweb: { type: 'module', name: 'cyweb', entry: <sentinel>, entryGlobalName: 'cyweb', shareScope: 'default' } }`
  - **`runtimePlugins: [<absolute, normalized path to the resolver>]`** — copying
    the resolver without registering it leaves it inert and the test "passes"
    while exercising nothing
  - Confirmed in the built output: `remoteEntry.js` contains the sentinel, the
    pinned error string, and `cywebHostResolver(void 0)` inside the
    runtime-plugin array
- [x] Modify `cytoscape-web/test/fixtures/remote-app/AppConfig.tsx` — call
      `useWorkspaceApi().getWorkspaceInfo()` at **runtime** (not `import type`)
      and render `workspaceId` into the DOM
- [x] Extend `cytoscape-web/test/playwright/remote-app-load.spec.ts` — assert the
      rendered `workspaceId` **value**, not merely that an element exists.
      Asserted against the id in the page URL (the host redirects `/` to
      `/<workspaceId>/networks`), so an empty or `undefined` render fails

### Deliverables — preflight (host-side)

- [x] Add a Playwright check for the full **§8 descriptor contract**:
      `name === 'cyweb'`; `remoteEntry` absolute `http(s)`; non-empty
      `apiVersion`; `Object.isFrozen()` + property descriptor; JS MIME type;
      `await import(url)` yields `init`/`get` as functions
  - `cytoscape-web/test/playwright/host-descriptor.spec.ts`
- [x] Use `page.waitForFunction(fn, undefined, { timeout })` — **options is the
      third parameter**; `index.tsx` dynamically imports `bootstrap`, so the
      descriptor is not present at `load`

### Deliverables — deployment

- [x] ~~Deploy the host to production (`web.cytoscape.org`)~~ — **waived
      8/1/2026: not available in the team's current workflow.** See the release
      gate note below; this is the one waiver in Phase 2 and it changes where a
      later phase's safety comes from

### Verification (Phase 2)

- [x] `npm run lint` passes (host)
- [x] `npm run test:unit` passes (host), including the new `hostDescriptor`
      tests — 246 files, 3029 tests
- [x] `npm run build` + `npm run verify:federation` pass (host) — locally and
      in CI, where it is now a named `Build` step: 36/36
- [x] `npx playwright test remote-app-load --project=chromium` passes — the
      remote→host direction is now covered
  - **Not runnable on this dev machine** (WSL2, no `libnspr4`/`libnss3`; the
    fix needs `sudo apt-get`). CI runs the suite in the
    `mcr.microsoft.com/playwright` image, so **CI owns it** — green on run
    30720488880, chromium/firefox/webkit
  - **This is the check that matters most in Phase 2.** The fixture compiles in
    an unloadable sentinel, so it passing means the runtime plugin actually
    read `window.__CYWEB_HOST__`, rewrote the `cyweb` entry, resolved
    `cyweb/WorkspaceApi`, and returned a `workspaceId` matching the one in the
    page URL. §6.4's failure mode — writing the wrong remotes array and
    silently no-opping — did not occur
  - **The manual descriptor check below does not substitute for this.**
    Publishing a well-formed descriptor and a remote *reading* it are separate
    claims; §6.4's own failure mode is a resolver that writes the wrong remotes
    array and silently no-ops, which a correct descriptor does nothing to
    catch. This is the only check that fails when that happens — the fixture
    compiles in an unloadable sentinel, so a resolver that never ran cannot
    load at all
- [x] `npx playwright test host-descriptor --project=chromium` passes (same
      caveat as above) — green on run 30720488880
  - CI's dot reporter prints no per-test names, so "it ran" was confirmed by
    counting: `playwright test --list --project=chromium` yields exactly 52
    tests including this one, and CI reported `Running 52 tests` → `52 passed`
  - **The assertions themselves are confirmed.** Run by hand on 8/1/2026
    against `http://localhost:5500`, pasting the equivalent snippet into the
    browser console: **10/10 passed** — `name` `'cyweb'`, `remoteEntry`
    `http://localhost:5500/remoteEntry.js`, `apiVersion` `'1.0'`,
    `Object.isFrozen` true, property non-writable and non-configurable,
    `remoteEntry` 200 with `text/javascript`, and the module namespace exports
    `init` and `get` as functions. What is still owed here is the *automated*
    run, not the contract
  - Complements the build-output check: the production bundle
    (`dist/assets/bootstrap-*.js`) was grepped and carries
    `Object.freeze({…}),writable:!1,configurable:!1`, so both the served page
    and the shipped chunk are accounted for
- [x] ~~**The full §8 descriptor contract passes against `web.cytoscape.org`**,
      deployed, not merely merged~~ — **waived with the deploy, 8/1/2026.**
      Deferred to a dev deployment, whenever the branch reaches one:

      ```
      CYWEB_HOST_URL=https://development--incredible-meringue-aa83b1.netlify.app \
        npx playwright test host-descriptor --project=chromium
      ```

      or the §8 console snippet, which needs no Playwright install. Every branch
      auto-deploys, so `https://<branch>--incredible-meringue-aa83b1.netlify.app`
      works too — the point is to run it against **something served over HTTPS
      from a CDN**, since that is where this contract differs from localhost:
      `urlBaseName` and the MIME type on `remoteEntry.js`
  - The manual run recorded above was localhost, and says nothing about either

### Release gate — where it went (read before Phase 4)

Deploying the descriptor to production was a **structural** guard, not
paperwork: §5.5 makes a migrated app ship a sentinel rather than a localhost
fallback, so an app published against a descriptor-less host **cannot load at
all**. Waiving it does not remove that hazard; it moves the whole burden of
preventing it onto **one** mechanism:

> **Phase 3's `scripts/preflight-host.mjs`, wired into `deploy-pages.yml`, is
> now the only thing standing between a published app and a host that cannot
> load it.** It was specified as cheap insurance on top of the Phase 2 gate
> (§8, option 3, "with (3) as cheap insurance"). With the Phase 2 gate waived
> it is promoted to *the* gate, and the two things that follow are not
> optional:
>
> 1. **It must run against the host the apps will actually name.** That is
>    whatever `apps.json` points `cyweb` at — production today. Pointing the
>    preflight at a dev deployment while the apps are published for production
>    would pass while proving nothing.
> 2. **It must fail the deploy, not warn.** "Hold the deploy" is unenforceable
>    here: `deploy-pages.yml` publishes on push to `main` with no human step.

Phase 4 must not publish its pilot to Pages until that preflight exists and is
red-on-missing-descriptor. Verify it by pointing it at a host known **not** to
have the descriptor and confirming a non-zero exit — a gate never seen to fail
is not known to work.

---

## Phase 3: Scaffolding only ✅ **COMPLETE (8/1/2026)**

_Design: §7.1, §8, §11.0, §12_

> **Two decisions taken during implementation, both narrowing a check to the
> case where it is meaningful:**
>
> - **The deploy-time host preflight is self-activating.** It runs only when a
>   `published` app is also on `bundler: 'vite'`
>   (`node scripts/manifest.mjs --needs-preflight`). A Webpack app compiles the
>   host URL in and never reads `window.__CYWEB_HOST__`, so a descriptor-less
>   host cannot break it — running the gate unconditionally would have blocked
>   **every Pages deploy today** over a hazard that does not exist. It was going
>   to: production (`web.cytoscape.org`) currently serves
>   `runtime.<hash>.js` / `vendors.<hash>.js`, i.e. a **pre-Vite Webpack build**
>   of the host, so it has no descriptor at all. Phase 4 arms the gate by
>   flipping one manifest field.
> - **`smokeObservable` is required on the same condition**, not on `published`
>   alone. §11 step 14 selects on `published && vite`, no app carries a
>   `data-testid` yet, and four selectors written now would be unexercised until
>   Phase 8. Each app gets a real one in the commit that migrates it.

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

- [x] `vite` — `8.0.13` (match host)
- [x] `@module-federation/vite` — `1.16.8` (match host)
- [x] `@module-federation/runtime` — `2.5.1` (§6.4 imports it by name)
- [x] `@vitejs/plugin-react` — match host (`^5.0.0`)
- [x] `@types/node` — pin explicitly (currently only transitive via `webpack-dev-server`)
- [x] `vitest` — match host (`^4.1.8`)
- [x] `@playwright/test` — `1.61.0` (match host)
- [x] **Do not remove** `webpack`, `webpack-cli`, `webpack-dev-server`,
      `ts-loader`, `clean-webpack-plugin` — that is Phase 7

### Deliverables — manifest and tooling

- [x] Create `apps.manifest.json` — one entry per app with `workspaceDir`,
      `publishPath`, `federationName`, `port`, `bundler`, `published`,
      `exposes`, `smokeObservable`, `configuredShared`
  - All five entries start at `"bundler": "webpack"`
  - **`published`, per Phase 1's decision:** `true` for `hello-world`,
    `network-statistics`, `network-workflows`, `project-template`; **`false`
    for `claude-bridge`** (so it needs no `smokeObservable`). This is where
    `copy-dist` stops copying five apps
  - `workspaceDir`, `publishPath` and `federationName` are **three different
    strings** (`hello-world` / `hello-world` / `hello`)
  - `configuredShared` holds **full records**, not a name list;
    `network-statistics` is explicitly `{}`
- [x] Create `scripts/manifest.mjs` — the single loader, with validations:
  - `workspaceDir` set equals the root `workspaces` set, **both directions**
  - `workspaceDir`, `publishPath`, `federationName`, `port` each unique
  - `publishPath` rejects `""`, `.`, `..`, and any `/` or `\`
  - `publishPath` not in the reserved set `{data, images, index.html}`
  - `dirname(resolved) === docsRoot && resolved !== docsRoot`
  - Strict schema: unknown fields rejected, `bundler` enum, no duplicate `exposes`
  - `smokeObservable` required when `published === true`
  - `requiredVersion` cross-checked against `peerDependencies` — **`bundler: 'vite'` entries only**
  - An app removed from the manifest is an **error**, not a cleanup trigger
- [x] Create `scripts/verify-federation-build.mjs` (§11.0) — run per app,
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
- [x] Create `scripts/check-imports.mjs` — bans `@mui/material/` subpaths and
      `@mui/icons-material` in `<workspaceDir>/src`. Match **import/export
      specifiers**, not raw text. Gated on `bundler === 'vite'` (inert now)
- [x] Rewrite `copy-dist` around the manifest — iterate `published === true`,
      **delete then copy**, validate all entries before deleting anything, stage
      into a temp directory and swap
  - `bundler: 'webpack'` → replace-copy the whole `dist/`, no class check
  - `bundler: 'vite'` → the §8 exclusive publish classes, unknown files fatal
- [x] Create `scripts/preflight-host.mjs` — `npm run preflight:host <url>`,
      running the full §8 descriptor contract
  - **This is now the only release gate**, not the "cheap insurance" §8
    originally called it: Phase 2's production-deploy criterion was waived
    (8/1/2026). Three properties are therefore mandatory, not nice-to-have —
    it targets the host `apps.json` names, it exits non-zero rather than
    warning, and **it has been observed going red** against a host with no
    descriptor. See "Release gate — where it went" at the end of Phase 2.
    **All three were verified on 8/1/2026** — see the Phase 3 verification
    section: red against production, red against a control host, green
    against a correct one

### Deliverables — per-app scripts (against the **existing** tsconfigs)

- [x] Add `"typecheck": "tsc --noEmit -p tsconfig.json"` to all five apps.
      **Do not** add `noEmit` to the tsconfig files themselves — that breaks
      `ts-loader`

### Deliverables — CI and Node version

- [x] Create the PR CI workflow with the fixed §8 job table:
  - `check:imports` — `bundler === 'vite'` apps
  - `typecheck` — always all five
  - `build` + verifier — build always; **verifier step gated on `bundler`**;
    both in the **same job** (`dist/` does not cross a job boundary)
  - `test` — `npm run test --workspaces --if-present`
- [x] Point `deploy-pages.yml` at `npm run copy-dist` instead of its hardcoded
      `rm -rf` / `cp -r` lines
- [x] Add `npx playwright install --with-deps chromium` + the production-host
      preflight step to `deploy-pages.yml` — the step must **fail the job**; the
      workflow publishes on push to `main` with no human step, so a warning
      publishes anyway
- [x] `node-version: '22'` → `'24'` in the workflow
- [x] Add `"engines": { "node": ">=24.0.0" }` to the root `package.json`
- [x] Add `.nvmrc` with `24`
- [x] Update `guides/getting-started.md` — "Node.js 18+" → 24

### Verification (Phase 3)

- [x] `npm install` clean
- [x] `node scripts/manifest.mjs --validate` passes
- [x] **All five apps still build with Webpack** (`npm run build`)
- [x] `npm run typecheck --workspaces` passes against the existing tsconfigs
- [x] `npm run deploy` produces the **same** `docs/` output the **workflow**
      produced before the rewrite (diff it). Not the same as today's
      `copy-dist`: that script nests (`docs/hello-world/dist/`, §8) and copies
      `claude-bridge`, which Phase 1 decided is `published: false`
  - **Behaviourally identical, and the two defects are gone:** no
    `docs/<app>/dist/` nesting, no `docs/claude-bridge/`, four apps published.
  - The run did leave a 6-file content diff, which is **not** from the rewrite:
    `docs/<app>` was last committed 2026-05-15 and the app sources are older
    still, so nothing in the inputs changed — webpack has simply moved to
    5.107.1 inside its own `^5.94.0` range since, shifting module ids and chunk
    splitting. Rebuilding twice is byte-identical, so the output is stable. The
    regenerated files were **reverted**: Phase 3 is scaffolding, and the Pages
    workflow regenerates `docs/` on push to `main` anyway
- [x] ~~`npm run preflight:host https://web.cytoscape.org` passes~~ — **it must
      FAIL today, and it does.** Production serves `runtime.<hash>.js` /
      `vendors.<hash>.js`: a **pre-Vite Webpack build** of the host, with no
      descriptor. That is the whole reason the deploy gate is conditional (see
      the decision note at the top of this phase)
- [x] **The gate was exercised in all three directions** (8/1/2026, manually,
      after installing the Chromium system libraries). This is what the Phase 2
      waiver made mandatory: with the production-deploy gate gone, a preflight
      nobody had seen reject anything would have been the whole safety net.
  - `preflight:host https://web.cytoscape.org` → **red**, on
    `window.__CYWEB_HOST__ is published — not present after 30000ms`. The gate
    rejects the host the published apps actually name
  - `preflight:host -- --selftest` → **green**, i.e. it confirmed the contract
    fails against a control host that will never publish a descriptor
  - `preflight:host http://localhost:5500` → **green, 10/10**: name, absolute
    `remoteEntry`, `apiVersion` `1.0`, frozen, non-writable, non-configurable,
    200, `text/javascript`, and `init`/`get` both functions
  - Red on two different hosts and green on a correct one — so it is neither
    stuck-red nor stuck-green, which either alone would have looked like proof
- [x] PR CI green — [PR #2](https://github.com/cytoscape/cytoscape-web-app-examples/pull/2),
      run 30870210196. First PR CI this repository has ever had. All five jobs
      passed, and the `Build & verify` log shows the point of the phase in one
      place: five Webpack builds succeed, then the verifier reads `bundler` and
      skips all five. Phase 4 turns one of those skips into a real check by
      flipping a single manifest field, with no workflow edit

---

## Phase 4: `project-template` pilot ✅ **COMPLETE (8/4/2026)**, except the Pages publish

> **Decisions settled here, both from real output:**
>
> - **§8 Decision A — accept the absolute build-machine paths.** 10 literals,
>   all in `remoteEntry.js`. Pages builds run in GitHub Actions, so the
>   published string is `/home/runner/work/<repo>/<repo>/…` — a fixed runner
>   account and an already-public repo name. Publishing from a **workstation**
>   is the case to avoid; the workflow is safe.
> - **§8 Decision B — do not publish the SSR files.** 34,164 B per app of
>   Node-only code. `copy-dist` excludes them and §11 step 9 then passed
>   against the published set, which is what this decision required.
>
> **§5.7 A vs B is settled at 8.7×**: 800,753 B of browser JS with fallbacks
> against 92,325 B with `import: false` — MUI's fallback alone is 674 kB, far
> above the ~210 kB the plan estimated from a two-package fixture.
>
> **The release gate is now armed, and that blocks Pages — accepted 8/4/2026.**
> `project-template` is the first `published && vite` entry, so
> `manifest.mjs --needs-preflight` exits 0 and `deploy-pages.yml` will run the
> preflight against production. Production has no descriptor, so the deploy
> **fails** — including for the three apps still on Webpack, which would
> otherwise publish fine.
>
> Accepted rather than worked around. Publishing the pilot today would put an
> app on the CDN that cannot load in the production host by construction, since
> it carries a sentinel instead of a fallback. Stopping the deploy is the gate
> doing its job, not an obstacle to route around. Nothing changes until this
> branch reaches `main`; it clears when the host ships the descriptor.
>
> The alternative — setting `published: false` on the pilot to disarm the gate —
> was considered and rejected: it would keep the other three publishing at the
> cost of making the gate's first real firing something to be suppressed.

> **Two things the plan did not anticipate:**
>
> - **Option A and the `noSharedPayload` gate are mutually exclusive.** Building
>   with fallbacks fails the gate immediately, because fallbacks *are* bundled
>   `/node_modules/react/`. Choosing A would mean deleting the only defence
>   against §5.8 as well; the two decisions are not independent.
> - **An unused subpath import does not bundle MUI.** A gate test that merely
>   writes `import Box from '@mui/material/Box'` passes. It has to RENDER the
>   component — then the gate fires, on
>   `@mui/utils/esm/composeClasses/composeClasses.js`, which is exactly the
>   namespace-prefix case `BANNED_PREFIXES` exists for.

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

- [x] `src/cywebHostSentinel.ts` — `export const CYWEB_HOST_REQUIRED = 'cyweb:__CYWEB_HOST_REQUIRED__'`
- [x] `src/mfRuntimePlugin.ts` (§6.4):
  - Local structural type, **generic** `beforeInit: <T extends BeforeInitArgs>(args: T) => T`
    (a non-generic signature drops `origin`/`shareInfo` → TS2322)
  - **No** import from `@module-federation/runtime` — its types reach `webpack`
  - `readHostEntry()` validates `name === 'cyweb'`, non-empty, absolute `http(s)`
  - Writes **both** `userOptions.remotes` and `options.remotes`
  - Throws on the sentinel with the pinned "missing or invalid" message
- [x] `test/mfRuntimePlugin.test.ts` — **outside `src/`**, against a **real
      `ModuleFederation` instance**:
  - First init (populated `userOptions.remotes`, empty `options.remotes`)
  - Re-init (populated `options.remotes`)
  - Descriptor absent, dev build → entry untouched
  - Malformed descriptor, production build → parameterized: absent, `name`
    missing, `name` wrong, empty URL, relative URL, non-HTTP scheme
- [x] `index.html` — the §5.3 remote-only stub
- [x] `vite.config.ts` (§5.5) containing:
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
- [x] `tsconfig.node.json` — `vite.config.ts`, `types: ["node"]`, `skipLibCheck: true`
- [x] `tsconfig.test.json` — `test/**/*`, `skipLibCheck: true`

**Modified files**

- [x] `tsconfig.json` — `moduleResolution: "bundler"`, `isolatedModules`,
      `noEmit`, `lib: ["ESNext","DOM","DOM.Iterable"]`, `types: ["@cytoscape-web/api-types"]`,
      **`typeRoots` deleted**, `skipLibCheck` **false**
- [x] `package.json` — self-contained `dependencies` / `peerDependencies` /
      `devDependencies` with **concrete versions**, `engines`, and scripts:
      `build`, `dev`, `typecheck` (all three configs), `test`
- [x] All `@mui/material/X` imports → root barrel `import { X } from '@mui/material'` (§5.8)
- [x] **Delete** `webpack.config.js`

**Manifest**

- [x] Flip this app's `bundler` to `'vite'` — **in the same commit** as its
      `peerDependencies` and `vite.config.ts`

### Deliverables — pilot-only

- [x] Add a `template` entry to `cytoscape-web/src/assets/apps.local.json`
      (id `template`, port 5555) — it does not exist today
- [x] Add the gate's own fixtures: positive (root barrel) and **three** negative
      (`@mui/material/Box`, `@mui/icons-material/Home`, **`@mui/utils`**)
- [x] Record the §5.7 A-vs-B measurement (transferred bytes, both ways)
- [x] Record the §5.8 measurement and confirm the root-barrel result
- [x] Make the §8 SSR decisions from the pilot's **real** output:
      Decision A (absolute build-machine paths in `remoteEntry.js`) and
      Decision B (publish the SSR files or not) — they are **independent**
- [x] Record the pilot's actual emitted file set and encode it as the publish set

### Verification (Phase 4)

- [x] §11 step 1 — `npm run typecheck` passes (all three configs)
- [x] §11 step 2 — `npm run build` emits `dist/remoteEntry.js`
- [x] §11 step 3 — `npm run verify:federation` passes
- [x] §11 step 4 — `npm run dev` serves on 5555; `curl -I` → 200 with
      `Access-Control-Allow-Origin: *`
- [x] §11 step 5 — loads in the host from `apps.local.json`, mounts, panel renders
- [x] §11 step 6 — MUI styles correct, no duplicate-Emotion warning
- [x] §11 step 9 — a **production** build (carrying the sentinel) loads in a
      running host; the descriptor was used
- [x] §11 step 10 — descriptor absent → the pinned error, **not** a localhost
      attempt. Covered by the unit suite's 8 parameterised cases (absent, name
      missing, name wrong, empty, relative, `file:`, `data:`, non-string), which
      is what §11.2 prescribes: the descriptor is non-configurable by design, so
      it cannot be removed from a live host page to test this
- [x] §11 step 12 — **clean copy** outside the monorepo (excluding
      `node_modules/`, `dist/`) → `npm install && npm run typecheck && npm test && npm run build`
- [x] §11 step 13 (build half) — no React / ReactDOM / MUI / Emotion module in
      `dist/`; before/after transferred bytes recorded
- [x] `npm test` passes — all four runtime-plugin cases
- [ ] ~~Publish to Pages and run §11 step 14 against the production host~~ —
      **deferred with the Phase 2 waiver.** Production has no descriptor, so a
      published Vite app could not load there, and the deploy preflight — now
      armed, because this app is the first `published && vite` entry — would
      correctly refuse the deploy. This is the gate working, not a blocker to
      route around. It unblocks when the host ships

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
