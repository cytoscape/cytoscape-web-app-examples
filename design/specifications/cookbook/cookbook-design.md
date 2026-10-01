# Cookbook — Design

> Status: **Draft, revision 4.** Revisions 2–4 incorporate three design reviews; §8 records
> how each point was handled, and §9 lists what is settled and what is still open.
>
> Scope carved out of [`../developer-onboarding/developer-onboarding-roadmap.md`](../developer-onboarding/developer-onboarding-roadmap.md)
> (items **B-2** recipes and **E-2** `llms.txt`). This document is self-contained and
> authoritative for its scope.
>
> Touches **this repository only**. Targets App API **`1.0.0-beta.5`**, which is on the host's
> `development` but not yet on npm — see §5 for what that gates.
>
> **Implementation tracking: [cookbook-checklist.md](cookbook-checklist.md)** — the phases
> below, broken into checkable items with per-phase verification and a per-recipe status
> table.

## 1. Problem

Most of the people building Cytoscape Web apps write them with an LLM in the loop. The
roadmap (Theme E) names three ways agents fail here: **(1)** inventing APIs that do not
exist, **(2)** trusting stale or contradictory context, and **(3)** being unable to
self-correct.

Everything an agent can read today is organized **by API**, not **by task**:

- the host's [`Api.md`](https://github.com/cytoscape/cytoscape-web/blob/development/src/app-api/api_docs/Api.md)
  reference and the `@cytoscape-web/api-types` declarations: about 80 methods across 11
  domain APIs;
- `hello-world`: 13 sections in about 1,560 lines of components, one section per API.

Nothing maps a task such as "color nodes by a numeric column" to the calls that do it, and
those calls are compositions the types do not explain. `visualStyle.createContinuousMapping`
takes `vpType`, `attribute`, `attributeValues`, `attributeType` and optional
`controlPoints`. The values have to be read from `table` first, and `attributeType` has to
match the column. `hello-world` does not show this mapping at all.

Some of what agents read today also contradicts the current API — failure mode (2) in
practice:

- The README's event table omits `network:changed`, `network:loaded` and `style:switched`.
  Its API table omits `cyweb/PanelApi`, `cyweb/AppDataApi` and `cyweb/ScopedApi`.
- `hello-world/src/components/LayoutSection.tsx` says `applyLayout` rejects on error. It
  resolves to a failed `ApiResult` instead.
- `.serena/memories/lessons.md` tells agents to maintain a `remotes.d.ts` that no longer
  exists, and lists ports for apps that were deleted.

## 2. Goals / Non-goals

**Goals**

1. **Task-oriented recipes** for frequent graph-visualization idioms. Each recipe is one
   self-contained file an agent can find and adapt.
2. **Every recipe compiles** with `skipLibCheck: false` against the api-types version the
   cookbook records (§4.6), so an invented API fails the check.
3. **Every recipe in the catalog passes a real-host case.** There are no exemptions: a recipe
   that cannot be verified is not added.
4. **Findable by intent.** A generated index lists each recipe under the words users use
   ("heat map", "color by score"). It is published as `llms.txt` / `llms-full.txt` on GitHub
   Pages.
5. **The cookbook reaches scaffolded projects.** The generated `AGENTS.md` names it, and the
   scaffolder pins the api-types version the cookbook was verified with. Both arrive only
   through a scaffolder release, which comes after the cookbook is live (§4.8).
6. **The README routes** developers and agents to the cookbook. Contradictions in the pages
   the cookbook links to are corrected **before** the links are added (Phase 0).
7. **Nothing is maintained twice.** The index, `llms.txt` and `llms-full.txt` are generated,
   and CI checks them.

**Non-goals** — each belongs elsewhere:

- `AGENTS.md` content beyond the pointer (E-1b, E-1c), `api-surface.json` (E-3), the MCP
  server (E-4) and a Claude Code skill (E-5).
- A full sweep for stale agent context (E-1a). Phase 0 fixes only the contradictions listed
  in §1 and any others found on the pages the cookbook links to.
- A mock host or `@cytoscape-web/app-test` (C-1).
- Rewriting `hello-world` or the guides beyond those corrections and cross-links.
- **Per-recipe minimum versions.** The cookbook is verified as a set against one version
  (§4.6).
