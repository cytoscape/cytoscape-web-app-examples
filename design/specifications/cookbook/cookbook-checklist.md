# Implementation Checklist — Cookbook

> Track progress across the seven phases (0–6). Mark `[x]` when complete. Run the per-phase
> verification before starting the next phase.
>
> **Status: PLANNING (2026-10-01).** The design is at revision 4, after three reviews. No
> implementation has started. Work happens on the `cookbook` branch of this repository.
>
> **Release gate.** Nothing merges into `development` until
> `@cytoscape-web/api-types@1.0.0-beta.5` is on npm (design D-4). Until then, every
> verification runs against the local tarball, and `verified.json` records that. Deploy-time
> generation refuses that record by design. Only Phase 5 lifts the gate.
>
> **Phase order.** Phase 0 comes before any new link to the cookbook (design Goal 6).
> Phase 1 comes before everything else. Phases 2 and 3 each need only Phase 1. Phase 5 needs
> Phases 0–4.

_Design: [cookbook-design.md](cookbook-design.md) — full rationale and the reasoning behind every item below. Section references (§) point into it._

_Umbrella: [developer-onboarding-roadmap.md](../developer-onboarding/developer-onboarding-roadmap.md) — items B-2 (recipes) and E-2 (`llms.txt`), stage A3._

**Format note:** this follows the layout of
[`../app-sdk/app-sdk-checklist.md`](../app-sdk/app-sdk-checklist.md): all phases in one file,
then a per-recipe status table, the current verification record, and the final
verification.

**Repository note:** unless a step says otherwise, paths are relative to
`cytoscape-web-app-examples/`. Paths prefixed `cytoscape-web/` are in the **host** repository,
which this project only reads and runs. It changes no host file.

**Local setup, before any phase:** install the host's beta.5 types from a local tarball, as
described in `CLAUDE.md` under "Developing against an unpublished api-types". Re-run it after
any `npm install` or `npm ci` here.

---

## Phase 0: Corrections ⬜ **NOT STARTED**

_Design: §1, §4.9, Goal 6_

Agents read these pages today, and they contradict the current API. Fix them before any page
links to the cookbook. This is not a full sweep for stale context (roadmap E-1a): fix what is
listed here, and any other contradiction found on a page the cookbook will link to.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `README.md` | The "Available APIs" and "Available Events" tables |
| `cytoscape-web/packages/api-types/src/events.ts` | `CyWebEventMap`, the source for the event table |
| `cytoscape-web/src/app-api/federation/federationExposes.ts` | The exposes, the source for the API table |
| `hello-world/src/components/LayoutSection.tsx` | The header comment and any code that relies on a rejection |
| `cytoscape-web/src/app-api/core/layoutApi.ts` | `applyLayout` returns `Promise<ApiResult>` and does not reject |
| `.serena/memories/lessons.md` | The `remotes.d.ts` rules, the port list, and the "File Update Checklist" |

### Deliverables

- [ ] README event table: add `network:changed`, `network:loaded` and `style:switched`, with
      "fires when" text taken from the doc comments in `events.ts`
- [ ] README API table: add `cyweb/PanelApi`, `cyweb/AppDataApi` and `cyweb/ScopedApi`
- [ ] `LayoutSection.tsx`: failure is a resolved, failed `ApiResult`, not a rejection. Fix the
      comment and any code that depends on `.catch()`
- [ ] `lessons.md`: remove both `remotes.d.ts` rules and the `remotes.d.ts` step of the "File
      Update Checklist". Replace the stale port list (`simple-menu`, `simple-panel`) with a
      pointer to each app's `cyweb` block
- [ ] Any other contradiction found on a page the cookbook links to (README, `guides/`,
      `hello-world`): fix it here

### Verification (Phase 0)

- [ ] The README event table names every key of `CyWebEventMap` except `cywebapi:ready`, which
      the README documents under "Non-React Access"
- [ ] The README API table names every `cyweb/*Api` expose in `federationExposes.ts`
- [ ] `grep -n remotes.d.ts .serena/memories/lessons.md` finds nothing
- [ ] `npm run typecheck` and `npm test` still pass

---

## Phase 1: Foundation and a minimal runner ⬜ **NOT STARTED**

_Design: §4.1–§4.6, §4.9 (README link), §4.10 (the three Phase 1 recipes), §4.11_

