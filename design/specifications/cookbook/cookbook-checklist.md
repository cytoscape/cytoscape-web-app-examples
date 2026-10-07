# Implementation Checklist — Cookbook

> Track progress across the seven phases (0–6). Mark `[x]` when complete. Run the per-phase
> verification before starting the next phase.
>
> **Status: Prerequisite and Phase 0 COMPLETE (2026-10-07); Phase 1 next.** The design is at revision 7:
> three reviews, a catalog of 25 recipes with a backlog, and a plan for the published beta.5.
> Work happens on the `cookbook` branch of this repository.
>
> **beta.5 is on npm** (2026-10-05, `latest`), and this repository now depends on it: the
> prerequisite pull request (design D-4, #21) is merged, and `create-cytoscape-app@0.4.2`
> generates projects pinned to it.
>
> **Each phase merges on its own** (design D-12). When a phase's verification passes,
> `cookbook` merges into `development` — from Phase 1 on with a current `verified.json`,
> which CI enforces. A merge into `main` between phases publishes the catalog verified so
> far.
>
> **Phase order.** Phase 0 comes before any new link to the cookbook (design Goal 6), and
> does not need the prerequisite. Phase 1 needs the prerequisite and comes before everything
> else. Phases 2 and 3 each need only Phase 1. Phase 5 needs `llms.txt` to be live.

_Design: [cookbook-design.md](cookbook-design.md) — full rationale and the reasoning behind every item below. Section references (§) point into it._

_Umbrella: [developer-onboarding-roadmap.md](../developer-onboarding/developer-onboarding-roadmap.md) — items B-2 (recipes) and E-2 (`llms.txt`), stage A3._

**Format note:** this follows the layout of
[`../app-sdk/app-sdk-checklist.md`](../app-sdk/app-sdk-checklist.md): all phases in one file,
then a per-recipe status table, the current verification record, and the final
verification.

**Repository note:** unless a step says otherwise, paths are relative to
`cytoscape-web-app-examples/`. Paths prefixed `cytoscape-web/` are in the **host** repository,
which this project only reads and runs. It changes no host file.

**Local setup:** a plain `npm install`. It resolves `@cytoscape-web/api-types@1.0.0-beta.5`
from the registry. The local-tarball procedure in `CLAUDE.md` is only for a version that is
not on npm yet.

---

## Prerequisite: Adopt the published beta.5 ✅ **COMPLETE (2026-10-07)** — PR #21

_Design: §5 Dependencies, D-4_

Ordinary maintenance that every app needs, so it landed on `development` in its own pull
request rather than inside the cookbook. Tracked here because Phase 1's CI cannot typecheck
the cookbook without it. The maintainer approved the `package.json` changes
(`CLAUDE.md` §1).

> **Done in [#21](https://github.com/cytoscape/cytoscape-web-app-examples/pull/21)**
> (merged as `4532bfc`), and `create-cytoscape-app@0.4.2` is on npm as `latest`, with
> provenance. The release run's read-back step timed out on a slow registry although the
> publish had succeeded; a re-run of the failed job passed both the read-back and the smoke
> step. [#22](https://github.com/cytoscape/cytoscape-web-app-examples/pull/22) (`183f594`)
> lengthened the registry waits to one 15-minute deadline per step, and records the incident
> in `../app-sdk/phase6-release-runbook.md` §3f.

- [x] Move `@cytoscape-web/api-types` from `^1.0.0-beta.4` to `^1.0.0-beta.5` in the root and
      in all four apps, and update the lockfile. The lockfile diff is limited to the
      api-types entries and the scaffolder's version
- [x] `API_TYPES_VERSION` in `packages/create-cytoscape-app/src/scaffold.ts` →
      `1.0.0-beta.5`; the exact-pin test in `scaffold.test.ts` passes
- [x] Update `CLAUDE.md`: the note that the repository still depended on beta.4 types (#21),
      and the "(`1.0.0-beta.5` until it is published)" example in "Developing against an
      unpublished api-types" (with the merge into `cookbook`, `28d3ee4`)
- [x] `npm run typecheck`, `npm test`, `npm run build` and `npm run verify:federation` pass,
      locally and in CI (all four apps pass 28/28 federation checks)
- [x] Bump the `create-cytoscape-app` version to `0.4.2`, release it, and confirm it was
      **published, not skipped**. The release run is
      [37595811547](https://github.com/cytoscape/cytoscape-web-app-examples/actions/runs/37595811547),
      green on its second attempt
- [x] Outside the monorepo, a project scaffolded with the released version pins
      `1.0.0-beta.5` and builds. Checked twice: by hand (`npm install create-cytoscape-app@latest`,
      the `panel` template, `build:zip` with a `cy-manifest.json`, and `tsc --noEmit` with
      `skipLibCheck: false`), and by the release workflow's smoke step on the re-run
- [x] Merged into `development` (#21), then `development` merged into `cookbook` (`28d3ee4`).
      On the merged branch, `typecheck` is clean and all workspaces' tests pass, including
      the 9 in network-statistics

---

## Phase 0: Corrections ✅ **COMPLETE (2026-10-07)** — #23, plus the addendum from its review

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

- [x] README event table: add `network:changed`, `network:loaded` and `style:switched`, with
      "fires when" text taken from the doc comments in `events.ts`. `network:switched` now
      warns that the data may not be loaded yet, and `layout:completed` says it fires on
      success only
- [x] README API table: add `cyweb/PanelApi`, `cyweb/AppDataApi` and `cyweb/ScopedApi`. The
      `AppIdContext` row now says it carries the app's own `apis`
- [x] `LayoutSection.tsx`: failure is a resolved, failed `ApiResult`, not a rejection. Fixed the
      comment and removed the `.catch()`. Also corrected: `layout:completed` fires on success
      only, just *before* the Promise resolves (host `layoutApi.ts`), not after
- [x] `lessons.md`: remove both `remotes.d.ts` rules and the `remotes.d.ts` step of the "File
      Update Checklist". Replace the stale port list (`simple-menu`, `simple-panel`) with a
      pointer to each app's `cyweb` block
- [x] Any other contradiction found on a page the cookbook links to (README, `guides/`,
      `hello-world`): fix it here. Found and fixed:
  - [x] **The menu is "Manage Apps...", not "App Settings"** (host `AppMenu`, renamed
        2025-11): README, three guides, and all four app READMEs
  - [x] **README "Non-React Access":** `await window.CyWebApi.whenReady()` instead of the
        one-shot `cywebapi:ready` event, and the anonymous `contextMenu` / `nodeGraphics` /
        `panel` versus the per-app `apis` (design §4.4)
  - [x] **`npm run dev:local` is the same command as `npm run dev`** in the host; the dev
        server always serves `apps.local.json`. hello-world and network-workflows READMEs
  - [x] **hello-world README:** the file layout listed three files the SDK migration deleted;
        Example 3 repeated the `.catch()` advice; "Creating your own app" taught copying the
        template, editing `vite.config.ts` and the host's `apps.local.json` (now a pointer to
        `npm create cytoscape-app`); its API and event tables were stale duplicates, one
        claiming image export (now pointers to the repository README)
  - [x] **`guides/troubleshooting.md`** mocked `cyweb/*` with `jest.mock` in a Vitest
        repository
  - [x] **`lessons.md`** recommended the legacy `cyweb/*Store` exposes as the access pattern
  - [x] **`guides/architecture-overview.md`**, "Host Exposes Reference": the table omitted
        `PanelApi`, `ScopedApi` and `AppDataApi` and claimed image export. Missed in #23 —
        the check covered the README alone — and caught by its review (design §8)
- [x] Not fixed, deliberately: the other `.serena/memories/*` files (a full E-1a sweep, out of
      scope), and the hello-world "Code style" note about ESLint and Prettier, which is
      tooling rather than API

### Verification (Phase 0)

- [x] The README event table names every key of `CyWebEventMap` except `cywebapi:ready`, which
      the README documents under "Non-React Access" (11 of 11, checked by script against the
      host's `origin/development`)
- [x] Every page that lists the `cyweb/*Api` exposes — the README's API table and
      `guides/architecture-overview.md`'s "Host Exposes Reference" — names all 12 in
      `federationExposes.ts`. *(After #23's review; #23 itself checked the README alone)*
- [x] `grep -n remotes.d.ts .serena/memories/lessons.md` finds nothing
- [x] `npm run typecheck` and `npm test` still pass (every workspace; hello-world also builds,
      and `check:imports` passes)
- [x] **Merged into `development`** (D-12): #23 (`a35f430`), without a verification record,
      as D-12 allows for Phase 0. The review's three points land in a follow-up pull request

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

### Deliverables — CI check for a stale record (§4.7)

- [ ] A CI job recomputes the cookbook digest and the resolved api-types version, and fails
      when either differs from `verified.json`. This is what makes per-phase merges safe

### Deliverables — README link (§4.9)

- [ ] **After Phase 0 only:** a short "Building with an AI assistant" section near the top of
      `README.md` that links the **cookbook index**, and a Cookbook row in the Documentation
      Map. No `llms.txt` link yet: it is not live until Phase 2 reaches `main`

### Verification (Phase 1)

- [ ] `npm run typecheck`, including the cookbook, passes in CI on the registry beta.5
- [ ] `node scripts/cookbook-index.mjs --check` passes, and every rejection fixture fails as
      expected
- [ ] The runner passes all three cases against a host on `localhost:5500` (`development`),
      started fresh from a clean checkout, and `--selftest` fails
- [ ] Two consecutive runs leave no fixture network behind
- [ ] `verified.json` exists and records the **registry** beta.5 as its source
- [ ] The stale-record check fails on a changed recipe without a refreshed `verified.json`
      (**seen failing**)
- [ ] `npm run manifest:validate`, `npm run check:imports` and `npm test` still pass
- [ ] **Merged into `development`**, with the current `verified.json` (D-12)

---

## Phase 2: Catalog ⬜ **NOT STARTED**

_Design: §4.7, §4.10_

The other 17 host-wide recipes, and the generation path for `llms.txt` and
`llms-full.txt`.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `cytoscape-web/src/app-api/core/networkApi.ts` | `createNetworkFromEdgeList` takes only `[source, target, interaction]`; `createNetworkFromCx2` and its `navigate` / `addToWorkspace` |
| `cytoscape-web/src/app-api/core/exportApi.ts` | `exportToCx2`, the first step of `subnetwork-from-selection` |
| `cytoscape-web/src/app-api/core/tableApi.ts` | `importTableFromTsv` and its `keyColumn` (default `id`) |
| `cytoscape-web/src/models/VisualStyleModel/VisualPropertyName.ts` | `NodeBorderWidth`, `NodeBorderColor`, `NodeVisibility`, `EdgeVisibility` |

### Deliverables — recipes (§4.10)

Each recipe has a complete header, covers the pitfall topics for its kind, and has a case
(see the Recipe status table below).

- [ ] `network/create-network-from-table`
- [ ] `network/subnetwork-from-selection`
- [ ] `elements/add-edges-between-selected`
- [ ] `elements/delete-selected`
- [ ] `data/add-computed-column`, with degree as its example
- [ ] `data/read-column-values-safely`
- [ ] `data/join-table-by-key`
- [ ] `style/size-nodes-by-degree`
- [ ] `style/color-by-category`
- [ ] `style/label-from-column`
- [ ] `style/highlight-with-bypass`
- [ ] `style/set-style-defaults`, whose "Don't" covers a bypass on every node
- [ ] `style/emphasize-by-threshold`
- [ ] `style/hide-by-threshold`
- [ ] `selection/select-neighbors`, taking a hop count
- [ ] `selection/select-by-attribute`
- [ ] `layout/run-layout-and-wait`

### Deliverables — `llms.txt` and `llms-full.txt` (§4.7)

Pages serves `main:/docs` **as committed** (`build_type: legacy`), so the files are generated
and committed into `docs/`, never generated in a workflow (design D-13).

- [ ] The generator writes `docs/llms.txt` and `docs/llms-full.txt`:
  - [ ] The pinned commit is the last one that changed `cookbook/` or `guides/`
        (`git log -1 -- cookbook guides`). Regenerate in a commit **after** the source change
  - [ ] `llms.txt` links every recipe and wiring file through `raw.githubusercontent.com`
        URLs pinned to that commit, and links the API reference pinned to the host commit in
        `verified.json`
  - [ ] `llms-full.txt` = `USING-RECIPES.md` + every wiring file + every recipe + pinned API
        reference links. It does not copy the API reference
  - [ ] Both open with the pinned examples commit, the host commit and the api-types version
- [ ] The generator **refuses** when the digest does not match `verified.json`, or when the
      api-types source is not the registry
- [ ] `ci.yml`: a job that checks out **full history** (`fetch-depth: 0`), runs `--check` on
      the index, regenerates `docs/llms*.txt` in memory for the pinned commit, fails on any
      difference from the committed files, and runs the structure checks (§4.7). On
      `pull_request` it checks out `github.event.pull_request.head.sha` explicitly
- [ ] `deploy-pages.yml` is **not** changed: its output is never served

### Verification (Phase 2)

- [ ] 20 recipes (Phases 1 and 2), and all their cases pass
- [ ] The generator refuses a `verified.json` whose digest does not match, and one recorded
      from a local tarball (**seen failing**, both)
- [ ] The CI check fails when a recipe changes without regenerating `docs/llms*.txt`
      (**seen failing**)
- [ ] The structure check fails on a fixture with a missing recipe, and on one with a link to
      a nonexistent path
- [ ] The CI jobs pass on both a `push` and a `pull_request` run
- [ ] **Merged into `development`**, with the current `verified.json` (D-12)

### After the first merge into `main` that includes Phase 2

- [ ] `llms.txt` and `llms-full.txt` are served from Pages, and their links resolve
- [ ] The README's "Building with an AI assistant" section gains the `llms.txt` link

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
- [ ] † `ui/link-out-from-node` (formerly `node-context-menu`)
- [ ] † `ui/open-own-panel-after-action`
- [ ] † `ui/persist-results-per-network`

### Deliverables — behavior cases (§4.4)

- [ ] **Duplicate tab id:** the app's own tab is selected
- [ ] **Disable:** the runner disables the app through the host UI, and every registration it
      made (context menu item, layout algorithm, panel tab) is gone

### Verification (Phase 3)

- [ ] All 25 recipes have a case, and every case passes. There are no exemptions (D-9)
- [ ] The allowed-forms check rejects a fixture that passes `window.CyWebApi`, and one that
      destructures `apis`
- [ ] `verified.json` is refreshed; its digest now covers `runner/app`
- [ ] **Merged into `development`**, with the current `verified.json` (D-12)

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
- [ ] **Merged into `development`** (D-12)

---

## Phase 5: Point the scaffolder at the cookbook ⬜ **NOT STARTED**

_Design: §4.7, §4.8, §7_

Strictly in the order of §4.8. **The cookbook must be live before the scaffolder points at
it.** The api-types pin itself moved in the prerequisite pull request; this phase adds only
the pointer.

### Step 1 — Confirm the cookbook is live

- [ ] `llms.txt` and `llms-full.txt` are served from Pages
- [ ] Their header names the pinned examples commit, the host commit in `verified.json`, and
      the api-types version
- [ ] Every link in `llms.txt` resolves

### Step 2 — Prepare the scaffolder

- [ ] `AGENTS_PLACEHOLDER` in `scripts/sync-templates.mjs`: one section naming the `llms.txt`
      URL. Regenerate the templates
- [ ] `API_TYPES_VERSION` equals the version in `verified.json`
- [ ] Bump the `create-cytoscape-app` version. The release workflow skips a version already on
      npm. Bump `@cytoscape-web/app-runtime` too, if it changed
- [ ] Outside the monorepo, scaffold every template from **packed tarballs** and build it. Its
      `AGENTS.md` names the `llms.txt` URL
- [ ] CI is green on the pull request, and it is merged into `development`

### Step 3 — Publish the scaffolder

- [ ] Run the release-packages workflow, and confirm that `create-cytoscape-app` was
      **published, not skipped**

### Step 4 — Check what was published

- [ ] Outside the monorepo, scaffold with the released `create-cytoscape-app@<version>` and
      build. The project pins the version in `verified.json`, and its `AGENTS.md` URL resolves
- [ ] The README's "Building with an AI assistant" section names the scaffolded `AGENTS.md`
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

The kind decides the required pitfall topics (§4.2); a recipe may have more than one. The
kinds below are an initial assignment; `WRITING-RECIPES.md` is authoritative. "Runner" means
the minimal runner; "App" means the Phase 3 verification app. Recipes still in the backlog
(design §4.12) are not listed here until they enter the catalog (D-11).

| Recipe | Kind | Verified by | Phase | Types | Case passes |
|---|---|---|---|---|---|
| ★ `elements/add-nodes-to-network` | Mutation | Runner | 1 | [ ] | [ ] |
| ★ `style/color-nodes-by-numeric-column` | Numeric mapping | Runner | 1 | [ ] | [ ] |
| `events/follow-current-network` | Events and async | Runner | 1 | [ ] | [ ] |
| `network/create-network-from-table` | Mutation | Runner | 2 | [ ] | [ ] |
| `network/subnetwork-from-selection` | Mutation | Runner | 2 | [ ] | [ ] |
| `elements/add-edges-between-selected` | Mutation | Runner | 2 | [ ] | [ ] |
| `elements/delete-selected` | Mutation | Runner | 2 | [ ] | [ ] |
| `data/add-computed-column` | Mutation | Runner | 2 | [ ] | [ ] |
| `data/read-column-values-safely` | Numeric mapping | Runner | 2 | [ ] | [ ] |
| `data/join-table-by-key` | Mutation | Runner | 2 | [ ] | [ ] |
| `style/size-nodes-by-degree` | Numeric mapping | Runner | 2 | [ ] | [ ] |
| `style/color-by-category` | — | Runner | 2 | [ ] | [ ] |
| `style/label-from-column` | — | Runner | 2 | [ ] | [ ] |
| `style/highlight-with-bypass` | Mutation | Runner | 2 | [ ] | [ ] |
| `style/set-style-defaults` | Mutation | Runner | 2 | [ ] | [ ] |
| `style/emphasize-by-threshold` | Numeric mapping | Runner | 2 | [ ] | [ ] |
| `style/hide-by-threshold` | Numeric mapping, Mutation | Runner | 2 | [ ] | [ ] |
| `selection/select-neighbors` | — | Runner | 2 | [ ] | [ ] |
| `selection/select-by-attribute` | — | Runner | 2 | [ ] | [ ] |
| `layout/run-layout-and-wait` | Events and async | Runner | 2 | [ ] | [ ] |
| † `layout/register-app-layout` | — | App | 3 | [ ] | [ ] |
| † `ui/menu-action-with-dialog` | — | App | 3 | [ ] | [ ] |
| † `ui/link-out-from-node` | — | App | 3 | [ ] | [ ] |
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
- [ ] 4 — On `push` and `pull_request`, CI regenerates `docs/llms*.txt` for the pinned commit
      from full history and finds them equal to the committed files
- [ ] 5 — Every recipe has a passing real-host case, including the duplicate tab id and
      disable cases
- [ ] 6 — The runner waits for readiness, the active app and the boot report, and cleans up
      in `finally`
- [ ] 7 — Changing anything under `recipes/`, `wiring/` or `runner/` without re-running the
      runner fails CI; the generator refuses to write `docs/llms*.txt` from it
- [ ] 8 — The Pages files were live before the scaffolder that points at them was published;
      the scaffolder's version was bumped
- [ ] 9 — A project scaffolded outside the monorepo pins the verified version and builds
- [ ] 10 — The agent acceptance test is recorded above
- [ ] 11 — The Phase 0 corrections landed before the README linked the cookbook

### Deferred, deliberately

- [ ] **Per-recipe minimum versions** (D-7) — needs verification against several versions
- [ ] **Recipes inside an npm package** (D-3) — revisited after the API reaches GA
- [ ] **The runner in CI** (O-2) — needs a deployed beta.5 host
- [ ] **The public Cookbook app** — Phase 6
- [ ] **The backlog** (design §4.12): seven planned recipes and four that need a feasibility
      check, added one at a time once Phase 3 is complete (D-11, O-1). Each addition adds a
      row to the Recipe status table
- [ ] **The API gaps** in design §4.12 (image export, zoom to selection, laying out only the
      selection, groups, annotations, legends) — host-side work, not recipes
- [ ] **`AGENTS.md` content (E-1b, E-1c), `api-surface.json` (E-3), a full E-1a sweep** —
      outside this project (D-1)

### Known non-issues

- [ ] **A merge into `main` between phases publishes a partial catalog.** That is intended: every
      recipe in it was verified (D-12)
- [ ] **`app-runtime`'s `manifestCommand.test.ts` fails on macOS's default `TMPDIR`**, which
      sits under the `/var` symlink. Unrelated to the cookbook; see `.serena/memories/lessons.md`
