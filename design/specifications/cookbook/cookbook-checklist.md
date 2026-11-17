# Implementation Checklist — Cookbook

> Track progress across the seven phases (0–6). Mark `[x]` when complete. Run the per-phase
> verification before starting the next phase.
>
> **Status: Prerequisite and Phase 0 COMPLETE (2026-10-07); the Phase 0 follow-up and
> Phase 1 COMPLETE (2026-11-17), merged in #27. Phase 2 BUILT (2026-11-17): 20 recipes pass
> on both hosts; the source commit, `docs/llms*.txt` and the merge are next.** The design is at revision 8: three
> reviews, a catalog of 25 recipes with a backlog, a plan for the published beta.5,
> `llms.txt` committed into `docs/`, a review after a pause, and the review of #27. Work
> happens on the `cookbook` branch of this repository, which is level with `development`
> at `4f1a2af`, the merge of #27.
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
satisfies 1.1.0. Both tags set `engine-strict`, so the 1.1.1 checkout must not be
installed with an older Node, such as the 24.21.0 a parent `mise.toml` may pin;
`mise exec node@24.22.1 -- <command>` uses the right one without changing the pin. Start a host with `npx vite --host`: `npm run dev` also opens a
browser window.

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

## Phase 0 follow-up: found in the review of 2026-11-16 ✅ **COMPLETE (2026-11-17)** — `4d38f6c`, merged in #27

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

> **How it was confirmed.** Two dev hosts on `localhost:5500`, from worktrees of the tags,
> driven with Playwright in a fresh browser context each time. Their boot reports said
> `1.1.0` / `6619411b` and `1.1.1` / `c3118c51`. The four example apps' dev servers were
> running, except where noted.

- [x] **After an install link (wrong on both).** `README.md`, `guides/getting-started.md`
      and `project-template/README.md` said to confirm the install and then enable the
      app. Confirming already turns it on. They now say so, and name Manage Apps as where
      to turn it off
- [x] **"Enable one under Manage Apps" (right on 1.1.0 only).** Catalog apps start off on
      1.1.0. From 1.1.1 on, a dev host turns the four example apps on by itself. Each
      sentence now names both versions:
  - [x] `README.md` (the quick start for all four apps)
  - [x] `hello-world/README.md`, `network-statistics/README.md`,
        `network-workflows/README.md`
  - [x] `CLAUDE.md` §5, "Connect to Local Host"
  - [x] The README says what a reader on 1.1.1 sees when an app's dev server is not
        running. Seen with all four stopped: the toast "4 apps failed to load — open App
        Manager for details.", and each row marked *failed* with "Could not fetch …
        Reload the page to try again." and its switch still on
- [x] **Where production apps are registered (right on 1.1.0 only).** `CLAUDE.md` §2 and
      `guides/troubleshooting.md` ("Can I publish my app to npm?") named the host's
      `src/assets/apps.json`. Both now say "the deployment's curated `apps.json`", and the
      guide points to the README's "Publishing to the public Cytoscape Web site"
- [x] Not changed, deliberately: `guides/architecture-overview.md`'s "curated `apps.json`"
      and the README's "curated allowlist", which are right on both

### Verification (Phase 0 follow-up)

- [x] In a 1.1.0 host with a fresh profile: the four example apps are off, and no
      `remoteEntry.js` of theirs is requested
- [x] In a 1.1.1 host with a fresh profile: the four example apps are on without a click
- [x] In both: an app installed from its install link is on after the confirmation
      (`project-template`, with the catalog served empty so that the app was not in it)
- [x] No page tells the reader to enable an app that is already on in either release
      (`grep -rni "enable" README.md CLAUDE.md guides/ */README.md`)
- [x] `npm run typecheck` passes. `npm test` passes except the six `manifestCommand`
      tests of the known non-issue below; with `TMPDIR` resolved, all 413 pass