- Shipping recipes inside an npm package. Revisited after the API reaches GA (§9).
- Any host change.

## 3. Readers and principles

There are two readers:

- **An agent in a scaffolded project.** It has no checkout of this repository, so it reads
  the cookbook through `llms.txt` and the links in its `AGENTS.md`.
- **An agent or developer in this repository.** It reads `cookbook/` directly.

Seven principles follow from these readers and from the failure modes in §1:

1. **One idiom per file, self-contained.** A recipe imports no other recipe. Aim for 120
   lines or fewer.
2. **Uniform anatomy (§4.2).** An agent that has read one recipe can read them all.
3. **The core is a function of `apis`.** The recipe's dependencies are part of its
   signature. Host-wide domains work at every call site; owner-bound domains do not (§4.4).
4. **Say what not to do.** Each recipe lists the mistakes agents actually make for that task.
5. **Versioned as a set.** One record states the api-types version, the host commit and the
   cookbook sources that were verified together (§4.6).
6. **Generated, then checked.** The index and `llms.txt` are build outputs. CI checks them.
7. **Every recipe is verified twice:** by types, and by a real-host case.

## 4. Design

### 4.1 Layout

```
cookbook/
  README.md               generated index, by category (committed, checked)
  USING-RECIPES.md        for agents and developers using a recipe (§4.11)
  WRITING-RECIPES.md      the authoring contract (§4.11)
  verified.json           the verification record, written by the runner (§4.6)
  tsconfig.json           skipLibCheck: false; resolves the root node_modules
  recipes/<category>/<recipe-id>.ts    core recipes (.tsx only for component recipes)
  wiring/                 compiled call-site examples, one per call site (§4.2)
  runner/                 real-host verification (§4.6)
    README.md
    cases/<recipe-id>.ts
    app/                  Phase 3: verification app, with its own package.json
scripts/cookbook-index.mjs        index and llms generator, recipe checks
```

**No npm workspaces.** `scripts/manifest.mjs` treats every workspace outside `packages/` as
an app (`NON_APP_WORKSPACE_PREFIXES`), so a workspace would need an `apps.manifest.json`
entry. Instead:

- The root `typecheck` script runs `tsc -p cookbook`. That is a `scripts` change to the root
  `package.json`, not a dependency change.
- `runner/app` is not a workspace, but it does have a `package.json`. `defineCyWebApp` reads
  the app's identity from that file's `cyweb` block. The runner starts the app's dev server
  with `runner/app` as the working directory, and the app's dependencies resolve from the
  root `node_modules`.

### 4.2 Recipe anatomy

A recipe is a `.ts` file (`.tsx` only for a recipe that is a component). Its header comment
is the documentation, so there is no separate prose that can drift from the code.

| Tag | Content |
|---|---|
| `@recipe` | Task-shaped title ("Color nodes by a numeric column") |
| `@aliases` | Other words users use for the task |
| `@apis` | Every API method the recipe calls (`table.getTable`, …) |
| `@related` | Ids of related recipes |

After the tags, the header has these sections:

- **When to use**
- **Preconditions** — readiness, a loaded network, required column types
- **Side effects** — what changes, which undo entries are recorded, what is left behind if a
  later step fails
- **Pitfalls**
- **Don't**

**Wiring is code, not comments.** Because every recipe takes `apis`, the call sites are the
same for all recipes. `cookbook/wiring/` holds one compiled example per call site (§4.4),
and each recipe header names the wiring files that apply. Wiring is published together with
the recipes (§4.7). Wiring that is specific to a recipe, such as subscribing and
unsubscribing to events, lives in the recipe's own code.

**Required pitfall topics** by kind of recipe — the Pitfalls section must cover each topic,
or say why it does not apply:

| Kind | Topics |
|---|---|
| Numeric mapping | Missing values; non-numeric values; an empty column; all values equal |
| Mutation | Batch APIs over loops (`createNodes` validates all-or-nothing and records one undo entry); what remains when a later call fails; the undo unit |
| Persistence | `appData` stores locally by default and enters CX2 only when shared (`cyAppData` aspect); read values are deeply frozen and must be copied before mutation |
| Events and async | Ignore events for other networks; discard results that arrive after a switch; unsubscribe |

Rules for the code:

