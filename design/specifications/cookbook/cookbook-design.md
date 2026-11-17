# Cookbook — Design

> Status: **Draft, revision 8.** Revisions 2–4 incorporate three design reviews; §8 records
> how each point was handled. Revision 5 extends the catalog (§4.10) and adds a backlog
> (§4.12). Revision 6 replans for the published beta.5: the version bump moves to a
> prerequisite pull request, and each phase merges into `development` on its own (§4.8,
> §5, D-4, D-12). Revision 7 answers the review of #23: `llms.txt` is committed into `docs/`
> because Pages serves `main:/docs` as committed (§4.7, D-13), and Phase 0 merges without a
> verification record (D-12). Revision 8 follows a review after a five-week pause
> (2026-11-16). It states which hosts the cookbook supports: **Cytoscape Web 1.1.0 and
> later**, verified on 1.1.0 and on 1.1.1 (§4.6, D-16). Nothing relies on what a host added
> after 1.1.0, and where the two releases behave differently a recipe says so (§4.10, §8).
> The runner also serves an empty app catalog
> (D-14), Phase 0 gains a small follow-up (§4.9), and a later api-types version is adopted
> the way beta.5 was (D-15). §9 lists what is settled and what is still open.
>
> Scope carved out of [`../developer-onboarding/developer-onboarding-roadmap.md`](../developer-onboarding/developer-onboarding-roadmap.md)
> (items **B-2** recipes and **E-2** `llms.txt`). This document is self-contained and
> authoritative for its scope.
>
> Touches **this repository only**. Targets App API **`1.0.0-beta.5`**, published to npm on
> 2026-10-05 as `latest` (host tag `api-types-v1.0.0-beta.5`, `92145e25`). This repository
> has depended on `^1.0.0-beta.5` since the prerequisite pull request of §5 (#21).
>
> **Supported hosts: Cytoscape Web 1.1.0 and later** (D-16). Every recipe, case and
> corrected page must be right on both releases below.
>
> - **1.1.0 is the floor** (tag `v1.1.0`, `6619411b`, 2026-10-14). Its App API is exactly
>   beta.5: between the beta.5 tag and `v1.1.0`, `src/app-api` changed only in documents
>   and tests. Production served this commit on 2026-11-16.
> - **1.1.1 is the latest release** (tag `v1.1.1`, `c3118c51`, published 2026-11-16), and
>   is under test on dev1, which served a build 25 commits before the tag (`bc2b20e9`)
>   that day. It changes behavior that recipes touch, and carries the additions of an
>   **unpublished `1.0.0-beta.6`**.
>
> npm's `latest` is still beta.5, and the cookbook stays on it (§5, D-15). The host's
> `development` (`7714c138`) is not a supported host: it is read only to learn what the
> next release changes.
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
   scaffolder pins the api-types version the cookbook was verified with. The pointer arrives
   through a scaffolder release that comes after the cookbook is live (§4.8).
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
    run.mjs               the runner: bundles, drives a host, writes the record
    hosts.json            the supported releases and their tag commits (D-16)
    harness.ts            the part that runs inside the host page
    selftest-case.ts      a case that must fail (`--selftest`)
    cases/<recipe-id>.ts
    app/                  Phase 3: verification app, with its own package.json
scripts/cookbook-index.mjs        index and llms generator, recipe checks
scripts/cookbook-lib.mjs          what the generator and the runner share:
                                  the digest and the record check
scripts/cookbook-fixtures/        one small tree per generator check, each
                                  seen failing by `--selftest`
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
| Events and async | Ignore events for other networks; discard results that arrive after a switch; no network at all (the last one closed fires `network:switched` with an empty id; added after the review of #27); unsubscribe |

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
- **Only exported types can be imported.** The package declares more than it exports:
  `VisualMappingFunction` and `ColorType`, for example, are declared and not exported. A
  recipe writes the shape it needs, or derives it from an exported type. The type check
  catches this (found in Phase 1).
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
2. **Source.** In `wiring/`, `runner/cases` and `runner/app`, the `apis` argument to an owner-bound recipe
   must be written in one of a few **allowed forms**, listed in `WRITING-RECIPES.md`:
   - `context.apis`, inside `mount(context)`;
   - the parameter of an `onClick` arrow function;
   - a `const` initialized from `useAppContext()?.apis`;
   - in `runner/app` only, the single harness field assigned from `context.apis`.

   The generator recognizes those forms and nothing more. Aliases, destructuring, and passing
   `apis` through helper functions are rejected as untraceable, rather than traced. So the
   check stays small, and `window.CyWebApi` or an anonymous `use*Api` hook can never be
   the source. Each form is checked against the declaration the argument refers to,
   resolved through its lexical scopes, so a correct declaration in one function does not
   vouch for the same name in another. In `runner/cases` no form is allowed yet: the
   minimal runner gives every case `window.CyWebApi`. *(Both after the review of #27.)*
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

Building it showed that those checks are sound only with a few more, so it also rejects:
a use of `apis` that the `@apis` check cannot follow (anything but
`apis.<domain>.<method>(…)`, or handing `apis` to another function of the same file); an
`apis` type that is not a `Pick<…>` naming exactly the domains called; a recipe file with
more or fewer than one exported function; a recipe without a case, and a case without a
recipe. Every check has a fixture that `--selftest` sees failing, next to a control
fixture that must pass.

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

**No other app runs during a case (D-14).** On 1.1.0 this holds without help: catalog apps
start off, and a fresh browser context has no workspace record that turns one on. From
1.1.1 on it does not (`d5d1b0d2`): every entry of the deployment's catalog is a **core
app**, on when the host starts. A dev server's catalog (`src/assets/apps.local.json`)
lists the four example apps, and a deployment's lists its own. A run there would depend on
which of those apps load. So, on every host:

- Before navigating, the runner answers the page's request for the catalog with an empty
  list (Playwright `route`). The path is `/apps.json` on 1.1.0, and `<base>apps.json` from
  1.1.1. It changes no host file.
- The route matches that path exactly. A 1.1.1 dev server also imports
  `/src/assets/apps.json?import` as a module, and answering that request with JSON keeps
  the host from ever becoming ready. Seen on 2026-11-16, when the exact match was tried on
  both releases: no example app loaded, and an app installed afterwards was the only one.
- The run fails if that request was never intercepted. Both releases fetch the catalog, so
  the check works on both, and a changed catalog path cannot pass silently.
- **The run also fails if the host fetched any other app's `remoteEntry.js`.** The empty
  catalog is the means; this checks the end. Every entry is collected, whatever its
  origin, since an app can be served from the host's own. Only the host's own entry is
  set aside, by the exact URL it publishes in `window.__CYWEB_HOST__.remoteEntry` (both
  supported releases do). In Phase 1 no app at all may load.
- The verification app (below) is installed afterwards with `?installApp=`, so it is the
  only app in the page.

**A run sends nothing to analytics.** A local host sends Google Analytics page views, and
1.1.0 sends them without waiting for consent. The runner aborts those requests. It also
closes the welcome dialog and the cookie banner that a fresh profile opens, by their own
buttons, before it touches the toolbar.

**Verification app** (Phase 3), in `runner/app`, unpublished:

1. The runner starts the app's dev server (§4.1), installs it with `?installApp=`, and
   confirms the host's install dialog ("Install into this workspace?", **Install**).
   Confirming an install link also turns the app on; this was seen on both releases.
2. `mount()` only registers the app's resources and keeps `context.apis` on a test harness.
   It runs no case and waits for no UI (§4.5).
3. The runner waits until the app is active, using the pattern of the `smokeObservable`
   checks in `apps.manifest.json`: open the right panel and wait for the app's panel to
   render. Then it drives the cases through the harness. On 1.1.0 the right pane always
   holds the Sub Network Viewer tab, first and selected by default, so the app's panel
   renders only once its own tab is selected. The runner selects that tab by id. This is
   also right on 1.1.1, where the Sub Network Viewer tab exists only for a hierarchy and
   the app's panel comes first (#877).
4. Component recipes render with React inside the app's panel or dialogs. Owner-bound
   recipes run with the real per-app `apis`, including the duplicate tab id and disable
   cases (§4.4). The runner disables the app through the host UI and asserts that its
   registrations are gone.

The public Cookbook app is a separate, optional Phase 6.

**The verification record.** A full, passing run writes `cookbook/verified.json`, which is
committed. It is the only source for every "verified with" statement:

| Field | Source |
|---|---|
| api-types exact version, and whether it came from the npm registry | `node_modules/@cytoscape-web/api-types/package.json`, and npm's hidden lockfile compared with the committed one: `registry` only when the installed package has the integrity the lockfile pins. A version string is not enough: a tarball packed from a host checkout can carry a published version and other declarations |
| Hosts: one entry per verified release, with its version and commit | The running host's `window.debug.boot.report.build.version` and `.commit`, read after the boot report appears (runner step 3). A run fails if the report does not appear in time or the commit is `unknown`. An entry is written only when the commit is a supported release's tag commit (D-16) |
| Cookbook digest | A hash of everything that can change a verification result: `recipes/`, `wiring/`, and all of `runner/` (cases, the verification app, and the runner's own code and configuration), plus `cookbook/tsconfig.json`. Markdown is left out: a README cannot change what a case does, and including it would ask for a new run on two hosts after a spelling fix |

An examples commit cannot record itself, so the digest identifies which sources were
verified. The commit that `llms.txt` pins (§4.7) is an **examples** commit, not the host
commit; the two are never confused.

**The host commit describes committed code only.** A dev server serves uncommitted changes
too, and the commit value does not show them. From Phase 1 on, every merge into
`development` carries a record (§4.8), so every run that refreshes `verified.json` is made
against a dev server **started fresh from a clean checkout** of the commit it records.

**The record names every release it was verified on (D-16).** The cookbook supports
Cytoscape Web 1.1.0 and later. The record has one entry per verified release: the floor,
1.1.0, and the latest release, which is 1.1.1 on 2026-11-16. The record is complete, and
may be merged or published, only when both entries were made from the same digest and
api-types version.

- **An entry is matched by commit, not by version.** `development` and pre-release builds
  report `1.1.1` too; dev1 served such a build on 2026-11-16. The runner knows each
  supported release's tag commit and writes an entry only when the host's commit is one
  of them. On any other host it still runs and reports the cases, and writes nothing.
- **A case asserts what both releases do.** Where a recipe's header states a difference
  between releases (§4.10), its case may assert each side on the host that has it, using
  the host version the runner passes in. It branches for nothing else.
- **The floor decides what a recipe may call.** On 1.1.0 the types and the host agree
  exactly. 1.1.1 implements more than beta.5 declares, such as the `recordUndo` option of
  `viewport.updateNodePositions`. A recipe cannot use it: the type check compiles against
  the registry version only, and the floor does not have it.
- `USING-RECIPES.md` names the supported releases and the record, and says that a recipe's
  header states where the releases differ.

**The host.** Two hosts, one at a time on `localhost:5500`: `npm run dev` in a clean
checkout of the tag `v1.1.0`, then of `v1.1.1`. Two worktrees of one `cytoscape-web` clone
are enough. Node 24.22.1 or later satisfies both; 1.1.1 requires it. `dev-start.sh` lives
in the parent workspace repository, not here, so `runner/README.md` gives the steps for a
standalone clone, including the two checkouts. The runner runs locally and not in CI.
Which deployed hosts CI could use is open (§9, O-2).

### 4.7 Delivery

**In the repository.** `cookbook/README.md` is generated and committed; CI runs `--check`.

**On GitHub Pages.** The site is configured as `build_type: legacy` with source `main:/docs`:
pushing to `main` serves the tracked `docs/` tree **as committed**, and no workflow's output
is ever published (`CLAUDE.md` "Publishing"; `verify-published-apps.yml`). So `llms.txt` and
`llms-full.txt` are **generated and committed into `docs/`**, like the app builds that
`npm run deploy` copies there, and go live when `development` is merged into `main`.

- `cookbook/` and `guides/` are outside `docs/`, so Pages does not serve them. **`llms.txt`
  links to every recipe and every wiring file** through `raw.githubusercontent.com` URLs.
- **The links are pinned to the last commit that changed a linked source** — anything under
  `cookbook/` or `guides/` — found with `git log -1 -- cookbook guides`. A committed file
  cannot name its own commit, but it does not need to: the commit that adds the regenerated
  `docs/llms*.txt` touches no linked source, so the pinned commit still holds exactly the
  content that was linked. Sources therefore change in one commit and the files are
  regenerated in a later one.
- **This relies on merge commits.** A squash merge replaces the pinned commit with a new
  one. This repository merges pull requests with merge commits; if a squash merge happens,
  the CI check on `development` (below) fails until the files are regenerated.
- **The two file names are reserved.** `copy-dist.mjs` deletes `docs/<publishPath>` before
  copying an app, so `llms.txt` and `llms-full.txt` join `RESERVED_PUBLISH_PATHS` in
  `scripts/manifest.mjs`. An app cannot then be published over them.
- **`llms-full.txt`** contains `USING-RECIPES.md` (a short usage contract), every wiring
  file, every recipe in full, and links to the API reference. It does not copy the API
  reference.
- **API reference links are pinned to the floor release's commit** in `verified.json`. Its
  reference describes exactly the published types.
- Both files open with the pinned examples commit, the host releases the record names, and
  the api-types version.
- **The generator refuses** to write them if the cookbook digest does not match
  `verified.json`, if the recorded api-types did not come from the registry, or if the
  record lacks an entry for the floor or for the latest release (D-16). Recipes
  changed since verification, or verified only against a local tarball, are never
  published as verified.
- **Each merge into `main` publishes the catalog verified so far.** Phases merge into
  `development` one at a time (D-12), so `main` can carry a partial catalog. That is
  intended: every recipe in it was verified.

**In CI.** On both `push` and `pull_request`, a job checks out **full history**
(`fetch-depth: 0`, so `git log -- cookbook guides` sees the real last commit), regenerates
both files in memory for the pinned commit, and fails if they differ from the committed
`docs/llms*.txt`. On `pull_request` it checks out `github.event.pull_request.head.sha`
explicitly: the default checkout is a merge commit that does not exist in the repository.

**On `pull_request` it also checks the merge result.** If the target branch changed
`cookbook/` or `guides/` after the branch did, the eventual merge commit itself becomes the
last commit to change a linked source, and the files pinned on the branch go stale the moment
it merges. So the job also inspects the default merge checkout and fails if the last commit
to change `cookbook/` or `guides/` there is the merge itself, asking for `development` to be
merged into the branch and the files regenerated.

The same job runs the structure checks:

- every recipe and wiring file appears;
- every raw link names a path that exists at the pinned commit;
- every API reference link uses the host commit from `verified.json`.

**CI also rejects a stale verification record.** It recomputes the cookbook digest and the
resolved api-types version, and fails when either differs from `verified.json`, when the
record lacks an entry for the floor or for the latest release (D-16), or when the record
or the installed package is not the registry package the lockfile pins (§4.6). CI cannot
run the runner (§4.6), so a pull request that changes anything under `recipes/`, `wiring/`
or `runner/` must carry a refreshed `verified.json`. That keeps `development`, and so
`main`, free of unverified recipes.

**In scaffolded projects.** The scaffolder's api-types pin is not this project's change:
the prerequisite pull request (§5) moved `API_TYPES_VERSION` in
`packages/create-cytoscape-app/src/scaffold.ts` from `1.0.0-beta.4` to `1.0.0-beta.5`, and
`create-cytoscape-app@0.4.2` shipped it. This project adds one thing, which reaches users only through a later `create-cytoscape-app`
release:

- `AGENTS_PLACEHOLDER` (`scripts/sync-templates.mjs`) gains one section naming the
  `llms.txt` URL, and the templates are regenerated.

That release is verified **outside the monorepo**, where the workspace's own installed
types cannot hide what a generated project actually resolves. Its pin must equal the
version in `verified.json`.

### 4.8 Merging and release order

**Each phase merges on its own (D-12).** When a phase's verification passes, `cookbook`
merges into `development`, with a current `verified.json` from Phase 1 on. Phase 0 changes
no file under `recipes/`, `wiring/` or `runner/` and no runner exists yet, so it merges
without one. The branch then continues from there. Two things follow:

- **The README links only what is live.** Phase 1 links the cookbook index in the
  repository. The `llms.txt` link is added only after a merge into `main` has published it.
- **Pages publishes from `main`.** Merging into `development` publishes nothing; `llms.txt`
  first appears when `development` is merged into `main` after Phase 2.

**The scaffolder must not point at a URL that is not live yet.** The release-packages
workflow skips any version already on npm, so the scaffolder needs a version bump of its
own. Phase 5 runs in this order:

1. **Confirm the cookbook is live.** `llms.txt` and `llms-full.txt` are served from Pages,
   and their links resolve.
2. **Prepare the scaffolder.** Add the `AGENTS_PLACEHOLDER` section, regenerate the
   templates, and bump the `create-cytoscape-app` version. Scaffold every template from
   **packed tarballs** outside the monorepo and build it.
3. **Publish the scaffolder** through the release-packages workflow, and confirm that it was
   published, not skipped.
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

**Phase 0 follow-up — found in the review of 2026-11-16, also before any new link:**

The pages the cookbook links to must be right on 1.1.0 and on 1.1.1 (D-16). One statement
is wrong on both. Two are right on 1.1.0 only, because 1.1.1 changed how apps start; they
are reworded to hold on both, not replaced.

- **After an install link (wrong on both).** The README, `guides/getting-started.md` and
  the `project-template` README say to confirm the install and then enable the app.
  Confirming an install link already turns the app on. Phase 0 missed it.
- **"Enable one under Manage Apps" for the four example apps (right on 1.1.0 only).**
  Catalog apps start off on 1.1.0. From 1.1.1 on, a dev host turns them on by itself, and
  reports a load failure for each one whose dev server is not running. The sentences in
  the README, three app READMEs and `CLAUDE.md` §5 are reworded to hold on both ("enable
  it there if it is not already on"), and say what a reader on 1.1.1 sees.
- **Where production apps are registered (right on 1.1.0 only).** `CLAUDE.md` §2 and
  `guides/troubleshooting.md` name the host's `src/assets/apps.json`. From 1.1.1 on, that
  file is empty in the host repository, a deployment's build puts in its own list, and
  every entry is on by default for every user. Both are reworded to "the deployment's
  curated `apps.json`".
- The event tables and the `cyweb/*Api` tables need no change: the event map and the
  exposes are the same at `v1.1.0`, at `v1.1.1` and on `development`.

**Links (Phases 1, 2, 4 and 5) — each added only once its target is live (§4.8):**

- **README, Phase 1:** a short "Building with an AI assistant" section near the top that
  links the cookbook index, and a Cookbook row in the Documentation Map.
- **README, after the first merge into `main` that includes Phase 2:** the same section gains the `llms.txt`
  link.
- **README, Phase 5:** the section names the scaffolded `AGENTS.md`, once the released
  scaffolder emits the pointer.
- **`hello-world`:** each section links its related recipes.

### 4.10 Initial catalog

There are 25 recipes. ★ marks the two motivating tasks. † marks recipes that use
owner-bound domains, which are verified by the Phase 3 app.

- **Phase 1** builds the two ★ recipes and `follow-current-network`.
- **Phase 2** builds the other 17 host-wide recipes.
- **Phase 3** builds the five † recipes.

| Category | Recipes |
|---|---|
| network | `create-network-from-table`, `subnetwork-from-selection` |
| elements | ★ `add-nodes-to-network`, `add-edges-between-selected`, `delete-selected` |
| data | `add-computed-column`, `read-column-values-safely`, `join-table-by-key` |
| style | ★ `color-nodes-by-numeric-column`, `size-nodes-by-degree`, `color-by-category`, `label-from-column`, `highlight-with-bypass`, `set-style-defaults`, `emphasize-by-threshold`, `hide-by-threshold` |
| selection | `select-neighbors`, `select-by-attribute` |
| layout | `run-layout-and-wait`, † `register-app-layout` |
| events | `follow-current-network` |
| ui | † `menu-action-with-dialog`, † `link-out-from-node`, † `open-own-panel-after-action`, † `persist-results-per-network` |

Notes on scope:

- **The six recipes added in revision 5 follow the Cytoscape Desktop tutorials.** "Importing
  Network From Table", "Importing Data From Tables", "Filtering by Selection" and "Basic Data
  Visualization" walk through these steps: build a network from a table, join data by a key
  column, set defaults, emphasize the nodes past a threshold, hide what fails a filter, and
  extract a subnetwork from the selection.
- **`set-style-defaults` exists mainly for its "Don't".** Agents asked to "make every node
  red" set a bypass on every node. The recipe shows the precedence of default, mapping and
  bypass.
- **`select-neighbors` takes a hop count**, for first and second neighbors as in "Basic Data
  Visualization".
- **`add-computed-column` uses degree as its example.** Other centralities belong in
  `analysis/` (§4.12).
- **`link-out-from-node`** (formerly `node-context-menu`) opens an external database page for
  a node from its context menu, the task the tutorial performs.
- **`follow-current-network`'s case dispatches one event itself.** The host delays a
  network's data only after a page reload, and a reload discards the bundle the runner
  injected. So the step "read again on `network:loaded`, and only for the awaited
  network" is driven by a `network:loaded` event the case dispatches. The other three
  steps use the host's own events. A case that reloads the page is possible, and is left
  until a recipe needs it.

**Where 1.1.0 and 1.1.1 differ** (review of 2026-11-16). A recipe must be right on both
(D-16). It is written so that its own code behaves the same on both, and where the host
itself behaves differently, its header says so by version. None of the differences adds
or removes a recipe. Items marked "check" come from a fix's description and have not been
seen on a running host yet: they are observed on both releases before a header states
them.

- **Column names.** 1.1.0 compares them exactly: `Name` and `name` are two columns. 1.1.1
  compares them ignoring case (`120156ff`): `createColumn` fails with `AC6`, and the TSV
  and CX2 imports merge such columns. So recipes and cases never use two names that differ
  only by case, and `data/add-computed-column` says to choose a name that differs from the
  existing ones by more than case. That is right on both.
- **The workspace's tools after an API change of the current network.** On 1.1.0, after
  `createNetworkFrom*` makes a network current, the table browser and the layout tools
  still act on the network shown before. 1.1.1 fixes it (#927).
  `network/create-network-from-table` and `network/subnetwork-from-selection` state the
  1.1.0 behavior as a pitfall, by version. Calls that take a `networkId` are not affected.
- **`network/subnetwork-from-selection` has two possible bodies, and Phase 2 chooses.**
  `network.createNetworkFromNodeList` (in the types since beta.3, and in 1.1.0) makes the
  subnetwork in one call and copies ids, columns, attribute rows and positions; the
  reference does not say that it copies the visual style. Earlier revisions planned
  `export.exportToCx2` followed by `createNetworkFromCx2` and did not mention the direct
  call. The recipe uses the direct call unless the case shows it loses something the task
  needs, and its header says which and why.
- **The right pane.** `ui/open-own-panel-after-action` passes its own tab id. Without one,
  `panel.open('right')` opens the pane on the Sub Network Viewer tab on 1.1.0, and on
  1.1.1 shows nothing on a network that is not a hierarchy until a tab is registered
  (#877). The tab id is right on both.
- **Deleting.** 1.1.0 binds no Delete or Backspace key; 1.1.1 does (#867), and there
  `elements/delete-selected` is for deleting from code. Check what Edit ▸ Undo restores
  after a deletion: 1.1.1 fixed the restoring of node and edge views (#857). The recipe's
  "Side effects" says what was seen on each.
- **Hiding.** Both have the FILTER tab with its show mode. The Select menu, with Hide
  Selected and Show All, is in 1.1.1 only. Check whether selecting a hidden element shows
  it again: 1.1.1 fixed that (`0f8b7f42`). `style/hide-by-threshold` says what was seen on
  each.
- **Layout.** Check which view is fitted after `applyLayout` on a network that is not
  current. The fix (#964) is on `development` only, so the two releases should behave
  alike. `layout/run-layout-and-wait` lays out the current network in its example, and
  names `fitAfterLayout: false` for any other.
- **Keyboard shortcuts** (Undo, Redo, Select All, Delete) exist from 1.1.1. No catalog
  recipe handles keys, so nothing is needed on either.

### 4.11 Documents

| Document | Contents |
|---|---|
| `cookbook/USING-RECIPES.md` | How to find a recipe, where to copy it, how to get `apis` for each call site, readiness, which host releases are supported and what `verified.json` records about them, that a recipe's header states where the releases differ (§4.6), and the shortest path to seeing a recipe work. Also the usage contract at the top of `llms-full.txt` |
| `cookbook/WRITING-RECIPES.md` | Anatomy and tags, required pitfall topics, import rules, error propagation, preconditions, side effects, unsubscribing, writing for every supported release and stating a difference by version (§4.10, D-16), and the generator checks |
| `cookbook/runner/README.md` | Starting a host from a checkout of each supported release's tag (including from a standalone clone), why the runner serves an empty app catalog and records only a release's tag commit (§4.6), running one case, fixture isolation and cleanup, reading a failure, and refreshing `verified.json` |
| `cookbook-checklist.md` (here) | Per-recipe status of the type check and the real-host case, the current `verified.json`, the release-order checks, and the agent acceptance prompts with their results |

### 4.12 Backlog

These recipes are not in the catalog yet. They will be implemented later, one at a time. A
backlog recipe enters §4.10 only with a passing real-host case (D-9). The same change updates
§4.10 and the checklist's status table.

**Planned** — feasible with the current API:

| Recipe | Source | Main APIs | Distinct pitfalls |
|---|---|---|---|
| `network/load-cx2-from-url` | "Loading Networks"; NDEx | `fetch` → `network.createNetworkFromCx2` | CORS; CX2 validation failures; `navigate` and `addToWorkspace` |
| `export/download-network-or-table` | "Saving Results" | `export.exportToCx2`, `table.exportTableToTsv` | The browser download; file names |
| `analysis/select-shortest-path` | A common graph operation | `element` traversal, `selection` | Directed versus undirected; no path; selecting the path's edges |
| `analysis/find-connected-components` | NetworkAnalyzer and clusterMaker basics | `element` traversal, `table` | Isolated nodes; selecting the largest component versus coloring every component |
| `analysis/call-web-service` | App Cookbook "Web Services"; the enrichment tutorials | `fetch`, `table.setValues` | Results that arrive after a switch; partial writes; CORS |
| † `ui/long-running-task-with-progress` | App Cookbook "task monitor" | `dialog.open` | Cancel; the app disabled during a run; never awaiting inside `mount()` |
| `layout/arrange-nodes-programmatically` | App Cookbook node positions; "Advanced Visualization" | `viewport.getNodePositions`, `updateNodePositions` | Nodes without positions (`missing`); arranging only the selection; 1.1.0 does not validate positions and 1.1.1 does (`APP9`), so the recipe validates them itself; the move is not undoable. `{ recordUndo: true }` exists in 1.1.1 but not in beta.5 or 1.1.0, so an undoable version waits for beta.6 and a floor of 1.1.1 (D-15, D-16) |

**Needs a feasibility check first:**

- `style/node-charts-from-columns` ("Custom Graphics and Labels"): the visual properties
  `NodeImageChart1`–`9` exist, but the format of a chart value has not been checked.
- † `style/custom-node-graphics`: `nodeGraphics.setRenderHook`. It overlaps the previous
  recipe; keep one of the two.
- `style/apply-style-from-another-network`: `visualStyle.applyVisualStyle` and `switchStyle`.
- `style/edge-width-by-weight`: the same mapping as `size-nodes-by-degree`, on the edge
  table. Decide whether it is a recipe of its own or a variant of that one.

**API gaps — not recipes.** These operations are frequent in the Cytoscape tutorials, but the
current App API has no way to perform them. They are recorded for the host, outside this
project's scope (§2):

- **Image export (PNG, SVG, PDF).** `ExportApi` has only `exportToCx2`.
- **Zooming to the selection, or setting a zoom level.** `viewport.fit(networkId)` fits the
  whole network only.
- **Laying out only the selected nodes.** `ApplyLayoutOptions` has only `algorithmName` and
  `fitAfterLayout`.
- **Groups (collapse and expand), annotations and legends.**

The first three were checked again on 2026-11-16, on 1.1.0, on 1.1.1 and on `development`
(`7714c138`): all remain on each. The host's own Export Network to Image dialog is user
interface only.

## 5. Implementation phases

### Dependencies

| Dependency | Standing |
|---|---|
| The host | **None.** The cookbook only calls the published App API. The runner reads the host's build version and commit, which the host already exposes. Supported: **1.1.0 and later**. The floor's App API is exactly beta.5, and the record names the floor and the latest release, 1.1.1 (D-16) |
| api-types `1.0.0-beta.5` | **Published** on 2026-10-05 (`latest`). Nothing waits for the publish any more |
| api-types `1.0.0-beta.6` | **Unpublished** on 2026-11-16: its changes are on the host's `development`, and the package version stays at beta.5 until the release. **Not needed:** no catalog recipe calls what it adds, and the floor, 1.1.0, does not implement it. Once published, it is adopted the way beta.5 was; a recipe may use its additions only after the floor rises to 1.1.1 (D-15, D-16) |
| **The prerequisite pull request** | **Done** (2026-10-07, D-4). [#21](https://github.com/cytoscape/cytoscape-web-app-examples/pull/21), a separate pull request to `development` outside this project, moved the five ranges and the scaffolder's `API_TYPES_VERSION` to `1.0.0-beta.5` and updated the beta.4 notes in `CLAUDE.md`. `create-cytoscape-app@0.4.2` is published with the new pin, and `cookbook` has merged `development`. CI now resolves beta.5 |
| A `create-cytoscape-app` release for the pointer | Needed in Phase 5, after the cookbook is live (§4.8) |
| `@cytoscape-web/app-test` (C-1) | **Not needed.** The runner uses a real host instead of a mock |
| `AGENTS.md` content (E-1) | **Not needed.** This project adds one pointer section |

Each of Phases 0–4 merges into `development` once its verification passes (D-12). From
Phase 1 on, the merge carries a current `verified.json`.

**Phase 0 — Corrections** (§4.9). It does not depend on the prerequisite pull request. Its
**follow-up** corrects one statement Phase 0 missed, and rewords two that 1.1.1 made
wrong so that they hold on 1.1.0 and 1.1.1. It lands before Phase 1 adds the README link, in the
same merge or in one of its own.

**Phase 1 — Foundation and a minimal runner.** The `cookbook/` layout, the `tsconfig`, the
typecheck wiring, `wiring/`, `USING-RECIPES.md` and `WRITING-RECIPES.md`, the generator
(checks and index), the three Phase 1 recipes with their cases, the minimal runner with
`finally` cleanup, `verified.json`, the CI check for a stale record, and the README link to
the cookbook index. Problems with imports and readiness surface here, before the catalog
grows.

**Phase 2 — Catalog.** The other 17 host-wide recipes with their cases, the generation of
`docs/llms.txt` / `docs/llms-full.txt` (committed), and the CI job that regenerates them for
the pinned commit and checks their structure. The README's `llms.txt` link follows the first
merge into `main` that publishes it.

**Phase 3 — Verification app** for the † recipes and component recipes, including the
duplicate tab id and disable cases.

**Phase 4 — Cross-links.** Link `hello-world` sections to their recipes. Update the roadmap's
"Carved-out projects" table. (The tree in `design/README.md` was updated together with this
document and its checklist.)

**Phase 5 — Point the scaffolder at the cookbook**, once `llms.txt` is live, in the order of
§4.8.

**Phase 6 — Public Cookbook app (optional).** A published app whose panel lists the recipes
with a Run button.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Recipes drift from the API | Typecheck with `skipLibCheck: false`; the `@apis` check; a real-host case for every recipe |
| A value import from the declaration-only package passes the types and fails at run time | Core recipes import types only; the generator rejects value imports |
| An owner-bound domain is used through the anonymous API, and the types cannot tell | Only a few allowed forms for the `apis` argument in `wiring/` and `runner/app`, anything else rejected; behavior cases for duplicate tab ids and disabling |
| UI awaited inside `mount()` never appears | `mount()` only registers; the runner starts cases after the app is active |
| A "verified" claim names the wrong commit or stale sources | `verified.json` records the host commit from the running host and a digest of everything that affects verification; CI rejects a stale record, and the generator refuses to publish from one; record-refreshing runs use a clean host checkout |
| A merge into `main` between phases publishes something unverified | Per-phase merges carry a current `verified.json` from Phase 1 on, which CI enforces; a partial catalog is published only as far as it was verified |
| A squash merge removes the commit that `llms.txt` pins | This repository merges with merge commits; CI on `development` regenerates the files for the real last source commit and fails on a mismatch |
| The workspace's installed types hide what a generated project resolves | Verification outside the monorepo, from packed tarballs and then from the released scaffolder |
| The scaffolder points at a URL that is not live, or its release is silently skipped | The order of §4.8; the scaffolder's own version bump |
| From 1.1.1 on, another app changes a case's result, or its failed load raises a toast | The runner serves the page an empty app catalog and fails if the request was never intercepted; the verification app is the only app installed (§4.6, D-14) |
| A recipe works on one supported release and not on the other | Every case runs on the floor, 1.1.0, and on the latest release, 1.1.1; the record is incomplete without both, and CI and the generator reject an incomplete record (D-16). "Pre-read files" are read at both tags |
| A recipe uses, or describes as general, something only the newer release has | The types are the floor's, so a call the floor lacks does not compile. Behavior differences are listed in §4.10, stated by version in the header, and observed on both releases first |
| A build that reports `1.1.1` is taken for the release | An entry is matched by the tag's commit, not by the version: `development` and dev1's pre-release build report the same version (§4.6) |
| The cookbook duplicates `hello-world` | Separate roles: `hello-world` tours the APIs, the cookbook answers tasks. Each links to the other |
| Maintenance load on one maintainer | Small, independent recipes; every derived artifact is generated |

## 7. Acceptance criteria

| # | Criterion |
|---|---|
| 1 | Every recipe, case and wiring file compiles with `skipLibCheck: false`, and the api-types version the type check resolved equals the one in `verified.json` |
| 2 | The generator rejects each of the following, and has been seen doing so: a missing tag; an unknown `@related` id; `@apis` differing from the calls in the code; a value import in a core recipe; an owner-bound recipe called with an `apis` argument outside the allowed forms |
| 3 | `cookbook-index.mjs --check` passes in CI, and changing an index-affecting field (`@recipe`, `@aliases`, `@related`, or the file's path) without regenerating fails it |
| 4 | On both `push` and `pull_request`, CI checks out full history, regenerates `docs/llms.txt` and `docs/llms-full.txt` for the pinned commit, finds them equal to the committed files, and passes their structure checks (§4.7) |
| 5 | **Every recipe in the catalog has a real-host case, and every case passes on the floor, 1.1.0, and on the latest release, 1.1.1**, including the duplicate tab id and disable cases. `--selftest` shows the runner failing |
| 6 | The runner starts cases only after `whenReady()` and, for the verification app, after the app is active. It waits for the boot report with a time limit and fails if it does not appear. It serves an empty app catalog and fails if the catalog request was never intercepted, so a run passes whether or not the example apps' dev servers are running. It cleans up in `finally` and can be re-run with nothing left behind |
| 7 | `verified.json` records the exact api-types version from the registry, the digest, and one host entry each for the floor (1.1.0) and the latest release (1.1.1), matched by tag commit and made from that digest (D-16). A run on another commit writes no entry. Changing any file under `recipes/`, `wiring/` or `runner/` without re-running the runner fails CI, and the generator refuses to write `docs/llms*.txt` from it |
| 8 | Phase 5 follows §4.8: the Pages files are live and their links resolve **before** the scaffolder that points at them is published, and the scaffolder's version was bumped |
| 9 | A project scaffolded **outside the monorepo** with the released `create-cytoscape-app` pins the version in `verified.json`, its `AGENTS.md` names a working `llms.txt` URL, and it builds |
| 10 | **Agent acceptance test:** in that project, a fresh agent session is given each ★ task. It finds the recipe through `llms.txt` and writes code that typechecks on the first attempt, with no invented API. The prompts and results are recorded in the checklist |
| 11 | The Phase 0 corrections, and the follow-up for the host changes after 2026-10-07, are in place before the README links the cookbook |

## 8. Review disposition

Every point in all three reviews was checked against the code and **accepted**. Where the
mechanism chosen differs from the review's wording, the last column says so.

### Review of revision 1 (2026-09-30)

| # | Point | Disposition |
|---|---|---|
| 1 | The scaffolder pins `1.0.0-beta.4`; the local beta.5 masks it | Accepted. §4.7, Phase 5. (Since revision 6 the pin moves in the prerequisite pull request, §5) |
| 2 | Await `whenReady()`; readiness is not network loading | Accepted. §4.5; the four-step `follow-current-network` pattern |
| 3 | `contextMenu`, `nodeGraphics` and `panel` are owner-bound too | Accepted. §4.4 |
| 4 | Import rules; `.tsx`; compile the wiring | Accepted. §4.3. Wiring became one compiled file per call site, shared by all recipes, rather than a compiled example in every recipe |
| 5 | One type package cannot prove per-recipe minimums; `@apis` must skip comments | Accepted. `@requires` removed; the set is versioned (§4.6); `@apis` is checked with the TypeScript compiler API |
| 6 | Run the runner earlier; verify owner-bound APIs without the public app; every recipe needs a case | Accepted. Minimal runner in Phase 1, verification app in Phase 3 |
| 7 | Say where `llms.txt` links point; Pages publishes from `main`; narrow O-1 | Accepted. §4.7. To pin the revision, the files are generated at deploy time rather than committed. *(Superseded in revision 7, D-13: Pages never serves a deployed artifact)* |
| 8 | Fix the contradictions before linking | Accepted as Phase 0, limited to those found so far and those on linked pages; a full E-1a sweep stays out of scope |
| — | Pitfall topics per kind of recipe; the 15-versus-19 mismatch; the README recipe table missing from the generated outputs | Accepted. §4.2 table; §4.10 states 19 (25 since revision 5); Goal 7 no longer promises a README recipe table, since the README links to the index |

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

### Review of #23, the Phase 0 merge (2026-10-07)

Copilot reviewed the pull request that merged Phase 0; the points arrived after the merge and
are handled in revision 7.

| # | Point | Disposition |
|---|---|---|
| 1 | D-12 requires a CI-enforced `verified.json` on every merge, but Phase 0 has no runner and no record | Accepted. The requirement starts with Phase 1 (§4.8, D-12) |
| 2 | Pages is `build_type: legacy` from `main:/docs`, so files generated in `deploy-pages.yml` are never published | Accepted, and it was a real design error: `CLAUDE.md` says so. The files are committed into `docs/` (§4.7, D-13) |
| 3 | `guides/architecture-overview.md` still omitted `PanelApi`, `ScopedApi` and `AppDataApi` and claimed image export | Accepted. Fixed; Phase 0's table check now covers every page that lists the `cyweb/*Api` exposes, not the README alone |

### Review of #24, the Phase 0 addendum (2026-10-07)

| # | Point | Disposition |
|---|---|---|
| 1 | §4.6 still said every merge into `development` carries a record, contradicting D-12's Phase 0 exception (Copilot) | Accepted. §4.6 now says "from Phase 1 on" |
| 2 | Checking only the pull request's head misses a merge whose result becomes the last source-changing commit (Codex) | Accepted. On `pull_request`, CI also inspects the merge checkout and fails on that case (§4.7) |
| 3 | `guides/architecture-overview.md`'s event table was as stale as the README's had been (Codex) | Accepted. Fixed; Phase 0's event-table check now covers it too. A second miss on the same page, after #23's review caught its API table |
| 4 | The same page's API-layer examples omitted the anonymous `nodeGraphics` and `panel` and four of the six owner-bound domains (Codex) | Accepted. Fixed to match §4.4 |
| 5 | `docs/llms.txt` and `docs/llms-full.txt` must be reserved publish paths (Codex) | Accepted. §4.7 and a Phase 2 deliverable |

### Review after a pause (2026-11-16)

No work happened between 2026-10-07 and 2026-11-16. This repository did not change: the
`cookbook` branch is still `development` plus one commit. The host released 1.1.0 and
1.1.1, and its `development` gained about 320 commits.

The review took three passes. The first read the design against the host's `development`
and wrote several of its changes into the design as the host's behavior. The second, on
the condition that the cookbook work on the released 1.1.0, found that almost none of
those changes is in 1.1.0, which was tagged one week after the pause began. The
maintainer then stated the condition exactly: **the cookbook must work on 1.1.0 and
later, and 1.1.1 is under test on dev1.** The third pass checked each change against both
tags. The design now supports both releases (D-16), and each row says which release has
the change and what the design does about it.

What the two deployments served on 2026-11-16, read from their bundles: production,
`6619411b`, which is the tag `v1.1.0`; dev1, `bc2b20e9`, a build that reports `1.1.1` and
is 25 commits before the tag `v1.1.1` (`c3118c51`).

| # | Host change | 1.1.0 | 1.1.1 | Disposition |
|---|---|---|---|---|
| 1 | Catalog apps are on by default, so a dev host starts the four example apps (`d5d1b0d2`, `649f219b`, `b60cfd12`) | No: they start off | Yes | The runner serves an empty catalog and checks that it did, on both (§4.6, D-14) |
| 2 | The pages that say "enable the app under Manage Apps" | Right | Wrong for catalog apps | Reworded to hold on both. The install-link sentence is wrong on both (§4.9) |
| 3 | The host's `apps.json` is `[]`, and a deployment puts in its own | No: three example apps | Yes | `CLAUDE.md` §2 and `guides/troubleshooting.md` reworded to hold on both (§4.9) |
| 4 | `viewport.updateNodePositions(…, { recordUndo: true })` and position validation (#874), declared by the unpublished beta.6 | No | Implemented, not declared by beta.5 | The cookbook stays on beta.5 (D-15). The backlog's `arrange-nodes-programmatically` validates positions itself and is not undoable (§4.12) |
| 5 | The right pane is shown only while it has a tab; `'sub-network-viewer'` only for a hierarchy (#877) | No: that tab is always first | Yes | The runner and `open-own-panel-after-action` select the app's tab by id, which is right on both (§4.6, §4.10) |
| 6 | Column names compared ignoring case; imports merge columns (`120156ff`) | No: compared exactly | Yes | Recipes and cases never use names that differ only by case (§4.10) |
| 7 | The workspace's tools follow an API change of the current network (#927) | No | Yes | A pitfall in two recipes, stated by version (§4.10) |
| 8 | Delete and Backspace keys, the Select menu, "Host Keyboard Shortcuts" (#867, #837) | No | Yes | `delete-selected` and `hide-by-threshold` describe both (§4.10) |
| 9 | Fixes to undo of a deletion (#857) and to hidden elements shown on selection (`0f8b7f42`) | No | Yes | Two "check" items: the header states what is seen on each (§4.10) |
| 10 | The layout fit follows the network laid out (#964, #979) | No | No: `development` only | A "check" item; the two releases should behave alike (§4.10) |
| 11 | The host's `engines` field requires Node 24.22.1 (#913) | No: `>=24.0.0` | Yes | The runner's hosts use Node 24.22.1 or later, which satisfies both (§4.6) |
| 12 | The FILTER tab in the left pane | Yes | Yes | `hide-by-threshold` mentions its show mode (§4.10) |
| — | **The same at both tags and on `development`:** the event map (11 events besides `cywebapi:ready`) and the 12 `cyweb/*Api` exposes; `perAppApis.ts` and the six owner-bound domains; the debug override key and `window.debug.boot.report.build`; `?installApp=`, its confirmation dialog and `activate: true`; `ApplyLayoutOptions`, `ExportApi` and `viewport.fit`; the api-types version, `1.0.0-beta.5` | Yes | Yes | Nothing to change |
| — | Found on the way, not a host change: `network.createNetworkFromNodeList` has been in the types since beta.3, and the plan for `subnetwork-from-selection` did not mention it | Yes | Yes | Phase 2 chooses between it and the CX2 round trip (§4.10) |

### Review of #27, Phase 1 (2026-11-17)

Codex and Copilot reviewed the pull request that merges the Phase 0 follow-up and
Phase 1. Every point was checked, and accepted. Each fix has a check that was seen
failing on the code it replaces.

| # | Point | Disposition |
|---|---|---|
| 1 | `Math.min(...xs)` and `Math.max(...xs)` throw on a large network, in two recipes (Codex, Copilot) | Accepted. Both throw a `RangeError` at 150,000 elements, in Node and in Chromium; the host's `maxNetworkElementsThreshold` picks a default layout and does not stop a network loading. Both recipes use a loop and say why in Pitfalls, `WRITING-RECIPES.md` forbids the pattern, and both cases run their recipe on 200,000 elements with a stubbed host |
| 2 | A record made with local api-types passes the check when the version matches (Codex, Copilot) | Accepted. On 2026-11-17 the host's `development` packed beta.6 declarations as `1.0.0-beta.5`, and with them installed the type check passed. The check now requires the registry package the lockfile pins, by integrity, in the record and in the installation (§4.6, §4.7) |
| 3 | The other-app check exempts every entry on the host's origin (Copilot) | Accepted. Only the host's own entry, by its published URL, is exempt (§4.6) |
| 4 | `wiring/from-panel.tsx` shows nothing until the first event, and keeps a stale count when no network is left (Codex, Copilot) | Accepted. It reads once on mount and clears when no network is current. Wiring is type-checked and not run, which is how this passed |
| — | Found while checking 4: `follow-current-network` told the app nothing when the last network closed (the host fires `network:switched` with an empty id) | Fixed with an optional `onNone`, called then and at the start when no network is current; the case closes its own fixtures to see it. "No network at all" joins the Events and async pitfall topics (§4.2) |

CodeRabbit reviewed the same commit later, with 12 points. Five repeat 1, 2 and 4 above.
The other seven were checked and accepted:

| # | Point | Disposition |
|---|---|---|
| 5 | The runner computes the digest when it writes the record, after the cases ran, so a file changed during a run is recorded as verified | Accepted. The digest and the api-types are read before the bundle is built, and a run whose files changed by the end records nothing (§4.6) |
| 6 | The runner reads a failed `getNetworkIds()` as an empty workspace, which hides networks left behind | Accepted. It is an error |
| 7 | The `apis-source` check accepts `useAppContext()?.apis` declared anywhere in the file, so another function's `const apis = window.CyWebApi` passes | Accepted. The argument is resolved through its lexical scopes (§4.4) |
| 8 | `runner/cases` is not checked, and the minimal runner gives cases `window.CyWebApi` (marked unverified by its author) | Accepted. `runner/cases` is checked, with no allowed form until Phase 3 |
| 9 | `wiring/from-panel.tsx` does not refresh after its own button adds nodes | Accepted. It also reads on `network:changed` |
| 10 | D-15 had the next phase merge carry the beta.6 record, but the adoption pull request itself would fail CI without one | Accepted. D-15 corrected |
| 11 | On 1.1.1, an app the user turned off stays off; the READMEs said the apps turn on by themselves. The project-template README's `cd cytoscape-web` cannot work from `my-app` | Accepted. Both corrected in the READMEs and `CLAUDE.md` |

## 9. Decisions

**Settled**

- **D-1. Scope is B-2 + E-2.** Scaffolded projects get a pointer to the cookbook. E-1b, E-1c
  and E-3 stay out.
- **D-2. Source tree first.** The verification app (Phase 3) is not published. A public,
  runnable Cookbook app is optional Phase 6.
- **D-3. Delivery by URL first.** `llms.txt` on GitHub Pages, linked from `AGENTS.md`, with
  raw URLs pinned to the last commit that changed a linked source (D-13). Bundling recipes
  into an npm package is revisited after the API reaches GA.
- **D-4. The beta.5 bump is a prerequisite, not part of this project.** *(Revised in
  revision 6. It read "release after the beta.5 publish"; beta.5 was published on
  2026-10-05.)* A separate pull request to `development` moves the ranges and the
  scaffolder's pin to `1.0.0-beta.5` and releases the scaffolder (§5). The bump is ordinary
  maintenance that every app needs, so it does not wait for the cookbook.
- **D-5. Code first.** The `.ts` or `.tsx` file is the recipe, and its header is the
  documentation. Wiring is compiled code in `cookbook/wiring/`.
- **D-6. Nothing in `cookbook/` is an npm workspace** (§4.1).
- **D-7. The cookbook is verified as a set**, and `verified.json` is the only source of
  "verified with" statements (§4.6).
- **D-8. `llms-full.txt` = `USING-RECIPES.md` + wiring + every recipe + pinned links to the
  API reference.**
- **D-9. No exemptions.** A recipe without a passing real-host case is not in the catalog.
- **D-10. The cookbook is live before the scaffolder points at it** (§4.8).
- **D-11. The catalog grows from the backlog.** §4.10 is what is committed to, and §4.12
  records the rest. A recipe moves from the backlog to the catalog only with a passing case.
- **D-12. Each phase merges into `development` on its own** (§4.8). From Phase 1 on, a merge
  carries a current `verified.json`, which CI enforces; Phase 0, which touches no recipe and
  precedes the runner, merges without one. A merge into `main` between phases publishes the
  catalog verified so far. The README links only what is live, and the scaffolder points at
  the cookbook only in Phase 5.
- **D-13. `llms.txt` and `llms-full.txt` are committed into `docs/`** (§4.7). *(Revision 7;
  revision 2 generated them at deploy time.)* Pages is `build_type: legacy` from
  `main:/docs` and serves the tracked tree, so a workflow-generated file is never published.
  The links pin the last commit that changed `cookbook/` or `guides/`, which the commit adding
  the files does not change. Switching Pages to workflow mode was considered and not taken:
  `deploy-pages.yml` has been failing on `main` since 2026-08-05, and the switch would change
  how every app is published.
- **D-14. No other app runs during a case** (§4.6). *(Revision 8.)* The runner serves the
  page an empty app catalog and fails if the request was never intercepted. On 1.1.0 this
  changes nothing, because catalog apps start off. On 1.1.1 it is needed: the catalog's
  apps are on by default, and a dev host's catalog lists the four example apps. Turning
  the apps off through the host's user interface was considered and not taken: it depends
  on that interface, and the apps would already have loaded once.
- **D-15. A later api-types version is adopted the way beta.5 was** (D-4). *(Revision 8.)*
  The cookbook compiles against what npm publishes, never against a local tarball of an
  unpublished version. When beta.6 is published, a separate pull request to `development`
  moves the ranges and the scaffolder's pin, and **carries a record made with it**: CI
  rejects a record whose api-types version differs from the one resolved (§4.7), so that
  pull request cannot pass without one. *(Corrected after the review of #27: it said
  the next phase merge would carry the record.)* A recipe that needs an unpublished addition stays in the backlog, and
  one that needs an addition the floor lacks waits until the floor rises (D-16).
- **D-16. The cookbook supports Cytoscape Web 1.1.0 and later** (§4.6). *(Revision 8; the
  condition was set by the maintainer on 2026-11-16.)*
  - **1.1.0 is the floor.** A recipe may not depend on anything a host added or fixed
    after it.
  - **Every recipe, case and corrected page is right on every supported release.** It is
    verified on two: the floor, and the latest release, which is 1.1.1 today. The record
    has one entry for each, matched by the tag's commit, and is incomplete without both.
  - **Where the releases behave differently, the recipe's own code behaves the same on
    both, and its header states the difference by version** (§4.10).
  - "Pre-read files" are read at both tags. Earlier revisions said `development`: on
    2026-10-07 it was almost the same as what became 1.1.0, and it no longer is.
  - **A new release** is added by running every case on its tag and adding its entry. It
    then takes the place of 1.1.1 as the latest release; the floor's entry stays.
  - **Raising the floor** is a decision of its own, in one pull request that removes the
    old floor's entry and the version notes that no longer apply.

**Open**

- **O-1. Which backlog recipes (§4.12) to add next, and in what order.**
- **O-2. Which hosts the runner uses in CI.** *(Reworded in revision 8.)* It read "once a
  beta.5 host is deployed". On 2026-11-16 production served exactly 1.1.0, and dev1 a
  pre-release build of 1.1.1 (§8). A deployment can stand for a release only while it
  serves that release's tag commit, which the runner checks. Also open: the verification
  app's dev server is on `localhost`, which dev1 accepts and production may not.
- **O-3. When to raise the floor above 1.1.0.** *(New in revision 8.)* Probably once
  production runs 1.1.1. Raising it lets recipes use what 1.1.1 adds, once beta.6 declares
  it (D-15), and removes the version notes of §4.10.
