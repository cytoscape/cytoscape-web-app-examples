# Implementation Checklist — the entry point a third-party developer meets

> Goal: **what the README and guides say is what actually happens.** A developer
> who follows the entry point should reach a working app, and should not be told
> about anything that does not exist yet.
>
> **Status: NOT STARTED.** Phase 0 is the audit; it is complete, and one of its
> findings is a P0 that breaks generated apps today.
>
> **This is not only a documentation change.** Phase A fixes a broken API
> contract and requires an npm publish from the **host** repository. Editing the
> README before that would produce accurate prose describing an app that still
> does not work.

_Roadmap: [`developer-onboarding-roadmap.md`](developer-onboarding-roadmap.md) —
discharges **Theme F** (drift) and the `apiVersion` / contract items around
**C-3** and **P-2**._

**Format note:** follows
[`../remote-dev-host/remote-dev-host-checklist.md`](../remote-dev-host/remote-dev-host-checklist.md)
and the App SDK checklist — all phases in one file, each with its own
verification, run before the next phase starts.

**Repository note:** steps in the host repository are prefixed `cytoscape-web/`.
Everything else is relative to `cytoscape-web-app-examples/`.

---

## Phase 0: Audit — measured 2026-08-21

An external review raised the items below. Each was checked against the code and
the registry rather than accepted; three turned out to be already fixed, four to
be right, and four to need a different remedy than proposed.

### 0.1 【P0】 The published type contract and the running host disagree

- [x] Measured:

      ```
      host (origin/development, deployed to dev1)
        additiveSelect(networkId, nodeIds, edgeIds)     ← 3 arguments
      published @cytoscape-web/api-types@1.0.0-beta.3
        additiveSelect(networkId, ids)                  ← 2 arguments
      what the templates call
        additiveSelect(ctx.networkId, nodeIds)          ← 2 arguments
      ```

- [x] **The failure is silent, which is worse than the review reported.** The
      call type-checks (it matches beta.3), the host spreads `[...nodeIds,
      ...edgeIds]` over an `undefined`, the resulting `TypeError` is caught by
      `selectionApi.ts`'s own `try/catch` and returned as `fail()` — and
      `contextMenus.ts` does not read the result. **Pressing the menu item does
      nothing, with no error anywhere.**
- [x] Affects the `context-menu` and `full` templates, i.e. every app scaffolded
      from them. Source of truth is `project-template/src/contextMenus.ts`;
      `sync-templates.mjs` copies it into both
- [x] **`1.0.0-beta.4` is not published.** The registry stops at beta.3, so the
      scaffolder pinning beta.3 is currently correct — the fix cannot start on
      this side
- [x] Other beta.4 breaking changes reaching this repository: `getConnectedEdges`
      (1 file), `exportToCx2` (1 file). `additiveUnselect` → `additiveDeselect`
      is a rename in the same release

### 0.2 The entry point describes a UI that does not exist

- [x] Docs say **Apps → App Settings** in 5 places; the host's menu item is
      `label: 'Manage Apps...'` (`AppMenu/index.tsx:173`)
- [x] Docs say to enable the app after installing. Measured during the
      remote-dev-host work: **an installed app auto-activates**, which is why an
      earlier test looking for the App Manager toggle found nothing

### 0.3 Unbuilt things described as available

- [x] `guides/getting-started.md:259` — the zip is "the file the **App Store
      submission page** takes". The App Store is a design document; no server
      exists
- [x] `web.cytoscape.org` is still a Webpack build (`var cyweb;`,
      `webpackChunkcytoscape_web`, assets stamped 2026-07-08), so an app built
      with the current SDK resolves **no exports** there and fails silently.
      Recorded in `getting-started.md` §5d but **not in the README**

### 0.4 Already fixed — not in scope

The review was written against a state before the 0.3.x releases.

- [x] Port 6000 in the docs — fixed in 0.3.1 (23 references across six files;
      blocked ports are no longer selected or accepted)
- [x] The zip on every build — fixed in 0.3.0 (`npm run build:zip`,
      `CYWEB_APP_ZIP`)