Three recipes, end to end. The point is to find import and readiness problems before the
catalog grows.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `cytoscape-web/src/app-api/core/perAppApis.ts` | Which six domains are owner-bound |
| `cytoscape-web/src/app-api/core/visualStyleApi.ts` | `CreateContinuousMappingOptions` |
| `cytoscape-web/src/app-api/core/elementApi.ts` | `createNodes`: all-or-nothing validation, one undo entry |
| `cytoscape-web/src/app-api/api_docs/Api.md` | "Readiness" (`whenReady()`) and `network:loaded` |
| `cytoscape-web/src/boot/metrics/bootReport.ts`, `cytoscape-web/src/debug.ts` | Where the build commit is, and when it is published |
| `network-statistics/src/NetworkStatisticsApp.ts` | The `network:switched` + `network:loaded` pattern that `follow-current-network` generalizes |
| `scripts/preflight-host.mjs` | Playwright navigation and waiting patterns to reuse |
| `scripts/manifest.mjs` | `NON_APP_WORKSPACE_PREFIXES`: why `cookbook/` is not a workspace |

### Deliverables — layout and type check (§4.1)

- [ ] The `cookbook/` tree of §4.1, outside the root `workspaces`
- [ ] `cookbook/tsconfig.json`: `skipLibCheck: false`, `types` including
      `@cytoscape-web/api-types`. It includes `recipes/`, `wiring/` and `runner/cases/`
- [ ] The root `typecheck` script also runs `tsc -p cookbook`. **This edits the root
      `package.json`: confirm with the maintainer first**

### Deliverables — documents (§4.11)

- [ ] `cookbook/USING-RECIPES.md`
- [ ] `cookbook/WRITING-RECIPES.md`, including the required pitfall topics (§4.2), the
      import rules (§4.3) and the **allowed `apis` forms** (§4.4)
- [ ] `cookbook/runner/README.md`, including how to start a host from a standalone clone
      (`dev-start.sh` lives in the parent workspace repository, not here)

### Deliverables — wiring (§4.2, §4.4)

- [ ] One compiled file per call site: `mount(context)`, an `'apps-menu'` `onClick`, a React
      panel (hooks for host-wide domains, `useAppContext()?.apis` for owner-bound ones), and
      `window.CyWebApi` after `whenReady()`
- [ ] Every owner-bound call uses an allowed `apis` form

### Deliverables — generator: checks and index (§4.6, §4.7)

- [ ] `scripts/cookbook-index.mjs` parses with the TypeScript compiler API. `typescript` is
      already a root devDependency, so no dependency is added
- [ ] It rejects:
  - [ ] a missing tag
  - [ ] an unknown `@related` id
  - [ ] `@apis` differing from the API call expressions (comments excluded)
  - [ ] a value import in a core recipe
  - [ ] an owner-bound recipe without an `AppContextApis` parameter
  - [ ] an owner-bound call in `wiring/` or `runner/app` with an `apis` argument outside the
        allowed forms
- [ ] It fails when the api-types version the type check resolved differs from
      `verified.json`
- [ ] It writes `cookbook/README.md`. `--check` regenerates in memory and fails on any
      difference
- [ ] Each rejection has a fixture that is **seen failing** (criterion 2)

### Deliverables — recipes (§4.2, §4.10)

- [ ] ★ `elements/add-nodes-to-network`, with its case
- [ ] ★ `style/color-nodes-by-numeric-column`, with its case
- [ ] `events/follow-current-network`, with its case, covering all four steps of §4.5

### Deliverables — minimal runner (§4.6)

- [ ] Bundle the core recipes and cases with Vite library mode (Vite is already a root
      devDependency)
- [ ] Before navigating, set `localStorage['cyweb-debug-enabled'] = 'true'`
- [ ] `await window.CyWebApi.whenReady()`, then wait, **with a time limit**, for
      `window.debug.boot.report`. Fail if it does not appear, or if
      `report.build.commit` is `unknown`
- [ ] Each case builds an isolated fixture with `network.createNetworkFromEdgeList` and reads
      the result back through the read-side APIs
- [ ] Cleanup in `finally`, pass or fail: the fixture network, subscriptions, registrations
- [ ] A single case can be run by id; `--selftest` proves the runner can fail
- [ ] A full, passing run writes `cookbook/verified.json`:
  - [ ] api-types exact version, and its source (registry or local)
  - [ ] the host commit
  - [ ] a digest of `recipes/`, `wiring/`, all of `runner/`, and `cookbook/tsconfig.json`

### Deliverables — README link (§4.9)

- [ ] **After Phase 0 only:** a short "Building with an AI assistant" section near the top of
      `README.md`, and a Cookbook row in the Documentation Map. The `llms.txt` URL in it goes
      live in Phase 5, step 2