- **Core functions** return `ApiResult<T>`, or `Promise<ApiResult<T>>` where the API is async
  (for example `layout.applyLayout`). They never throw, they propagate the first failure they
  get, and they contain no React.
- **Component recipes** are React components that call core functions and render their
  results. The `ApiResult` rule applies to the core functions they call, not to the
  components themselves.

### 4.3 Imports and runtime dependencies

`@cytoscape-web/api-types` contains **declarations only**: its `main` is `dist/index.d.ts`.
A value import from it, such as `import { ok } from '@cytoscape-web/api-types'`, still
typechecks under `skipLibCheck: false`, and then fails at run time. Types cannot catch this,
so the generator enforces the rule:

- **Core recipes (`.ts`) import types only:** `import type { … } from 'cyweb/ApiTypes'`.
  Every runtime value comes through `apis`. Host constants are written as typed literals,
  such as `'nodeBackgroundColor'`, which `VisualPropertyName` checks.
- Because core recipes have no runtime imports, the runner bundles them without resolving
  React or `cyweb/*`.
- **Component recipes (`.tsx`)** may import React and `cyweb/*` hooks at run time. They run
  only inside the verification app (§4.6), where the federation runtime resolves those
  imports.

### 4.4 The `apis` parameter

`buildPerAppApis` (`cytoscape-web/src/app-api/core/perAppApis.ts`) starts from the anonymous
`CyWebApi` and replaces six domains with per-app implementations. That splits the domains in
two:

| Kind | Domains | Parameter type | Where `apis` comes from |
|---|---|---|---|
| Host-wide | `element`, `network`, `selection`, `viewport`, `table`, `visualStyle`, `layout`, `export`, `workspace` | `Pick<CyWebApiType, …>` | Any call site: `context.apis`, `onClick(apis)`, hooks, or `window.CyWebApi` after `whenReady()` |
| Owner-bound | `resource`, `dialog`, `appData`, `contextMenu`, `nodeGraphics`, `panel` | `Pick<AppContextApis, …>` | Only `context.apis` in `mount()`, `onClick(apis)` on an `'apps-menu'` entry, or `useAppContext()?.apis` in a component |

The owner-bound domains behave differently through the anonymous surface:

- Registrations made through the per-app objects carry the app id and are removed when the
  app is disabled. A context menu item registered through `window.CyWebApi.contextMenu` is
  not removed.
- `panel.open` prefers the calling app's own tab when tab ids collide. The anonymous
  `panel.open` may select another app's tab.

**Types alone cannot enforce the right source.** `CyWebApiType` also declares
`contextMenu`, `nodeGraphics` and `panel` with the same types, so `window.CyWebApi`
satisfies `Pick<AppContextApis, 'panel'>`. Three checks cover this together:

1. **Declaration.** The generator requires an owner-bound recipe's parameter to be typed
   `Pick<AppContextApis, …>`. This documents intent; it does not enforce anything.
2. **Source.** In `wiring/` and `runner/app`, the `apis` argument to an owner-bound recipe
   must be written in one of a few **allowed forms**, listed in `WRITING-RECIPES.md`:
   - `context.apis`, inside `mount(context)`;
   - the parameter of an `onClick` arrow function;
   - a `const` initialized from `useAppContext()?.apis`;
   - in `runner/app` only, the single harness field assigned from `context.apis`.

   The generator recognizes those forms and nothing more. Aliases, destructuring, and passing
   `apis` through helper functions are rejected as untraceable, rather than traced. So the
   check stays small, and `window.CyWebApi` or an anonymous `use*Api` hook can never be
   the source.
3. **Behavior.** The verification app's cases (§4.6) include a duplicate tab id, where the
   app's own tab must be selected, and a disable, after which the app's registrations must
   be gone.

### 4.5 Readiness

Four states are easy to confuse:

1. **`window.CyWebApi` exists.** It is assigned before the host finishes hydrating, so its
   stateful methods may not work yet.
2. **The API is ready.** `await window.CyWebApi.whenReady()` resolves when it is.
3. **A network's data is loaded.** This is per network: `network:switched` can arrive before
   the data, and `network:loaded` says that it has arrived.
4. **An app is active.** The host calls `mount()`, waits for it to return, and only then
   marks the app active. Panels and dialogs render only for active apps. So **`mount()` must
   never wait for the app's own UI**: it would wait forever.