- [x] The Quick Start breaking when pasted — fixed in 0.3.1 (issue #6)

### 0.5 Decisions taken

- [x] **D-1. The api-types publish is in scope.** Phase A runs from the publish
      through to the SDK release. Without it the README can be made accurate and
      generated apps still will not work
- [x] **D-2. No compatibility table.** The review asked for a five-column table
      of App / runtime / scaffolder / api-types / host versions. Refused: this
      whole audit is a catalogue of drift, and a hand-maintained table adds one
      more thing to drift — in a year the table is what is wrong. The contract
      is **asserted in CI** instead (A-3), with one line in the README
- [x] **D-3. `project-template` is described as the same shape as a generated
      app**, contrary to the review. It literally is: `sync-templates.mjs`
      builds the templates from it. Removing an accurate statement helps nobody
- [x] **D-4. No Service App entry point.** The review asked to split the README
      opening between Client MF Apps and Service Apps. The README mentions
      Service Apps **zero times** today, and they are a different mechanism
      owned by the host. Only the underlying goal is adopted: **one sentence** of
      scope, not a split
- [x] **D-5. The Quick Start stays a two-word command.** The review wanted it
      pinned to `--yes`; the motivation (pasting breaks it) was fixed in 0.3.1.
      A non-interactive form is added as a *second* example, for CI and for the
      LLM-driven use this repository exists to serve

---

## Phase A: Fix the contract before describing it 【host + examples】

### A-1. Publish `@cytoscape-web/api-types@1.0.0-beta.4` 【host】

- [ ] `cytoscape-web/packages/api-types/` already carries `version: 1.0.0-beta.4`
      and a CHANGELOG listing the breaking changes. Only the publish is missing
- [ ] **Manual, and it needs a logged-in shell.** The host repository has no
      release workflow — `ci.yml` is the only one — and beta.3 was published by
      hand in 2026-02 with no `repository` field and no provenance. Same route:
      `npm run build:api-types` → `npm publish`
- [ ] Out of scope, worth raising separately: the host has none of the release
      posture the examples repo now has (OIDC, provenance, an approval gate).
      Adding `repository` to `packages/api-types/package.json` is the first step
      and the one provenance requires

**Verification (A-1)**
- [ ] `npm view @cytoscape-web/api-types version` → `1.0.0-beta.4`

### A-2. Move the templates to the new contract 【examples】

- [ ] `packages/create-cytoscape-app/src/scaffold.ts` — `API_TYPES_VERSION` to
      `1.0.0-beta.4` (an exact pin, not a range: a caret floats across betas,
      which is how the examples ended up a version behind before)
- [ ] `project-template/src/contextMenus.ts` — the real source; `sync-templates`
      carries it into `context-menu` and `full`
  - [ ] `additiveSelect(networkId, nodeIds, edgeIds)`
  - [ ] **Check the returned `ApiResult`.** The silence was caused by two
        things, and the argument count was only one of them — the template threw
        the result away. A template is read as the example of how to call the
        API, so it should show the check
- [ ] `getConnectedEdges` and `exportToCx2` call sites (1 file each)
- [ ] Release as SDK **0.3.2**, following the established sequence: version +
      lock + workspace consumers together, merge to `development`, CI green,
      dry run, then publish

**Verification (A-2)**
- [ ] **Scaffold a `context-menu` app, install it into dev1, and press the menu
      item.** The selection must change. This is the only check that means
      anything — the bug type-checks, and is invisible to every automated gate
      the repository currently has
- [ ] Clean Node 24 environment: `typecheck → test → build → verify` on a
      generated app
- [ ] `npm create cytoscape-app@latest` run against **both an isolated and the
      real npm cache** — the isolated-only check is what let a stale-cache
      problem through before

### A-3. Assert the contract instead of tabulating it 【examples】

- [ ] A test that `API_TYPES_VERSION` matches the latest published api-types
      beta. Modelled on the existing `SDK_VERSION` test in
      `packages/create-cytoscape-app/test/scaffold.test.ts`, which fails with the
      instruction rather than a bare mismatch
- [ ] Nothing else is needed for the templates: CI's scaffold job already runs
      `typecheck` on a generated app, so a wrong pin surfaces there by itself
- [ ] Mutation-check it — put the old pin back and confirm the test fails

**Verification (A-3)**
- [ ] The test fails on a deliberately stale pin, passes on a correct one

---

## Phase B: Make the entry point match reality 【examples】

Only after Phase A. Everything here is a statement about behaviour that Phase A
establishes.

### B-1. Correct what contradicts the implementation

- [ ] **Apps → App Settings** → **Apps → Manage Apps...** (5 places)
- [ ] Remove the "then enable it" step — an installed app auto-activates; the
      success condition is that the panel appears after Confirm
- [ ] `guides/troubleshooting.md` — `jest.mock` → Vitest (roadmap Theme F)

### B-2. Stop describing what does not exist

- [ ] The App Store submission page is named as **future**, not as a place to
      send a zip today
- [ ] The README says production is not usable with this SDK, and why — the
      README is where someone decides which host to target, and today only
      `getting-started.md` §5d says it

### B-3. Restructure the opening

- [ ] Developer Preview and the trust boundary stated **once**. Currently the
      warning appears twice in the first 20 lines, in two different wordings
- [ ] Quick Start: Node 24+ up front; the two-word command, then the
      non-interactive form (D-5)
- [ ] One sentence of scope: this repository is about Client Module Federation
      apps (D-4)
- [ ] Maintainer commands — `deploy`, `preflight:*` — move to `CONTRIBUTING.md`.
      They are noise for the audience the README is for, and the roadmap already
      lists a missing CONTRIBUTING under Theme F. (`claude-bridge` was the third
      such command; it left with the app on 9/4/2026)

### B-4. Bring the guides with it

- [ ] `getting-started.md`, `architecture-overview.md`, `troubleshooting.md`,
      and the published `docs/index.html`. Fixing the README alone relocates the
      contradiction rather than removing it
- [ ] Classify the examples accurately: **four apps, all published**. The one
      internal example is gone — `claude-bridge` moved to `cy-agent-bridge`
      (9/4/2026), so `apps.manifest.json` no longer carries a `published: false`
      entry

**Verification (Phase B)**
- [ ] Every internal link and anchor resolves
- [ ] A reader following the README start to finish reaches a mounted app,
      against a local host and against dev1
- [ ] No remaining occurrence of `App Settings`, `jest.mock`, or the App Store
      submission page as a present-tense capability

---

## Notes for whoever picks this up

**Phase A is not optional preparation for Phase B — it is most of the value.**
The documentation errors are embarrassing; the contract break is what stops a
new developer's app from working, silently, on the exact template most likely to
be chosen for a first app.

**Watch the order.** `beta.4` does not exist on the registry yet, so A-2 cannot
start before A-1, and A-1 needs a human with npm credentials. The plan stops
there on purpose rather than pretending the step is automatable.

**The bug that started this was invisible to every gate.** It type-checks, it
throws inside a `try`, and the result is discarded. No lint rule, no unit test
and no build check would have caught it — only pressing the button. When adding
verification for Phase A, prefer the one that involves pressing the button.