### Verification (Phase 1)

- [ ] `npm run typecheck`, including the cookbook, passes against the local beta.5
- [ ] `node scripts/cookbook-index.mjs --check` passes, and every rejection fixture fails as
      expected
- [ ] The runner passes all three cases against a host on `localhost:5500` (`development`),
      and `--selftest` fails
- [ ] Two consecutive runs leave no fixture network behind
- [ ] `verified.json` exists, and records the local tarball as its source. That is expected
      until Phase 5
- [ ] `npm run manifest:validate`, `npm run check:imports` and `npm test` still pass

---

## Phase 2: Catalog ⬜ **NOT STARTED**

_Design: §4.7, §4.10_

The remaining host-wide recipes, and the generation path for `llms.txt` and `llms-full.txt`.

### Deliverables — recipes (§4.10)

Each recipe has a complete header, covers the pitfall topics for its kind, and has a case
(see the Recipe status table below).

- [ ] `elements/add-edges-between-selected`
- [ ] `elements/delete-selected`
- [ ] `data/add-computed-column`
- [ ] `data/read-column-values-safely`
- [ ] `style/size-nodes-by-degree`
- [ ] `style/color-by-category`
- [ ] `style/label-from-column`
- [ ] `style/highlight-with-bypass`
- [ ] `selection/select-neighbors`
- [ ] `selection/select-by-attribute`
- [ ] `layout/run-layout-and-wait`

### Deliverables — `llms.txt` and `llms-full.txt` (§4.7)

- [ ] The generator takes `--revision <sha>` and an output directory, and writes both files:
  - [ ] `llms.txt` links every recipe and wiring file through `raw.githubusercontent.com`
        URLs pinned to the revision, and links the API reference pinned to the host commit
        in `verified.json`
  - [ ] `llms-full.txt` = `USING-RECIPES.md` + every wiring file + every recipe + pinned API
        reference links. It does not copy the API reference
  - [ ] Both open with the examples commit, the host commit and the api-types version
- [ ] **Deploy mode** refuses when the digest does not match `verified.json`, or when the
      api-types source is not the registry. The CI structure check runs without this gate
- [ ] `deploy-pages.yml`: generate with `--revision $GITHUB_SHA` into `docs/` before the
      upload
- [ ] `ci.yml`: a job that runs `--check`, then generates both files into a temporary
      directory and checks their structure (§4.7). The revision:
  - [ ] on `push`: `GITHUB_SHA`
  - [ ] on `pull_request`: `github.event.pull_request.head.sha`, **checked out explicitly**

### Verification (Phase 2)

- [ ] 14 recipes, and all their cases pass
- [ ] Deploy mode refuses the current, local-tarball `verified.json`, and is **seen failing**
- [ ] The structure check fails on a fixture with a missing recipe, and on one with a link to
      a nonexistent path
- [ ] The CI job's steps pass when run locally for both revision choices. In CI itself they
      go green only after Phase 5's range bump; see Known non-issues

---

## Phase 3: Verification app ⬜ **NOT STARTED**

_Design: §4.1, §4.4, §4.5, §4.6_

The † recipes and component recipes, run with real per-app `apis` in an unpublished app.

### Deliverables — the app (§4.1, §4.6)

- [ ] `cookbook/runner/app/` with its own `package.json` and `cyweb` block. It is in neither
      the root `workspaces` nor `apps.manifest.json`. Its port must not collide with 2222,
      3333, 5555, 6100 or 7001
- [ ] `vite.config.ts` calls `defineCyWebApp`. The runner starts the dev server with
      `runner/app` as the working directory; dependencies resolve from the root
      `node_modules`
- [ ] `mount()` registers resources and stores `context.apis` on the harness, in the one
      allowed harness assignment. It runs no case and waits for no UI (§4.5)