- [x] **Merged into `development`**, without a verification record (D-12), together with
      Phase 1 in [#27](https://github.com/cytoscape/cytoscape-web-app-examples/pull/27)
      (merge commit `4f1a2af`, 2026-11-17). Its commit `4d38f6c` comes before `1eac431`,
      which adds the README link

---

## Phase 1: Foundation and a minimal runner ✅ **COMPLETE (2026-11-17)** — #27

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

- [x] The `cookbook/` tree of §4.1, outside the root `workspaces`
- [x] `cookbook/tsconfig.json`: `skipLibCheck: false`, `types` including
      `@cytoscape-web/api-types`. It includes `recipes/`, `wiring/`, `runner/cases/` and
      the runner's own in-page files (`runner/*.ts`)
- [x] The root `typecheck` script also runs `tsc --noEmit -p cookbook`. The maintainer
      approved the `package.json` edit (2026-11-16). No dependency and no lockfile changed

### Deliverables — documents (§4.11)

- [x] `cookbook/USING-RECIPES.md`, including which host releases are supported, what
      `verified.json` records about them, and that a recipe's header states where they
      differ (§4.6)
- [x] `cookbook/WRITING-RECIPES.md`, including the required pitfall topics (§4.2), the
      import rules (§4.3), the **allowed `apis` forms** (§4.4), and the rule that a recipe
      is right on every supported release and states a difference by version (§4.10, D-16)
- [x] `cookbook/runner/README.md`, including how to start a host from a checkout of each
      tag, `v1.1.0` and `v1.1.1`, in a standalone clone (`dev-start.sh` lives in the parent
      workspace repository, not here), and why the runner serves an empty app catalog and
      records only a release's tag commit

### Deliverables — wiring (§4.2, §4.4)

- [x] One compiled file per call site: `from-mount.ts`, `from-apps-menu.ts`,
      `from-panel.tsx` (hooks for host-wide domains, `useAppContext()?.apis` for
      owner-bound ones) and `from-window.ts` (`window.CyWebApi` after `whenReady()`)
- [x] Every owner-bound call uses an allowed `apis` form. Phase 1 has no owner-bound
      recipe, so no such call exists yet; the check runs on `wiring/` and is proven on
      fixtures

### Deliverables — generator: checks and index (§4.6, §4.7)

- [x] `scripts/cookbook-index.mjs` parses with the TypeScript compiler API. `typescript` is
      already a root devDependency, so no dependency is added. What it shares with the
      runner (the digest, the record check) is in `scripts/cookbook-lib.mjs`
- [x] It rejects (problem code in parentheses):
  - [x] a missing tag (`missing-tag`), and a missing header section (`missing-section`)
  - [x] an unknown `@related` id (`unknown-related`)
  - [x] `@apis` differing from the API call expressions, comments excluded
        (`apis-mismatch`)
  - [x] a value import in a core recipe (`value-import`), and an import of anything but
        types from `cyweb/ApiTypes` (`foreign-import`)
  - [x] an owner-bound recipe without an `AppContextApis` parameter
        (`owner-bound-declaration`)
  - [x] an owner-bound call in `wiring/` or `runner/app` with an `apis` argument outside the
        allowed forms (`apis-source`: `window.CyWebApi`, a destructured `apis`, a
        `use*Api` hook)
  - [x] Added while building it, each needed to make the checks above sound:
        `apis-untraceable` (a use of `apis` the `@apis` check cannot follow),
        `apis-signature` (the `Pick<…>` does not name exactly the domains called),
        `recipe-function` (not exactly one exported function), `missing-case` and
        `orphan-case` (a recipe without a case, a case without a recipe)
- [x] `--check` fails when the api-types version the type check resolved differs from
      `verified.json`
- [x] It writes `cookbook/README.md`. `--check` regenerates in memory and fails on any
      difference
- [x] Each rejection has a fixture that is **seen failing** (criterion 2):
      `node scripts/cookbook-index.mjs --selftest` runs 15 fixtures in
      `scripts/cookbook-fixtures/`. `ok/` is the control and must have no problem; each
      other one holds only what differs from it and must produce exactly the codes in its
      `expect.txt`

### Deliverables — recipes (§4.2, §4.10)

- [x] ★ `elements/add-nodes-to-network`, with its case
- [x] ★ `style/color-nodes-by-numeric-column`, with its case
- [x] `events/follow-current-network`, with its case, covering all four steps of §4.5.
      Steps 1, 2 and 4 use the host's own events. **Step 3 dispatches `network:loaded`
      itself:** the host delays a network's data only after a page reload, which a case
      cannot do without losing the injected bundle

### Deliverables — minimal runner (§4.6)

- [x] Bundle the core recipes and cases with Vite library mode (Vite is already a root
      devDependency). The entry is generated from the case files on disk, so there is no
      list of cases to keep in step
- [x] Before navigating, set `localStorage['cyweb-debug-enabled'] = 'true'`
- [x] Before navigating, answer the request for the app catalog with `[]` (Playwright
      `route`; `/apps.json` on 1.1.0, `<base>apps.json` from 1.1.1), and fail the run if
      the request was never intercepted (design D-14). On 1.1.0 catalog apps start off
      anyway; on 1.1.1 this is what keeps the example apps out. **Match the path exactly:**
      a 1.1.1 dev server also imports `/src/assets/apps.json?import`, and answering that
      keeps the host from becoming ready (seen in the Phase 0 follow-up)
- [x] Added: fail the run if the host fetched any other app's `remoteEntry.js`. The empty
      catalog is the means; this checks the end
- [x] Abort the host's analytics requests, and close the welcome dialog and the cookie
      banner of a fresh profile by their own buttons (design §4.6)
- [x] The runner's configuration lists the supported releases with their tag commits:
      `cookbook/runner/hosts.json`, 1.1.0 `6619411b` and 1.1.1 `c3118c51` (design D-16)
- [x] Read `report.build.version` and `.commit`. Write that release's entry only when the
      commit is its tag commit. On any other host, say so, report the cases' results, and
      write nothing
- [x] Pass the host version to each case (`ctx.host.version`). No Phase 1 case branches
      on it: the three recipes behave the same on both releases
- [x] `await window.CyWebApi.whenReady()`, then wait, **with a time limit** (30 s), for
      `window.debug.boot.report`. Fail if it does not appear, or if
      `report.build.commit` is `unknown`
- [x] Each case builds an isolated fixture with `network.createNetworkFromEdgeList` and reads
      the result back through the read-side APIs
- [x] Cleanup in `finally`, pass or fail: the fixture network, subscriptions, registrations.
      The runner also compares the workspace's networks before and after
- [x] A single case can be run by id; `--selftest` proves the runner can fail
- [x] A full, passing run writes `cookbook/verified.json`:
  - [x] api-types exact version, and its source (registry or local)
  - [x] one host entry per verified release, with its version and commit. A run adds or
        replaces its own release's entry, and drops an entry made from another digest
  - [x] a digest of `recipes/`, `wiring/`, all of `runner/`, and `cookbook/tsconfig.json`,
        Markdown excluded (design §4.6)

### Deliverables — CI check for a stale record (§4.7)

- [x] The `Cookbook` job in `ci.yml` runs the generator's self-test and
      `cookbook-index.mjs --check`, which recomputes the digest and the resolved api-types
      version, and fails when either differs from `verified.json`, or when a release in
      `hosts.json` has no entry. This is what makes per-phase merges safe

### Deliverables — README link (§4.9)

- [x] **After Phase 0 only:** a short "Building with an AI assistant" section near the top of
      `README.md` that links the **cookbook index**, and a Cookbook row in the Documentation
      Map. No `llms.txt` link yet: it is not live until Phase 2 reaches `main`

### Verification (Phase 1)

Hosts: dev servers from clean worktrees of the two tags, on `localhost:5500`, one at a
time. Their boot reports said `1.1.0` / `6619411b` and `1.1.1` / `c3118c51`.

- [x] `npm run typecheck`, including the cookbook, passes in CI on the registry beta.5:
      on #27 (runs
      [44148817210](https://github.com/cytoscape/cytoscape-web-app-examples/actions/runs/44148817210)
      and
      [44158581711](https://github.com/cytoscape/cytoscape-web-app-examples/actions/runs/44158581711)),
      and on `development` after the merge
      ([44161181883](https://github.com/cytoscape/cytoscape-web-app-examples/actions/runs/44161181883)),
      all nine jobs green each time, the new `Cookbook` job included
- [x] `node scripts/cookbook-index.mjs --check` passes, and every rejection fixture fails as
      expected
- [x] The type check rejects an invented name: `'NODE_BACKGROUND_COLOR'` in place of
      `'nodeBackgroundColor'` fails with TS2345 (**seen failing**). The host's own
      `Api.md` uses that spelling in an example
- [x] The runner passes all three cases against a host on `localhost:5500`, started fresh
      from a clean checkout of the tag `v1.1.0`, and again from one of `v1.1.1`.
      `--selftest` reports its case as failed, and exits 0 for that reason
- [x] The cases catch a broken recipe (**seen failing**, four mutations, each restored):
      the two colors swapped; `network:loaded` read for every network; `stop()` leaving a
      listener; `autoSelect` left at the host's default
- [x] Repeated runs leave no fixture network behind, on each. The runner checks it in
      every run
- [x] The run fails when the catalog request is not intercepted (**seen failing**, with the
      route pattern changed)
- [x] On the 1.1.1 host, the run gives the same results with the four example apps' dev
      servers running and with them stopped, and the host loads no example app. With the
      real catalog let through, the run fails and names the four `remoteEntry.js`
      (**seen failing**)
- [x] The run fails when the boot report does not appear (**seen failing**, against dev1
      with the debug switch left off)
- [x] Against a host that is not a tag commit, the cases run and **no entry is written**
      (**seen**, against dev1, which served `bc2b20e9` and reported `1.1.1`). This also
      showed the runner working on a deployed host under a base path
- [x] `verified.json` exists and records the **registry** beta.5 as its source, and two
      host entries from the same digest: 1.1.0 (`6619411b`) and 1.1.1 (`c3118c51`)
- [x] The stale-record check fails on a record with only one of the two entries
      (**seen failing**)
- [x] The stale-record check fails on a changed recipe without a refreshed `verified.json`,
      on a record that names another api-types version, and on an entry whose commit is
      not the tag's (**seen failing**, each)
- [x] `--check` fails when an alias changes without regenerating the index
      (**seen failing**)
- [x] `npm run manifest:validate`, `npm run check:imports` and `npm test` still pass
      (`npm test` with `TMPDIR` resolved: see "Known non-issues")
- [x] **The review of #27** (design §8): each fix seen failing on the code it replaces,
      on 1.1.0, then the record refreshed on both hosts:
  - [x] both recipes' original `Math.min(...)` throws on 200,000 elements in their cases
  - [x] `--check` rejects a record whose api-types `source` is `local`, and an installation
        of the 1.1.1 api-types tarball (version `1.0.0-beta.5`, beta.6 declarations), which
        `tsc -p cookbook` accepted
  - [x] the runner rejects an entry fetched from the host's own origin
        (`/apps/example/remoteEntry.js`)
  - [x] `follow-current-network` without `onNone` times out in its case
  - [x] CodeRabbit's points (design §8, 5–11): a recipe changed during a run leaves the
        record as it was; the previous generator lets both new fixtures through
        (`apis-source-shadowed`, `apis-source-case`), and the new one rejects them;
        `--selftest` now runs 17 fixtures
- [x] **Merged into `development`**, with the current `verified.json` (D-12):
      [#27](https://github.com/cytoscape/cytoscape-web-app-examples/pull/27), merge commit
      `4f1a2af` (2026-11-17), a merge and not a squash, as §4.7 relies on. The record's
      digest `c4f40a9f` matched on `development`: its `Cookbook` job passed. Codex,
      Copilot and CodeRabbit raised 21 comments; all were answered and their 11 threads
      resolved (design §8, "Review of #27")

---

## Phase 2: Catalog 🟡 **BUILT (2026-11-17)** — not committed; `docs/llms*.txt` follow the source commit

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
(see the Recipe status table below), which passes on 1.1.0 and on 1.1.1. What the host did
that the recipes had to handle is in design §4.10, "What the host does that the Phase 2
recipes had to handle".

- [x] `network/create-network-from-table`. Releases: the 1.1.0 pitfall (#927) is stated by
      version. **Writes edge values with `editRows`**: `setValues` reports success and
      writes nothing on an edge-list network's edges, which have no rows (both releases)
- [x] `network/subnetwork-from-selection`. Uses `createNetworkFromNodeList`, and copies
      the source's style with `getVisualStyle` / `applyVisualStyle`: the host gives the
      subnetwork a default style. Bypasses are not copied (asserted)
- [x] `elements/add-edges-between-selected`
- [x] `elements/delete-selected`. Releases: Edit ▸ Undo after a deletion, pressed on a
      host of each release: 1.1.1 restores the nodes where they were; 1.1.0 restores them
      without views, drawn at (0, 0), and its `deleteNodes` reports `[0, 0]` (#857)
- [x] `data/add-computed-column`, with degree as its example. Refuses a name that differs
      from an existing column only by case, on both releases
- [x] `data/read-column-values-safely`
- [x] `data/join-table-by-key`. Takes the file as TSV text and imports it by `keyColumn`;
      refuses case clashes, duplicate keys and a typed header that contradicts an existing
      column, on both releases. Converts Windows line endings
- [x] `style/size-nodes-by-degree`
- [x] `style/color-by-category`. Refuses boolean columns: discrete keys are text, and only
      numeric columns get them converted back
- [x] `style/label-from-column`
- [x] `style/highlight-with-bypass`. `clear()` restores earlier bypasses instead of
      deleting them (asserted)
- [x] `style/set-style-defaults`, whose "Don't" covers a bypass on every node. Also
      states, and its case shows on the canvas, that a mapping keeps the fallback it copied
      when it was made: a later default does not reach mapped elements
- [x] `style/emphasize-by-threshold`. A single control point makes a step; a value at the
      threshold is emphasized (asserted on the canvas)
- [x] `style/hide-by-threshold`. Releases: on 1.1.0 a selection change from code shows the
      hidden node on the canvas again; on 1.1.1 it stays hidden. The case asserts each, by
      version, through `window.debug.cy`
- [x] `selection/select-neighbors`, taking a hop count
- [x] `selection/select-by-attribute`
- [x] `layout/run-layout-and-wait`. Which view is fitted, read at both tags: `applyLayout`
      fits the laid-out network's own canvas, and a network without one is not fitted. The
      recipe fits only a current network
- [x] No recipe or case uses two column names that differ only by case (design §4.10)
- [x] Added: the case harness gains `ctx.adopt` (delete a network the recipe made) and
      `ctx.rendered` (read the canvas through `window.debug.cy`, which both releases
      publish while debug is on), so cases check what is drawn, not only what is stored

### Deliverables — `llms.txt` and `llms-full.txt` (§4.7)

Pages serves `main:/docs` **as committed** (`build_type: legacy`), so the files are generated
and committed into `docs/`, never generated in a workflow (design D-13).

- [x] The generator writes `docs/llms.txt` and `docs/llms-full.txt`
      (`node scripts/cookbook-index.mjs --llms`):
  - [x] The pinned commit is the last one that changed `cookbook/` or `guides/`
        (`git log -1 -- cookbook guides`). `--llms` refuses while either has uncommitted
        changes, so it is always run in a commit **after** the source change
  - [x] `llms.txt` links every recipe and wiring file through `raw.githubusercontent.com`
        URLs pinned to that commit, and links the API reference pinned to the floor
        release's tag commit (design D-16). It also links `WRITING-RECIPES.md` and the five
        guides under "Optional"
  - [x] `llms-full.txt` = `USING-RECIPES.md` + every wiring file + every recipe + pinned API
        reference links. It does not copy the API reference
  - [x] Both open with the pinned examples commit, the host commits and the api-types
        version
- [x] The generator **refuses** when the digest does not match `verified.json`, when the
      api-types source is not the registry, or when a supported host has no entry
- [x] `ci.yml`: the `Cookbook` job checks out **full history** (`fetch-depth: 0`), runs
      `--check` (index, record, `docs/llms*.txt` regenerated and compared, structure
      checks). On `pull_request` it checks out `github.event.pull_request.head.sha`
      explicitly
- [x] On `pull_request`, the same job fetches `refs/pull/<n>/merge` and runs
      `--check-merge` on it, which fails when the merge is the last commit to change
      `cookbook/` or `guides/`
- [x] `scripts/manifest.mjs`: `llms.txt` and `llms-full.txt` join `RESERVED_PUBLISH_PATHS`
- [x] `deploy-pages.yml` is **not** changed: its output is never served
- [ ] **The files themselves are not committed yet.** They need the source commit first:
      commit the Phase 2 sources, run `--llms`, commit the two files (WRITING-RECIPES.md,
      "Two commits")

### Verification (Phase 2)

Hosts: dev servers from clean worktrees of the two tags, as in Phase 1.

- [x] 20 recipes (Phases 1 and 2), and all their cases pass on 1.1.0 and on 1.1.1. Two
      consecutive runs on 1.1.0 left nothing behind. `--selftest` fails as it must on both
- [x] The generator refuses a `verified.json` whose digest does not match, and one recorded
      from a local tarball (**seen failing**, both, with scratch commits in a scratch
      worktree; also uncommitted sources)
- [x] The CI check fails when a linked source changes without regenerating
      `docs/llms*.txt` (**seen failing**: a guide changed in a scratch commit)
- [x] The merge-result check fails when both sides changed a linked source, and passes when
      one side did (**seen**, with scratch branches and merges)
- [x] `npm run manifest:validate` rejects an app whose `publishPath` is `llms.txt` or
      `llms-full.txt` (**seen failing**, both)
- [x] The structure check fails on a fixture with a missing recipe, and on one with a link
      to a nonexistent path; also on a link with another pin, and a host link not pinned to
      the floor. `--selftest` runs these with the other 17 fixtures: 22 in all
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
- [ ] An owner-bound recipe's case gets an app's own object, and the `apis-source` check
      allows that form in `runner/cases` (today it allows none there; design §4.4)
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
| ★ `elements/add-nodes-to-network` | Mutation | Runner | 1 | [x] | [x] |
| ★ `style/color-nodes-by-numeric-column` | Numeric mapping | Runner | 1 | [x] | [x] |
| `events/follow-current-network` | Events and async | Runner | 1 | [x] | [x] |
| `network/create-network-from-table` | Mutation | Runner | 2 | [x] | [x] |
| `network/subnetwork-from-selection` | Mutation | Runner | 2 | [x] | [x] |
| `elements/add-edges-between-selected` | Mutation | Runner | 2 | [x] | [x] |
| `elements/delete-selected` | Mutation | Runner | 2 | [x] | [x] |
| `data/add-computed-column` | Mutation | Runner | 2 | [x] | [x] |
| `data/read-column-values-safely` | Numeric mapping | Runner | 2 | [x] | [x] |
| `data/join-table-by-key` | Mutation | Runner | 2 | [x] | [x] |
| `style/size-nodes-by-degree` | Numeric mapping | Runner | 2 | [x] | [x] |
| `style/color-by-category` | — | Runner | 2 | [x] | [x] |
| `style/label-from-column` | — | Runner | 2 | [x] | [x] |
| `style/highlight-with-bypass` | Mutation | Runner | 2 | [x] | [x] |
| `style/set-style-defaults` | Mutation | Runner | 2 | [x] | [x] |
| `style/emphasize-by-threshold` | Numeric mapping | Runner | 2 | [x] | [x] |
| `style/hide-by-threshold` | Numeric mapping, Mutation | Runner | 2 | [x] | [x] |
| `selection/select-neighbors` | — | Runner | 2 | [x] | [x] |
| `selection/select-by-attribute` | — | Runner | 2 | [x] | [x] |
| `layout/run-layout-and-wait` | Events and async | Runner | 2 | [x] | [x] |
| † `layout/register-app-layout` | — | App | 3 | [ ] | [ ] |
| † `ui/menu-action-with-dialog` | — | App | 3 | [ ] | [ ] |
| † `ui/link-out-from-node` | — | App | 3 | [ ] | [ ] |
| † `ui/open-own-panel-after-action` | — | App | 3 | [ ] | [ ] |
| † `ui/persist-results-per-network` | Persistence | App | 3 | [ ] | [ ] |

## Current `verified.json`

Copy the record here each time it is refreshed.

| Field | Value |
|---|---|
| api-types version and source | `1.0.0-beta.5`, registry |
| Host entry for the floor (1.1.0, `6619411b`) | `1.1.0` / `6619411b`, 20 cases |
| Host entry for the latest release (1.1.1, `c3118c51`) | `1.1.1` / `c3118c51`, 20 cases |
| Cookbook digest | `sha256:7192832cff918181a18164b2f62d8b6fe2681f57edda49befb652fd36b112370` |
| Run date | 2026-11-17 (Phase 2) |

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
- [x] 11 — The Phase 0 corrections and the follow-up landed before the README linked the
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
      its own once it is on npm, carrying a record refreshed on both hosts with it (CI
      fails without one). A recipe may use its additions only after the floor rises to
      1.1.1
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
