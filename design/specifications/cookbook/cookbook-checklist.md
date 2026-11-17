# Implementation Checklist — Cookbook

> Track progress across the seven phases (0–6). Mark `[x]` when complete. Run the per-phase
> verification before starting the next phase.
>
> **Status: Prerequisite and Phase 0 COMPLETE (2026-10-07). Next: the Phase 0 follow-up,
> then Phase 1 — start at its "Pre-read files".** The design is at revision 8: three
> reviews, a catalog of 25 recipes with a backlog, a plan for the published beta.5,
> `llms.txt` committed into `docs/`, and a review after a pause. Work happens on the
> `cookbook` branch of this repository, which is level with `development` at `1f1a902`
> (#25 also removed an `npm pack` race from app-runtime's tests).
>
> **Reviewed on 2026-11-16, after five weeks without work.** This repository did not
> change. The host released 1.1.0 and 1.1.1, and its `development` moved to `7714c138`.
>
> **The cookbook supports Cytoscape Web 1.1.0 and later** (design D-16). The floor is
> 1.1.0 (tag `v1.1.0`, `6619411b`), which production served on 2026-11-16. The latest
> release is 1.1.1 (tag `v1.1.1`, `c3118c51`), under test on dev1. Every recipe, case and
> corrected page must be right on both, and the record needs an entry for each. Design §8,
> "Review after a pause", lists what the host changed and which release has it. What the
> review added here: a Phase 0 follow-up, a runner that serves an empty app catalog and
> records one entry per release (Phase 1), new "Pre-read files", and notes on the recipes
> whose host behavior differs between 1.1.0 and 1.1.1.
>
> **beta.5 is on npm** (2026-10-05, `latest`), and this repository now depends on it: the
> prerequisite pull request (design D-4, #21) is merged, and `create-cytoscape-app@0.4.2`
> generates projects pinned to it. **beta.6 is not published** (checked 2026-11-16). The
> cookbook stays on beta.5 until it is, and then adopts it in a pull request of its own
> (design D-15).
>
> **Each phase merges on its own** (design D-12). When a phase's verification passes,
> `cookbook` merges into `development` — from Phase 1 on with a current `verified.json`,
> which CI enforces. A merge into `main` between phases publishes the catalog verified so
> far.
>
> **Phase order.** Phase 0 and its follow-up come before any new link to the cookbook
> (design Goal 6), and do not need the prerequisite. Phase 1 needs the prerequisite and
> comes before everything else. Phases 2 and 3 each need only Phase 1. Phase 5 needs
> `llms.txt` to be live.
>
> **Read every host file at both tags, `v1.1.0` and `v1.1.1`,** not at `development` and
> not in a working tree that follows it: `git -C ../cytoscape-web show v1.1.0:<path>`, or
> a worktree of each tag. A file marked "(1.1.1)" does not exist at `v1.1.0`, or differs
> there.

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
not on npm yet, and the cookbook does not use it for beta.6 (design D-15). The hosts are
checkouts of the tags `v1.1.0` and `v1.1.1`, for example two worktrees of one
`cytoscape-web` clone. Run them with Node 24.22.1 or later: 1.1.1 requires it, and it
satisfies 1.1.0.

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
  - [x] **`guides/architecture-overview.md`**, its event table (three events missing, no
        loading caveat on `network:switched`, `layout:completed` not success-only, an old
        `data:changed` payload) and its API-layer examples (the anonymous `nodeGraphics` and
        `panel`, and four of the six owner-bound domains, were missing). Missed again in
        #24 and caught by its review (design §8)
- [x] Not fixed, deliberately: the other `.serena/memories/*` files (a full E-1a sweep, out of
      scope), and the hello-world "Code style" note about ESLint and Prettier, which is
      tooling rather than API

### Verification (Phase 0)

- [x] Every event table — the README's and `guides/architecture-overview.md`'s — names every
      key of `CyWebEventMap` except `cywebapi:ready`, which the README documents under
      "Non-React Access" (11 of 11 each, checked by script against the host's
      `origin/development`). *(#23 checked the README alone)*
- [x] Every page that lists the `cyweb/*Api` exposes — the README's API table and
      `guides/architecture-overview.md`'s "Host Exposes Reference" — names all 12 in
      `federationExposes.ts`. *(After #23's review; #23 itself checked the README alone)*
- [x] `grep -n remotes.d.ts .serena/memories/lessons.md` finds nothing
- [x] `npm run typecheck` and `npm test` still pass (every workspace; hello-world also builds,
      and `check:imports` passes)
- [x] **Merged into `development`** (D-12): #23 (`a35f430`), without a verification record,
      as D-12 allows for Phase 0. The review of #23 was handled in #24 (`a6e8ba9`), and the
      review of #24 in the same pull request (design §8)
- [x] **Checked again on 2026-11-16** at the tags `v1.1.0` and `v1.1.1` and on the host's
      `origin/development` (`7714c138`): on each, `CyWebEventMap` has the same 11 events
      besides `cywebapi:ready`, and `federationExposes.ts` the same 12 `cyweb/*Api`
      exposes. The tables fixed above need no change

---

## Phase 0 follow-up: found in the review of 2026-11-16 ⬜ **NOT STARTED**

_Design: §4.9, §8 "Review after a pause", Goal 6, criterion 11, D-16_

The pages the cookbook links to must be right on host **1.1.0 and 1.1.1**. One statement
is wrong on both. Two are right on 1.1.0 only, because 1.1.1 changed how apps start; they
are reworded to hold on both, not replaced. Do this before Phase 1 adds the README link.
Like Phase 0, this is not a full sweep (roadmap E-1a).

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `cytoscape-web/src/features/AppManager/install/installConfirmedApps.ts` | An install link installs with `activate: true`, at both tags |
| `cytoscape-web/src/data/hooks/stores/useAppManager.ts` | At `v1.1.0`, the startup auto-load takes the active set from the workspace's records: catalog apps start off |
| `cytoscape-web/src/models/AppModel/impl/startupAppStatus.ts` (1.1.1) | The rule that turns a catalog app on at startup |
| `cytoscape-web/src/features/AppManager/AppManager_docs/AppManager.md` (1.1.1) | "App Management": core apps, and what a failed load shows |
| `README.md`, `CLAUDE.md`, `guides/getting-started.md`, `guides/troubleshooting.md`, the four app READMEs | The statements to check |

### Deliverables

Confirm each behavior in a running host of each release before changing the text.

- [ ] **After an install link (wrong on both).** `README.md`, `guides/getting-started.md`
      and `project-template/README.md` say to confirm the install and then enable the app.
      Confirming already turns it on. Phase 0 missed it
- [ ] **"Enable one under Manage Apps" (right on 1.1.0 only).** Catalog apps start off on
      1.1.0. From 1.1.1 on, a dev host turns the four example apps on by itself. Reword
      each sentence so that it holds on both, for example "enable it there if it is not
      already on":
  - [ ] `README.md` (the quick start for all four apps)
  - [ ] `hello-world/README.md`, `network-statistics/README.md`,
        `network-workflows/README.md`
  - [ ] `CLAUDE.md` §5, "Connect to Local Host"
  - [ ] Say what a reader on 1.1.1 sees when an app's dev server is not running: a load
        failure in the startup toast and on the app's row
- [ ] **Where production apps are registered (right on 1.1.0 only).** `CLAUDE.md` §2 and
      `guides/troubleshooting.md` ("Can I publish my app to npm?") name the host's
      `src/assets/apps.json`. From 1.1.1 on it is empty in the host repository, a
      deployment's build puts in its own list, and every entry is on by default for every
      user. Reword both to "the deployment's curated `apps.json`", and point to the
      README's "Publishing to the public Cytoscape Web site"
- [ ] Not changed, deliberately: `guides/architecture-overview.md`'s "curated `apps.json`"
      and the README's "curated allowlist", which are right on both

### Verification (Phase 0 follow-up)

- [ ] In a 1.1.0 host with a fresh profile: the four example apps are off until enabled
- [ ] In a 1.1.1 host with a fresh profile: the four example apps are on without a click
- [ ] In both: an app installed from its install link is on after the confirmation
- [ ] No page tells the reader to enable an app that is already on in either release
- [ ] `npm run typecheck` and `npm test` still pass
- [ ] **Merged into `development`**, without a verification record (D-12), on its own or
      together with Phase 1. Either way its commits come before the one that adds the
      README link

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
| `cytoscape-web/vite.config.ts`, `cytoscape-web/src/app-api/constants.ts` | `appsConfigPlugin` and `DEFAULT_MANIFEST_URL`: the catalog request the runner intercepts is `/apps.json` at `v1.1.0` and `<base>apps.json` at `v1.1.1` (design D-14). Also `gitCommit`: the build commit is `git rev-parse --short HEAD` |
| `cytoscape-web/package.json`, `cytoscape-web/.nvmrc` | The version and Node requirement at each tag. `development` reports `1.1.1` too, which is why the runner matches by commit |
| `cytoscape-web/packages/api-types/CHANGELOG.md` (1.1.1) | The "1.0.0-beta.6 (unpublished)" section: what 1.1.1 does that 1.1.0 and beta.5 do not |
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

- [ ] `cookbook/USING-RECIPES.md`, including which host releases are supported, what
      `verified.json` records about them, and that a recipe's header states where they
      differ (§4.6)
- [ ] `cookbook/WRITING-RECIPES.md`, including the required pitfall topics (§4.2), the
      import rules (§4.3), the **allowed `apis` forms** (§4.4), and the rule that a recipe
      is right on every supported release and states a difference by version (§4.10, D-16)
- [ ] `cookbook/runner/README.md`, including how to start a host from a checkout of each
      tag, `v1.1.0` and `v1.1.1`, in a standalone clone (`dev-start.sh` lives in the parent
      workspace repository, not here), and why the runner serves an empty app catalog and
      records only a release's tag commit

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
- [ ] Before navigating, answer the request for the app catalog with `[]` (Playwright
      `route`; `/apps.json` on 1.1.0, `<base>apps.json` from 1.1.1), and fail the run if
      the request was never intercepted (design D-14). On 1.1.0 catalog apps start off
      anyway; on 1.1.1 this is what keeps the example apps out
- [ ] The runner's configuration lists the supported releases with their tag commits:
      1.1.0 `6619411b`, 1.1.1 `c3118c51` (design D-16)
- [ ] Read `report.build.version` and `.commit`. Write that release's entry only when the
      commit is its tag commit. On any other host, say so, report the cases' results, and
      write nothing
- [ ] Pass the host version to each case. A case branches on it only to assert a
      difference that its recipe's header states
- [ ] `await window.CyWebApi.whenReady()`, then wait, **with a time limit**, for
      `window.debug.boot.report`. Fail if it does not appear, or if
      `report.build.commit` is `unknown`
- [ ] Each case builds an isolated fixture with `network.createNetworkFromEdgeList` and reads
      the result back through the read-side APIs
- [ ] Cleanup in `finally`, pass or fail: the fixture network, subscriptions, registrations
- [ ] A single case can be run by id; `--selftest` proves the runner can fail
- [ ] A full, passing run writes `cookbook/verified.json`:
  - [ ] api-types exact version, and its source (registry or local)
  - [ ] one host entry per verified release, with its version and commit. A run adds or
        replaces its own release's entry, and drops an entry made from another digest
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
- [ ] The runner passes all three cases against a host on `localhost:5500`, started fresh
      from a clean checkout of the tag `v1.1.0`, and again from one of `v1.1.1`.
      `--selftest` fails
- [ ] Two consecutive runs leave no fixture network behind, on each
- [ ] The run fails when the catalog request is not intercepted (**seen failing**, with the
      route pattern changed)
- [ ] On the 1.1.1 host, the run gives the same results with the four example apps' dev
      servers running and with them stopped, and the host loads no example app
- [ ] Against a host that is not a tag commit (`development`, or dev1 while it serves a
      pre-release build), the cases run and **no entry is written** (**seen**)
- [ ] `verified.json` exists and records the **registry** beta.5 as its source, and two
      host entries from the same digest: 1.1.0 (`6619411b`) and 1.1.1 (`c3118c51`)
- [ ] The stale-record check fails on a record with only one of the two entries
      (**seen failing**)
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
| `cytoscape-web/src/app-api/core/networkApi.ts` (again) | `createNetworkFromNodeList`: a subnetwork in one call, the first candidate for `subnetwork-from-selection` |
| `cytoscape-web/src/app-api/core/exportApi.ts` | `exportToCx2`: the other candidate, as a CX2 round trip with `createNetworkFromCx2` |
| `cytoscape-web/src/app-api/core/tableApi.ts` | `importTableFromTsv` and its `keyColumn` (default `id`). Column names are matched exactly at `v1.1.0`, and ignoring case at `v1.1.1` |
| `cytoscape-web/src/app-api/core/validation.ts` | Column names: at `v1.1.0`, `id` is rejected and an exact duplicate fails with `AC6`; at `v1.1.1`, both ignoring case |
| `cytoscape-web/src/app-api/api_docs/Api.md` | At both tags, the sections on `createColumn`, `importTableFromTsv`, `createNetworkFromCx2` and `switchCurrentNetwork`: they differ |
| `cytoscape-web/src/data/select/selectCommands.ts` (1.1.1) | `hideSelected` and `showAll`: what the Select menu does to visibility bypasses |
| `cytoscape-web/src/models/VisualStyleModel/VisualPropertyName.ts` | `NodeBorderWidth`, `NodeBorderColor`, `NodeVisibility`, `EdgeVisibility` |

### Deliverables — recipes (§4.10)

Each recipe has a complete header, covers the pitfall topics for its kind, and has a case
(see the Recipe status table below), which passes on 1.1.0 and on 1.1.1. The notes marked
"Releases:" come from the review of 2026-11-16 (design §4.10): the recipe's code behaves
the same on both, and its header states the host's difference by version. "Check" means:
observe it on a host of each release before the header states it.

- [ ] `network/create-network-from-table`. Releases: on 1.1.0, after the call makes the
      network current, the table browser and layout tools still act on the network shown
      before; 1.1.1 fixes it (#927). A pitfall, by version
- [ ] `network/subnetwork-from-selection`. Choose between `createNetworkFromNodeList` and
      the CX2 round trip, and say why in the header. Releases: the same pitfall as above
- [ ] `elements/add-edges-between-selected`
- [ ] `elements/delete-selected`. Releases: 1.1.0 binds no Delete or Backspace key, 1.1.1
      does (#867). Check what Edit ▸ Undo restores after the deletion on each (#857 is in
      1.1.1 only)
- [ ] `data/add-computed-column`, with degree as its example. Releases: names are compared
      exactly on 1.1.0 and ignoring case on 1.1.1, where a clash fails with `AC6`. The
      header says to choose a name that differs from existing ones by more than case
- [ ] `data/read-column-values-safely`
- [ ] `data/join-table-by-key`. Releases: TSV columns match existing ones exactly on 1.1.0
      and ignoring case on 1.1.1. The case uses the existing columns' exact spelling, so it
      passes on both
- [ ] `style/size-nodes-by-degree`
- [ ] `style/color-by-category`
- [ ] `style/label-from-column`
- [ ] `style/highlight-with-bypass`
- [ ] `style/set-style-defaults`, whose "Don't" covers a bypass on every node
- [ ] `style/emphasize-by-threshold`
- [ ] `style/hide-by-threshold`. Releases: say what the FILTER tab's show mode (both) and
      the Select menu's Show All (1.1.1 only) do to the elements the recipe hid. Check
      whether selecting a hidden element shows it again on each (`0f8b7f42` is in 1.1.1
      only)
- [ ] `selection/select-neighbors`, taking a hop count
- [ ] `selection/select-by-attribute`
- [ ] `layout/run-layout-and-wait`. The example lays out the current network. Check which
      view is fitted for a network that is not current; the fix (#964) is in neither
      release, so both should behave alike. Name `fitAfterLayout: false` for that use
- [ ] No recipe or case uses two column names that differ only by case (design §4.10)

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
- [ ] On `pull_request`, the same job inspects the default merge checkout and fails when the
      last commit to change `cookbook/` or `guides/` there is the merge itself (both sides
      changed linked sources)
- [ ] `scripts/manifest.mjs`: add `llms.txt` and `llms-full.txt` to `RESERVED_PUBLISH_PATHS`,
      because `copy-dist.mjs` deletes `docs/<publishPath>` before copying an app
- [ ] `deploy-pages.yml` is **not** changed: its output is never served

### Verification (Phase 2)

- [ ] 20 recipes (Phases 1 and 2), and all their cases pass on 1.1.0 and on 1.1.1
- [ ] The generator refuses a `verified.json` whose digest does not match, and one recorded
      from a local tarball (**seen failing**, both)
- [ ] The CI check fails when a recipe changes without regenerating `docs/llms*.txt`
      (**seen failing**)
- [ ] The merge-result check fails when `development` and the branch both changed a linked
      source (**seen failing**)
- [ ] `npm run manifest:validate` rejects an app whose `publishPath` is `llms.txt` or
      `llms-full.txt` (**seen failing**)
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

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `cytoscape-web/src/features/AppManager/AppListPanel.tsx`, `cytoscape-web/src/data/hooks/stores/useAppManager.ts` | At both tags: the switch that disables an app, and how an app is activated and deactivated. 1.1.1 adds host compatibility and version ranking |
| `cytoscape-web/src/boot/steps/runInstallIntents.ts`, `cytoscape-web/src/features/AppManager/install/installConfirmedApps.ts` | `?installApp=`: the origin gate, the confirmation dialog, `activate: true`; from 1.1.1 also the host-version gate |
| `cytoscape-web/src/app-api/core/panelApi.ts`, `cytoscape-web/src/app-api/types/PanelTypes.ts` | The right pane: at `v1.1.0` it always holds `'sub-network-viewer'`, first and selected by default; at `v1.1.1` that tab exists only for a hierarchy and the pane is shown only while it has a tab (#877) |
| `cytoscape-web/src/app-api/core/perAppApis.ts` | The six owner-bound domains, and what disabling removes |
| `packages/app-runtime/src/vite/devInstall.ts` | The install manifest and link the app's dev server offers |
| `scripts/preflight-apps.mjs`, `apps.manifest.json` | The `smokeObservable` pattern, and whether its `openRightPanel` step works on both right panes |
| `cytoscape-web/src/app-api/api_docs/Api.md` (1.1.1) | "Host Keyboard Shortcuts": Undo and Redo do not act while a dialog from `apis.dialog.open` is open |

### Deliverables — the app (§4.1, §4.6)

- [ ] `cookbook/runner/app/` with its own `package.json` and `cyweb` block. It is in neither
      the root `workspaces` nor `apps.manifest.json`. Its port must not collide with 2222,
      3333, 5555, 6100 or 7001
- [ ] `vite.config.ts` calls `defineCyWebApp`. The runner starts the dev server with
      `runner/app` as the working directory; dependencies resolve from the root
      `node_modules`
- [ ] `mount()` registers resources and stores `context.apis` on the harness, in the one
      allowed harness assignment. It runs no case and waits for no UI (§4.5)
- [ ] The runner installs the app with `?installApp=`, confirms the host's install dialog,
      waits until it is active (open the right panel, select the app's tab by id and wait
      for the app's panel, as `smokeObservable` does), then drives the cases. On 1.1.0 the
      Sub Network Viewer tab is first and selected, so the tab must be selected; on 1.1.1
      the app's tab is first, and the pane can be opened only once the tab is registered
      (#877). Selecting by id after the app is active is right on both
- [ ] The empty catalog of Phase 1 still applies, so the verification app is the only app
      in the page (design D-14)
- [ ] Each run uses a fresh browser context. Cleanup in `finally` stops the dev server

### Deliverables — recipes (§4.10)

- [ ] † `layout/register-app-layout`
- [ ] † `ui/menu-action-with-dialog`
- [ ] † `ui/link-out-from-node` (formerly `node-context-menu`)
- [ ] † `ui/open-own-panel-after-action`. Pass the app's own tab id. Releases: without
      one, `panel.open('right')` opens the pane on the Sub Network Viewer tab on 1.1.0, and
      on 1.1.1 shows nothing on a network that is not a hierarchy (#877). The case asserts
      that the app's own tab is the selected one
- [ ] † `ui/persist-results-per-network`

### Deliverables — behavior cases (§4.4)

- [ ] **Duplicate tab id:** the app's own tab is selected
- [ ] **Disable:** the runner disables the app through the host UI, and every registration it
      made (context menu item, layout algorithm, panel tab) is gone

### Verification (Phase 3)

- [ ] All 25 recipes have a case, and every case passes on 1.1.0 and on 1.1.1. There are no
      exemptions (D-9)
- [ ] The disable case passes on both: the row's switch on 1.1.0 and on 1.1.1
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
- [ ] `API_TYPES_VERSION` equals the version in `verified.json`. If beta.6 was published in
      the meantime, its own pull request and a refreshed record come first (design D-15)
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
| Host entry for the floor (1.1.0, `6619411b`) | — |
| Host entry for the latest release (1.1.1, `c3118c51`) | — |
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
- [ ] 6 — The runner waits for readiness, the active app and the boot report, serves an
      empty app catalog and checks that it did, and cleans up in `finally`
- [ ] 5 and 7 (hosts) — Every case passed on 1.1.0 and on 1.1.1. The record has both
      entries, matched by tag commit and made from the same digest, and a run against
      another commit wrote no entry
- [ ] 7 — Changing anything under `recipes/`, `wiring/` or `runner/` without re-running the
      runner fails CI; the generator refuses to write `docs/llms*.txt` from it
- [ ] 8 — The Pages files were live before the scaffolder that points at them was published;
      the scaffolder's version was bumped
- [ ] 9 — A project scaffolded outside the monorepo pins the verified version and builds
- [ ] 10 — The agent acceptance test is recorded above
- [ ] 11 — The Phase 0 corrections and the follow-up landed before the README linked the
      cookbook

### Deferred, deliberately

- [ ] **Per-recipe minimum versions** (D-7) — needs verification against several versions
- [ ] **Recipes inside an npm package** (D-3) — revisited after the API reaches GA
- [ ] **The runner in CI** (O-2) — needs deployed hosts that serve the releases' tag
      commits. On 2026-11-16 production served 1.1.0 exactly, and dev1 a pre-release build
      of 1.1.1
- [ ] **Raising the floor above 1.1.0** (D-16, O-3) — one pull request: remove the old
      floor's entry and the version notes that no longer apply
- [ ] **Adding a release after 1.1.1** (D-16) — run every case on its tag and add its
      entry; it replaces 1.1.1 as the latest release
- [ ] **Adopting api-types beta.6** (D-15) — unpublished on 2026-11-16; a pull request of
      its own once it is on npm. A recipe may use its additions only after the floor rises
      to 1.1.1
- [ ] **The public Cookbook app** — Phase 6
- [ ] **The backlog** (design §4.12): seven planned recipes and four that need a feasibility
      check, added one at a time once Phase 3 is complete (D-11, O-1). Each addition adds a
      row to the Recipe status table. `layout/arrange-nodes-programmatically` validates
      positions itself and is not undoable; `recordUndo` needs beta.6 and a floor of 1.1.1
- [ ] **The API gaps** in design §4.12 (image export, zoom to selection, laying out only the
      selection, groups, annotations, legends) — host-side work, not recipes
- [ ] **`AGENTS.md` content (E-1b, E-1c), `api-surface.json` (E-3), a full E-1a sweep** —
      outside this project (D-1)

### Known non-issues

- [ ] **A merge into `main` between phases publishes a partial catalog.** That is intended: every
      recipe in it was verified (D-12)
- [ ] **`app-runtime`'s `manifestCommand.test.ts` fails on macOS's default `TMPDIR`**, which
      sits under the `/var` symlink. Unrelated to the cookbook; see `.serena/memories/lessons.md`