- [ ] The runner installs the app with `?installApp=`, waits until it is active (open the right
      panel and wait for the app's panel, as `smokeObservable` does), then drives the cases
- [ ] Each run uses a fresh browser context. Cleanup in `finally` stops the dev server

### Deliverables — recipes (§4.10)

- [ ] † `layout/register-app-layout`
- [ ] † `ui/menu-action-with-dialog`
- [ ] † `ui/node-context-menu`
- [ ] † `ui/open-own-panel-after-action`
- [ ] † `ui/persist-results-per-network`

### Deliverables — behavior cases (§4.4)

- [ ] **Duplicate tab id:** the app's own tab is selected
- [ ] **Disable:** the runner disables the app through the host UI, and every registration it
      made (context menu item, layout algorithm, panel tab) is gone

### Verification (Phase 3)

- [ ] All 19 recipes have a case, and every case passes. There are no exemptions (D-9)
- [ ] The allowed-forms check rejects a fixture that passes `window.CyWebApi`, and one that
      destructures `apis`
- [ ] `verified.json` is refreshed; its digest now covers `runner/app`

---

## Phase 4: Cross-links ⬜ **NOT STARTED**

_Design: §4.9, §5_

### Deliverables

- [ ] `hello-world/README.md`, "Examples walkthrough": each example links its related recipes
- [ ] Roadmap: a Cookbook row in "Carved-out projects" (B-2, E-2 → `cookbook-design.md`), and
      the B-2 and E-2 sections point to it
- [x] `design/README.md` tree — done at planning time (2026-10-01), together with this
      checklist

### Verification (Phase 4)

- [ ] Every new relative link resolves

---

## Phase 5: Release ⬜ **NOT STARTED** — blocked on the beta.5 publish

_Design: §4.7, §4.8, §7_

Strictly in the order of §4.8. **The cookbook must be live before the scaffolder points at
it.**

### Prerequisite

- [ ] `npm view @cytoscape-web/api-types@1.0.0-beta.5 version` succeeds

### Step 1 — Verify before publishing

- [ ] Bump the api-types range to `1.0.0-beta.5` in the root and in all four apps. **This is a
      dependency change: confirm with the maintainer first** (`CLAUDE.md` §1)
- [ ] `API_TYPES_VERSION` in `packages/create-cytoscape-app/src/scaffold.ts` →
      `1.0.0-beta.5`
- [ ] Bump the `create-cytoscape-app` version. The release workflow skips a version already on
      npm. Bump `@cytoscape-web/app-runtime` too, if it changed
- [ ] `AGENTS_PLACEHOLDER` in `scripts/sync-templates.mjs`: one section naming the `llms.txt`
      URL. Regenerate the templates
- [ ] `CLAUDE.md`: update the note that the repository still depends on beta.4 types
- [ ] `npm install`, so beta.5 now comes from the registry
- [ ] Start a host dev server **fresh from a clean `cytoscape-web` checkout**, run the full
      runner, and commit the refreshed `verified.json` (registry source, host commit)
- [ ] Outside the monorepo, scaffold every template from **packed tarballs** and build it. Its
      `AGENTS.md` names the `llms.txt` URL, which is not live yet
- [ ] CI is green on the pull request: typecheck including the cookbook, `--check`, and the
      structure job

### Step 2 — Publish the cookbook

- [ ] Merge `cookbook` into `development`, then `development` into `main`
- [ ] `deploy-pages.yml` succeeds; `llms.txt` and `llms-full.txt` are served
- [ ] Their header names the deployed `main` commit and the host commit in `verified.json`
- [ ] Every link in `llms.txt` resolves

### Step 3 — Publish the scaffolder

- [ ] Run the release-packages workflow, and confirm that `create-cytoscape-app` was
      **published, not skipped**

### Step 4 — Check what was published

- [ ] Outside the monorepo, scaffold with the released `create-cytoscape-app@<version>` and
      build. The project pins `1.0.0-beta.5`, and its `AGENTS.md` URL resolves
- [ ] Run the agent acceptance test below

### Agent acceptance test (criterion 10)

A fresh agent session, in a freshly scaffolded project, with no other context. Record the
agent, the model and the date with each run.

| Task | Prompt | Found the recipe via `llms.txt` | Typechecked first time | No invented API | Notes |
|---|---|---|---|---|---|
| ★ add nodes | "Add three nodes A, B and C to the current network and connect them in a chain." | | | | |
| ★ color nodes | "Color the nodes of the current network from blue to red by their `score` column." | | | | |

---

## Phase 6: Public Cookbook app ⬜ **OPTIONAL** — not scheduled

_Design: D-2, §5_

- [ ] Decide whether to build it at all
- [ ] A published app whose panel lists the recipes with a Run button
- [ ] An `apps.manifest.json` entry, a port, and a `smokeObservable`, like the other published
      apps

---

## Recipe status

The kind decides the required pitfall topics (§4.2). The kinds below are an initial
assignment; `WRITING-RECIPES.md` is authoritative. "Runner" means the minimal runner; "App"
means the Phase 3 verification app.

| Recipe | Kind | Verified by | Phase | Types | Case passes |
|---|---|---|---|---|---|
| ★ `elements/add-nodes-to-network` | Mutation | Runner | 1 | [ ] | [ ] |
| ★ `style/color-nodes-by-numeric-column` | Numeric mapping | Runner | 1 | [ ] | [ ] |
| `events/follow-current-network` | Events and async | Runner | 1 | [ ] | [ ] |
| `elements/add-edges-between-selected` | Mutation | Runner | 2 | [ ] | [ ] |
| `elements/delete-selected` | Mutation | Runner | 2 | [ ] | [ ] |
| `data/add-computed-column` | Mutation | Runner | 2 | [ ] | [ ] |
| `data/read-column-values-safely` | Numeric mapping | Runner | 2 | [ ] | [ ] |
| `style/size-nodes-by-degree` | Numeric mapping | Runner | 2 | [ ] | [ ] |
| `style/color-by-category` | — | Runner | 2 | [ ] | [ ] |
| `style/label-from-column` | — | Runner | 2 | [ ] | [ ] |
| `style/highlight-with-bypass` | Mutation | Runner | 2 | [ ] | [ ] |
| `selection/select-neighbors` | — | Runner | 2 | [ ] | [ ] |
| `selection/select-by-attribute` | — | Runner | 2 | [ ] | [ ] |
| `layout/run-layout-and-wait` | Events and async | Runner | 2 | [ ] | [ ] |
| † `layout/register-app-layout` | — | App | 3 | [ ] | [ ] |
| † `ui/menu-action-with-dialog` | — | App | 3 | [ ] | [ ] |
| † `ui/node-context-menu` | — | App | 3 | [ ] | [ ] |
| † `ui/open-own-panel-after-action` | — | App | 3 | [ ] | [ ] |
| † `ui/persist-results-per-network` | Persistence | App | 3 | [ ] | [ ] |

## Current `verified.json`

Not yet written. Copy the record here each time it is refreshed.

| Field | Value |
|---|---|
| api-types version and source | — |
| Host commit | — |
| Cookbook digest | — |
| Run date | — |

---

## Final Verification

### Build & test

- [ ] `npm run typecheck` passes, including `tsc -p cookbook`
- [ ] `npm test` passes
- [ ] `node scripts/cookbook-index.mjs --check` passes
- [ ] The runner passes every case, and `--selftest` fails
- [ ] `npm run manifest:validate`, `npm run check:imports` and `npm run verify:federation`
      are unchanged

### Contract (design §7)

- [ ] 1 — Compiles with `skipLibCheck: false`; the resolved api-types version equals
      `verified.json`
- [ ] 2 — Every generator rejection has been seen failing
- [ ] 3 — `--check` fails when an index-affecting field changes without regeneration
- [ ] 4 — CI generates both files for the commit it checked out, on `push` and
      `pull_request`
- [ ] 5 — Every recipe has a passing real-host case, including the duplicate tab id and
      disable cases
- [ ] 6 — The runner waits for readiness, the active app and the boot report, and cleans up
      in `finally`
- [ ] 7 — Changing anything under `recipes/`, `wiring/` or `runner/` blocks deploy-time
      generation until the runner is re-run
- [ ] 8 — The Pages files were live before the scaffolder was published; the scaffolder's
      version was bumped
- [ ] 9 — A project scaffolded outside the monorepo pins the verified version and builds
- [ ] 10 — The agent acceptance test is recorded above
- [ ] 11 — The Phase 0 corrections landed before the README linked the cookbook

### Deferred, deliberately

- [ ] **Per-recipe minimum versions** (D-7) — needs verification against several versions
- [ ] **Recipes inside an npm package** (D-3) — revisited after the API reaches GA
- [ ] **The runner in CI** (O-2) — needs a deployed beta.5 host
- [ ] **The public Cookbook app** — Phase 6
- [ ] **`AGENTS.md` content (E-1b, E-1c), `api-surface.json` (E-3), a full E-1a sweep** —
      outside this project (D-1)

### Known non-issues

- [ ] **Until Phase 5, CI cannot typecheck the cookbook.** `npm ci` installs the published
      beta.4, and the beta.5-only APIs do not exist there. A pull request from `cookbook` is
      not expected to be green before then (D-4)
- [ ] **Until Phase 5, `verified.json` records a local-tarball source**, and deploy mode
      refuses it. That is the gate working, not a failure
- [ ] **`app-runtime`'s `manifestCommand.test.ts` fails on macOS's default `TMPDIR`**, which
      sits under the `/var` symlink. Unrelated to the cookbook; see `.serena/memories/lessons.md`