The runner always awaits `whenReady()`. The `follow-current-network` recipe covers the whole
network pattern: read on start, read on `network:switched`, read again on `network:loaded`
only for the network on screen, and unsubscribe on unmount.

### 4.6 Verification

**Types.** `tsc -p cookbook` compiles every recipe, case and wiring file with
`skipLibCheck: false` against the api-types installed at the repository root. That proves
compilation against **one** version only, so the cookbook makes one claim for the whole set
and no per-recipe minimum-version claims.

**Generator checks.** `cookbook-index.mjs` parses each file with the TypeScript compiler API,
so comments are never mistaken for code. It rejects:

- a missing tag;
- an unknown `@related` id;
- an `@apis` list that differs from the API call expressions actually in the code;
- a value import in a core recipe;
- an owner-bound recipe without an `AppContextApis` parameter, or called in `wiring/` or
  `runner/app` with an `apis` argument that is not in an allowed form (§4.4).

It also fails when the api-types version that the type check actually resolved differs from
the one in `verified.json`.

**Runner** (minimal in Phase 1, extended in Phase 2):

1. Bundle the core recipes and their cases (`runner/cases/<recipe-id>.ts`) into one script
   with Vite library mode.
2. Before navigating, set the host's debug override (`localStorage['cyweb-debug-enabled']
   = 'true'`). A dev server enables debug by default; a deployed host does not. Open the
   host in Playwright, `await window.CyWebApi.whenReady()`, and inject the bundle. Reuse the
   navigation patterns of `scripts/preflight-host.mjs`.
3. **Separately, wait with a time limit for the boot report**
   (`window.debug.boot.report`). The host publishes it when `WorkspaceEditor` mounts, and
   only while debug is enabled, so `whenReady()` does not guarantee it exists.
4. For each case: build an isolated fixture network with
   `network.createNetworkFromEdgeList`, run the recipe, and read the result back through the
   read-side APIs.
5. **Clean up in `finally`, pass or fail:** delete the fixture network, remove
   subscriptions and registrations, and stop the verification app's dev server. The runner
   can be re-run repeatedly with nothing left behind.
6. A single case can be run by id. `--selftest` proves the runner can fail.

**Verification app** (Phase 3), in `runner/app`, unpublished:

1. The runner starts the app's dev server (§4.1) and installs it with `?installApp=`.
2. `mount()` only registers the app's resources and keeps `context.apis` on a test harness.
   It runs no case and waits for no UI (§4.5).
3. The runner waits until the app is active, using the pattern of the `smokeObservable`
   checks in `apps.manifest.json`: open the right panel and wait for the app's panel to
   render. Then it drives the cases through the harness.
4. Component recipes render with React inside the app's panel or dialogs. Owner-bound
   recipes run with the real per-app `apis`, including the duplicate tab id and disable
   cases (§4.4). The runner disables the app through the host UI and asserts that its
   registrations are gone.

The public Cookbook app is a separate, optional Phase 6.

**The verification record.** A full, passing run writes `cookbook/verified.json`, which is
committed. It is the only source for every "verified with" statement:

| Field | Source |
|---|---|
| api-types exact version, and whether it came from the npm registry | `node_modules/@cytoscape-web/api-types/package.json` and npm's hidden lockfile |
| Host commit | The running host's `window.debug.boot.report.build.commit`, read after the boot report appears (runner step 3). A run fails if the report does not appear in time or the commit is `unknown` |
| Cookbook digest | A hash of everything that can change a verification result: `recipes/`, `wiring/`, and all of `runner/` (cases, the verification app, and the runner's own code and configuration), plus `cookbook/tsconfig.json` |

An examples commit cannot record itself, so the digest identifies which sources were
verified. `GITHUB_SHA` at deploy time is the **examples** commit, not the host commit; the
two are never confused.

**The host commit describes committed code only.** A dev server serves uncommitted changes
too, and the commit value does not show them. A run that will be recorded for release is
therefore made against a dev server **started fresh from a clean checkout** of the commit
it records (§4.8).

**The host.** A host on `localhost:5500`, started with `npm run dev` in a `cytoscape-web`
checkout on `development`. `dev-start.sh` lives in the parent workspace repository, not
here, so `runner/README.md` gives the steps for a standalone clone. Until a beta.5 host is
deployed, the runner runs locally and not in CI (§9, O-2).

### 4.7 Delivery

**In the repository.** `cookbook/README.md` is generated and committed; CI runs `--check`.

**On GitHub Pages.** `llms.txt` and `llms-full.txt` are generated at deploy time, not
committed:

- `deploy-pages.yml` runs on push to `main`. It runs the generator with
  `--revision $GITHUB_SHA` and writes both files into `docs/` before the upload.
  `copy-dist.mjs` replaces only `docs/<publishPath>`, so nothing else touches them.
- `cookbook/` and `guides/` are outside `docs/`, so Pages does not serve them. **`llms.txt`
  links to every recipe and every wiring file** through `raw.githubusercontent.com` URLs
  pinned to the deployed examples commit.
- **`llms-full.txt`** contains `USING-RECIPES.md` (a short usage contract), every wiring
  file, every recipe in full, and links to the API reference. It does not copy the API
  reference.
- **API reference links are pinned to the host commit** in `verified.json`.
- Both files open with the examples commit, the host commit and the api-types version.
- **Deploy-time generation refuses** to run if the cookbook digest does not match
  `verified.json`, or if the recorded api-types did not come from the registry. Recipes
  changed since verification, or verified only against a local tarball, are never
  published as verified.

**In CI.** The `--check` on the committed index does not exercise the deploy-time path.
So a CI job also generates both files into a temporary directory and checks their structure.
CI runs on both `push` and `pull_request`, and the revision must be the commit that is
actually checked out:

- on `push`: `GITHUB_SHA`, which the default checkout already uses;
- on `pull_request`: `github.event.pull_request.head.sha`, checked out explicitly. The
  default checkout of a pull request is a merge commit whose SHA differs from the head.

The structure checks are:

- every recipe and wiring file appears;
- every raw link uses that revision and names a path that exists in the checkout;
- every API reference link uses the host commit from `verified.json`.

**In scaffolded projects.** Three changes reach users only through a `create-cytoscape-app`
release:

- `API_TYPES_VERSION` in `packages/create-cytoscape-app/src/scaffold.ts`, which pins
  `1.0.0-beta.4` today, moves to the version in `verified.json`;
- the templates are regenerated;
- `AGENTS_PLACEHOLDER` (`scripts/sync-templates.mjs`) gains one section naming the
  `llms.txt` URL.

These changes are verified **outside the monorepo**. Here the local beta.5 types are
installed, which would hide a beta.4 pin in a generated project.

### 4.8 Release order

The scaffolder must not point at a URL that is not live yet. The release-packages workflow
skips any version already on npm, so the scaffolder needs a version bump of its own.

1. **Verify before publishing.** beta.5 is on npm. Bump the api-types ranges,
   `API_TYPES_VERSION` and the `create-cytoscape-app` version, and regenerate the templates.
   Re-run the runner against the registry package, and against a host dev server started
   fresh from a clean `cytoscape-web` checkout, to refresh `verified.json`. Then scaffold
   a project from **packed tarballs** outside the monorepo and build it.
2. **Publish the cookbook.** Merge into `development`, then `development` into `main`.
   Confirm that `llms.txt` and `llms-full.txt` are served and that their links resolve.
3. **Publish the scaffolder** through the release-packages workflow.
4. **Check what was published.** Scaffold from the released `create-cytoscape-app` outside
   the monorepo, build it, follow the `llms.txt` URL in its `AGENTS.md`, and run the agent
   acceptance test (§7).

### 4.9 Corrections and links outside `cookbook/`

**Phase 0 — corrections, before any new link:**

- **README:** the event table gains `network:changed`, `network:loaded` and
  `style:switched`; the API table gains `cyweb/PanelApi`, `cyweb/AppDataApi` and
  `cyweb/ScopedApi`.
- **`hello-world/src/components/LayoutSection.tsx`:** failure is a failed `ApiResult`, not a
  rejection.
- **`.serena/memories/lessons.md`:** remove the `remotes.d.ts` instructions and the stale
  port list.

**Links (Phases 1 and 4):**

- **README:** a short "Building with an AI assistant" section near the top that links
  `llms.txt`, the cookbook index and the scaffolded `AGENTS.md`, and a Cookbook row in the
  Documentation Map.
- **`hello-world`:** each section links its related recipes.

### 4.10 Initial catalog

There are 19 recipes. ★ marks the two motivating tasks. † marks recipes that use
owner-bound domains, which are verified by the Phase 3 app. Phase 1 builds the two ★
recipes and `follow-current-network`.

| Category | Recipes |
|---|---|
| elements | ★ `add-nodes-to-network`, `add-edges-between-selected`, `delete-selected` |
| data | `add-computed-column`, `read-column-values-safely` |
| style | ★ `color-nodes-by-numeric-column`, `size-nodes-by-degree`, `color-by-category`, `label-from-column`, `highlight-with-bypass` |
| selection | `select-neighbors`, `select-by-attribute` |
| layout | `run-layout-and-wait`, † `register-app-layout` |
| events | `follow-current-network` |
| ui | † `menu-action-with-dialog`, † `node-context-menu`, † `open-own-panel-after-action`, † `persist-results-per-network` |

### 4.11 Documents

| Document | Contents |
|---|---|
| `cookbook/USING-RECIPES.md` | How to find a recipe, where to copy it, how to get `apis` for each call site, readiness, what `verified.json` records, and the shortest path to seeing a recipe work. Also the usage contract at the top of `llms-full.txt` |
| `cookbook/WRITING-RECIPES.md` | Anatomy and tags, required pitfall topics, import rules, error propagation, preconditions, side effects, unsubscribing, and the generator checks |
| `cookbook/runner/README.md` | Starting a host (including from a standalone clone), running one case, fixture isolation and cleanup, reading a failure, and refreshing `verified.json` |
| `cookbook-checklist.md` (here) | Per-recipe status of the type check and the real-host case, the current `verified.json`, the release-order checks, and the agent acceptance prompts with their results |

## 5. Implementation phases

### Dependencies

| Dependency | Standing |
|---|---|
| The host | **None.** The cookbook only calls the published App API. The runner reads the host's build commit, which the host already exposes |
| api-types `1.0.0-beta.5` | **Unpublished.** Develop against the local tarball (the "Developing against an unpublished api-types" section of `CLAUDE.md`). Phase 5 waits for the npm publish (D-4) |
| A `create-cytoscape-app` release | Needed in Phase 5, after the cookbook is live (§4.8) |
| `@cytoscape-web/app-test` (C-1) | **Not needed.** The runner uses a real host instead of a mock |
| `AGENTS.md` content (E-1) | **Not needed.** This project adds one pointer section |

**Phase 0 — Corrections** (§4.9).

**Phase 1 — Foundation and a minimal runner.** The `cookbook/` layout, the `tsconfig`, the
typecheck wiring, `wiring/`, `USING-RECIPES.md` and `WRITING-RECIPES.md`, the generator
(checks and index), the three Phase 1 recipes with their cases, the minimal runner with
`finally` cleanup, `verified.json`, and the README link. Problems with imports and
readiness surface here, before the catalog grows.

**Phase 2 — Catalog.** The remaining host-wide recipes with their cases, deploy-time
`llms.txt` / `llms-full.txt` generation, and the CI jobs for `--check` and the
generated-file structure.

**Phase 3 — Verification app** for the † recipes and component recipes, including the
duplicate tab id and disable cases.

**Phase 4 — Cross-links.** Link `hello-world` sections to their recipes. Update the roadmap's
"Carved-out projects" table. (The tree in `design/README.md` was updated together with this
document and its checklist.)

**Phase 5 — Release**, after beta.5 is on npm, in the order of §4.8.

**Phase 6 — Public Cookbook app (optional).** A published app whose panel lists the recipes
with a Run button.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Recipes drift from the API | Typecheck with `skipLibCheck: false`; the `@apis` check; a real-host case for every recipe |
| A value import from the declaration-only package passes the types and fails at run time | Core recipes import types only; the generator rejects value imports |
| An owner-bound domain is used through the anonymous API, and the types cannot tell | Only a few allowed forms for the `apis` argument in `wiring/` and `runner/app`, anything else rejected; behavior cases for duplicate tab ids and disabling |
| UI awaited inside `mount()` never appears | `mount()` only registers; the runner starts cases after the app is active |
| A "verified" claim names the wrong commit or stale sources | `verified.json` records the host commit from the running host and a digest of everything that affects verification; deploy refuses a mismatch; release runs use a clean host checkout |
| The local beta.5 types hide a beta.4 pin in generated projects | Verification outside the monorepo, from packed tarballs and then from the released scaffolder |
| The scaffolder points at a URL that is not live, or its release is silently skipped | Release order of §4.8; the scaffolder's own version bump |
| The cookbook duplicates `hello-world` | Separate roles: `hello-world` tours the APIs, the cookbook answers tasks. Each links to the other |
| Maintenance load on one maintainer | Small, independent recipes; every derived artifact is generated |
| The beta.5 publish slips, so the branch lives long | The cookbook lives in its own directory, so rebases rarely conflict |

## 7. Acceptance criteria

| # | Criterion |
|---|---|
| 1 | Every recipe, case and wiring file compiles with `skipLibCheck: false`, and the api-types version the type check resolved equals the one in `verified.json` |
| 2 | The generator rejects each of the following, and has been seen doing so: a missing tag; an unknown `@related` id; `@apis` differing from the calls in the code; a value import in a core recipe; an owner-bound recipe called with an `apis` argument outside the allowed forms |
| 3 | `cookbook-index.mjs --check` passes in CI, and changing an index-affecting field (`@recipe`, `@aliases`, `@related`, or the file's path) without regenerating fails it |
| 4 | On both `push` and `pull_request`, CI generates `llms.txt` and `llms-full.txt` for the commit it actually checked out, and their structure checks pass (§4.7) |
| 5 | **Every recipe in the catalog has a real-host case, and every case passes**, including the duplicate tab id and disable cases. `--selftest` shows the runner failing |
| 6 | The runner starts cases only after `whenReady()` and, for the verification app, after the app is active. It waits for the boot report with a time limit and fails if it does not appear. It cleans up in `finally` and can be re-run with nothing left behind |
| 7 | `verified.json` records the exact api-types version from the registry, the host commit, and the digest. Changing any file under `recipes/`, `wiring/` or `runner/` makes deploy-time generation fail until the runner is re-run |
| 8 | Release follows §4.8: the Pages files are live and their links resolve **before** the scaffolder is published, and the scaffolder's version was bumped |
| 9 | A project scaffolded **outside the monorepo** with the released `create-cytoscape-app` pins the version in `verified.json`, its `AGENTS.md` names a working `llms.txt` URL, and it builds |
| 10 | **Agent acceptance test:** in that project, a fresh agent session is given each ★ task. It finds the recipe through `llms.txt` and writes code that typechecks on the first attempt, with no invented API. The prompts and results are recorded in the checklist |
| 11 | The Phase 0 corrections are in place before the README links the cookbook |

## 8. Review disposition

Every point in all three reviews was checked against the code and **accepted**. Where the
mechanism chosen differs from the review's wording, the last column says so.

### Review of revision 1 (2026-09-30)

| # | Point | Disposition |
|---|---|---|
| 1 | The scaffolder pins `1.0.0-beta.4`; the local beta.5 masks it | Accepted. §4.7, Phase 5 |
| 2 | Await `whenReady()`; readiness is not network loading | Accepted. §4.5; the four-step `follow-current-network` pattern |
| 3 | `contextMenu`, `nodeGraphics` and `panel` are owner-bound too | Accepted. §4.4 |
| 4 | Import rules; `.tsx`; compile the wiring | Accepted. §4.3. Wiring became one compiled file per call site, shared by all recipes, rather than a compiled example in every recipe |
| 5 | One type package cannot prove per-recipe minimums; `@apis` must skip comments | Accepted. `@requires` removed; the set is versioned (§4.6); `@apis` is checked with the TypeScript compiler API |
| 6 | Run the runner earlier; verify owner-bound APIs without the public app; every recipe needs a case | Accepted. Minimal runner in Phase 1, verification app in Phase 3 |
| 7 | Say where `llms.txt` links point; Pages publishes from `main`; narrow O-1 | Accepted. §4.7. To pin the revision, the files are generated at deploy time rather than committed |
| 8 | Fix the contradictions before linking | Accepted as Phase 0, limited to those found so far and those on linked pages; a full E-1a sweep stays out of scope |
| — | Pitfall topics per kind of recipe; the 15-versus-19 mismatch; the README recipe table missing from the generated outputs | Accepted. §4.2 table; §4.10 states 19; Goal 7 no longer promises a README recipe table, since the README links to the index |

### Review of revision 2 (2026-09-30)

| # | Point | Disposition |
|---|---|---|
| 1 | UI awaited in `mount()` deadlocks: the host marks an app active only after `mount()` returns | Accepted. §4.5 state 4; §4.6 verification app; the `ApiResult` rule is limited to core functions (§4.2). The runner detects "active" with the existing `smokeObservable` pattern |
| 2 | `wiring/` is missing from delivery | Accepted. §4.7: `llms.txt` links every wiring file at the pinned revision; `llms-full.txt` includes them |
| 3 | `Pick<AppContextApis, …>` accepts `window.CyWebApi` | Accepted. §4.4: a check on where `apis` comes from in `wiring/` and `runner/app` (narrowed to allowed forms in revision 4); duplicate tab id and disable cases |
| 4 | `GITHUB_SHA` is not the host commit; no record of what was verified | Accepted. §4.6: `verified.json`, with the host commit read from the running host and a digest standing in for the examples revision. (Revision 3 named the wrong path; revision 4 corrects it to `window.debug.boot.report.build.commit`) |
| 5 | Deploy-time generation is not exercised by CI; criterion 3 overclaims | Accepted. §4.7 CI structure check; criterion 3 limited to index-affecting fields |
| 6 | The scaffolder would publish before the cookbook is live; it needs its own version bump | Accepted. §4.8 |
| — | `runner/app` needs a `package.json`; "every recipe verified" conflicts with exemptions; cleanup must survive failure | Accepted. §4.1; no exemptions (Goal 3); `finally` cleanup including subscriptions, registrations and the app's dev server |

### Review of revision 3 (2026-10-01)

| # | Point | Disposition |
|---|---|---|
| 1 | The commit is at `window.debug.boot.report.build.commit`, published only while debug is enabled and only when `WorkspaceEditor` mounts | Accepted. §4.6: the runner sets the debug override before navigating and waits for the report with a time limit, separately from `whenReady()`. The host's own doc comment says the report is "always on `window.debug.boot`"; the code puts it there only while debug is enabled |
| 2 | The digest omits `runner/app` and the runner; the resolved api-types version is not checked; a dev server can serve uncommitted host code | Accepted. §4.6: the digest covers all of `runner/` and `cookbook/tsconfig.json`; the generator compares the resolved version with `verified.json`; release runs use a dev server started fresh from a clean checkout (§4.8) |
| — | Choose the CI revision per event, and check that commit out | Accepted. §4.7: `GITHUB_SHA` on push, the pull request's head SHA, checked out explicitly, on `pull_request` |
| — | Narrow the static analysis of where `apis` comes from | Accepted. §4.4: a short list of allowed forms; anything else is rejected rather than traced |

## 9. Decisions

**Settled**

- **D-1. Scope is B-2 + E-2.** Scaffolded projects get a pointer to the cookbook. E-1b, E-1c
  and E-3 stay out.
- **D-2. Source tree first.** The verification app (Phase 3) is not published. A public,
  runnable Cookbook app is optional Phase 6.
- **D-3. Delivery by URL first.** `llms.txt` on GitHub Pages, linked from `AGENTS.md`, with
  raw URLs pinned to the deployed commit. Bundling recipes into an npm package is revisited
  after the API reaches GA.
- **D-4. Release after the beta.5 publish.** Until then, verify locally against the tarball.
  CI is not changed for the unpublished version.
- **D-5. Code first.** The `.ts` or `.tsx` file is the recipe, and its header is the
  documentation. Wiring is compiled code in `cookbook/wiring/`.
- **D-6. Nothing in `cookbook/` is an npm workspace** (§4.1).
- **D-7. The cookbook is verified as a set**, and `verified.json` is the only source of
  "verified with" statements (§4.6).
- **D-8. `llms-full.txt` = `USING-RECIPES.md` + wiring + every recipe + pinned links to the
  API reference.**
- **D-9. No exemptions.** A recipe without a passing real-host case is not in the catalog.
- **D-10. The cookbook is live before the scaffolder points at it** (§4.8).

**Open**

- **O-1. The final category and recipe list.** §4.10 is a starting point.
- **O-2. Which host the runner uses in CI** once a beta.5 host is deployed (dev1 or
  production).
