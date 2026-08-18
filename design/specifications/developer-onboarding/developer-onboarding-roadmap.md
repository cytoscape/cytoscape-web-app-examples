# Developer Onboarding Roadmap

> Status: **Umbrella proposal**. A prioritized set of improvements, not an implementation plan.
> Each item is picked up independently, and larger clusters are carved out into their own
> design documents as they are scheduled.
>
> Organized by **where the change lands** — this repository or the host (`cytoscape-web`) —
> because that determines what can start today versus what needs a host release cycle.

## Carved-out projects

| Project | Covers | Document |
|---|---|---|
| **App SDK & Scaffolding** | A-1, A-2, A-3b, P-1's final wiring, and a standalone `cyweb-app verify` (no roadmap item of its own) | [`../app-sdk/app-sdk-design.md`](../app-sdk/app-sdk-design.md) |

Items listed above are summarized here for context but are **specified in their own document**;
that document is authoritative for scope, design, and acceptance. Where this roadmap and a
carved-out document disagree, the carved-out document is right and this one is stale.

## Context

This repository exists so third-party developers can build apps for Cytoscape Web.
The goal is to make the barrier to entry as low as it can go. A large share of the
expected audience develops with an LLM in the loop (Claude Code, Cursor, Copilot),
so agent-readability is a first-class requirement, not a nice-to-have.

A survey across this repo and the host found the foundations in better shape than
expected — the Vite migration is complete, `@cytoscape-web/api-types` is on npm, the
guides run to 1,595 lines, the three-layer verification scripts are battle-tested, and
`hello-world` covers every API. What is missing sits at the two ends of the workflow:
**the path from zero to a running app**, and **any way to tell whether what you wrote
is correct**.

**The headline finding of the host-dependency analysis: almost none of this needs the
host.** Exactly one item has no host-independent path (C-2, making load failures
legible). Several others were assumed to need the host and do not.

---

## 1. Diagnosis

### 1.1 The barrier, in numbers

| Fact | Source |
|---|---|
| **18 steps, 2 repos, 6 processes, 6 ports** from zero to your own app running | [`README.md`](../../../README.md) Quick Start + Build Your First App |
| Step 16 has you **edit a git-tracked file in a repository you do not own** (`cytoscape-web/src/assets/apps.local.json`) | ibid., step 4 |
| The app ID must be kept in sync by hand across **three places** (`APP_ID` in `vite.config.ts`, `CyApp.id`, the registry `id`) with no import between them | `project-template/vite.config.ts:16`, `project-template/src/TemplateApp.tsx:31` |
| Load-bearing boilerplate is **hand-copied into 5 apps**: `mfRuntimePlugin.ts` (101 lines) + `cywebHostSentinel.ts` (13 lines) + `vite.config.ts` (322 lines) | `*/src/mfRuntimePlugin.ts` et al. |
| App tests are **5 copies of one file**. Component and API-usage tests: **zero** | `*/test/mfRuntimePlugin.test.ts` |
| A load failure surfaces as **one chip reading "failed"**. `AppLoadState` has no error field at all | `cytoscape-web/src/models/AppModel/AppLoadState.ts`, `AppListPanel.tsx:195` |
| Types cover **13 of 27 exposes**, hand-maintained, already drifting (`ScopedApi` is absent from the published `beta.3`) | `cytoscape-web/packages/api-types/src/mf-declarations.d.ts` |
| The only LLM-facing asset is `CLAUDE.md` — no `AGENTS.md`, no `llms.txt`, no editor rules. That `CLAUDE.md` **instructs agents to update a `remotes.d.ts` that does not exist** | `CLAUDE.md:211` vs `CLAUDE.md:86` |
| `apiVersion` is declared by the host and by every app, and **compared by nobody** | `hostDescriptor.ts:20-22`, which says so itself |
| The publishing path is "email the core team and get a PR merged into `apps.json`". The App Store is a **669-line design document** | `README.md:66-72`, `app-store-design.md` |

### 1.2 Strengths to preserve

- `project-template/vite.config.ts` — a rare config that explains each of its four
  load-bearing items and how each one fails.
- The three verification layers in `scripts/` (`verify:federation` / `preflight:host` /
  `preflight:apps`), which exist because of the 8/5/2026 Jekyll incident. **These turn
  out to be the lever that makes several "needs the host" items host-independent** — see §2.0.
- `guides/` (5 documents, 1,595 lines) and the 13 worked examples in `hello-world`.
- `claude-bridge/mcp-server` — **57 MCP tools over CDP**. The most differentiated asset
  in the repo, currently `published: false` and excluded from the public site.

### 1.3 What the host constrains, verified

| Question | Answer |
|---|---|
| Can an app register itself without editing the host repo? | **Yes, today.** Three paths exist: Install from URL, custom manifest URL/file, and `?installApp=` deep link. `isAllowedOrigin` permits localhost URLs when the host itself is on localhost |
| Can the *deployed* host load a localhost app? | **No.** `isAllowedOrigin` requires `hostIsLocalhost && urlIsLocalhost`. This blocks A-4 structurally |
| Can this repo read the host's shared-singleton set? | **Yes, at runtime.** The host emits no `mf-manifest.json` (its `federation()` call sets no `manifest` option), but `preflight-apps.mjs:125` already reads `__FEDERATION__.__SHARE__.cyweb.default` from a live host page |
| Can this repo detect api-types drift? | **Yes.** Fetch `federationExposes.ts` from GitHub raw and set-compare against the installed declarations |
| Can an app check `apiVersion` itself? | It can **read** it, but not usefully act on it — the host's value is a hardcoded `'1.0'` with no bump policy. See the retraction under P-2 |
| Can a load failure's reason reach the user? | **No.** Only `logApp.warn` behind a debug namespace. This is the one true host dependency |
| Can the manifest and `remoteEntry.js` live on different servers? | **Yes — production already does this.** The allow-list gates the *remote's* URL and never the manifest's, and the templates leave `base` unset so chunks resolve relative to `remoteEntry.js`. Caveats in D-2; the allow-list hole in G-6 |
| Can an organization point a host at its own internal app catalog? | **Only by relying on the G-6 bypass, or by rebuilding the host.** `apps.json` is fetched at runtime, but `config.json` — which carries `appInstallAllowedOrigins` — is a build-time `import`. See Theme H |

---

## 2. Proposals

Each item is tagged **【examples】** (this repo only), **【examples ~】** (host-independent
via a workaround, with the ideal version needing the host later), or **【host】**.

---

### 2.0 Promoted: items that turned out not to need the host

These were originally filed under larger host-touching efforts. Separating them out moves
real risk reduction to the front of the queue at near-zero cost.

#### P-1. Assert the shared singletons against the live host 【examples】

The largest uncontrolled risk in the whole system: nothing reconciles the host's
`FEDERATION_SHARED_SINGLETONS` with each app's `configuredShared`. The day the host moves
to React 19 or MUI v6, **every published third-party app breaks at runtime while CI stays
green.**

`preflight-apps.mjs:125` already reads `__FEDERATION__.__SHARE__.cyweb.default` from a real
host page — and then only **counts** the entries (`sharedFromHost: Object.keys(scope).length`).
Upgrade that count to an assertion over package names and resolved versions against
`apps.manifest.json`'s `configuredShared`.

Cost: small. Effect: converts a silent field breakage into a red CI run. **Do this first.**

#### P-2. ~~Check `apiVersion` app-side~~ — **RETRACTED** 【host】

*Revision 1 claimed the app could compare `window.__CYWEB_HOST__.apiVersion` itself and so
provide a host-independent substitute for C-3. **This was wrong.** The host's value is a
hardcoded `'1.0'` with no policy for ever bumping it, and the documented compatibility
contract is `api-types` SemVer plus feature detection. A comparison against a constant that
never changes detects nothing and manufactures false assurance.*

The app-side resolver reads `apiVersion` for the dev banner only. **C-3 has no
host-independent substitute** and stays entirely on the host track — where the honest options
remain "give the field a bump policy and enforce it" or "delete it".

#### P-3. Detect api-types drift in CI 【examples ~】

Generating `mf-declarations.d.ts` requires the host repo (B-1). **Detecting that it is
stale does not**: fetch `federationExposes.ts` from GitHub raw, extract the expose keys, and
set-compare against the ambient modules in the installed `@cytoscape-web/api-types`. Fail
on divergence.

Today that check would immediately catch two real defects: 14 exposes with no declaration
at all, and `ScopedApi` missing from the published `beta.3`.

#### P-4. Validate the mock against a real host with existing machinery 【examples ~】

C-1's stated risk is a mock that drifts from the host — "tests that pass against the mock
and fail in the browser" are worse than no tests. The proposed mitigation was a shared suite
run in host CI. **The existing preflight machinery substitutes**: run one behavioral suite
against (a) the in-memory mock and (b) `window.CyWebApi` in a real host page under Playwright.
Same suite, two backends, no host change.

---

### Theme A — Get "run it" from 18 steps to 2

#### A-1. New package: `@cytoscape-web/app-runtime` 【examples】

Package the load-bearing code currently copied into five apps.

```ts
// vite.config.ts: 322 lines becomes 3
import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'
export default defineCyWebApp(import.meta.url)
```

- Absorbs `mfRuntimePlugin`, `cywebHostSentinel`, the `federation()` block (all four
  load-bearing items: `type: 'module'`, the entry sentinel, `runtimePlugins`, `shared`),
  `noSharedPayload`, and `zipForAppStore` (the last one **opt-in, default off**).
- Identity comes from a `cyweb` block in the app's `package.json`, not from arguments.
- Carries the shared-singleton set as data, so P-1's assertion has one place to read from.
- Reads `apiVersion` for the dev banner only (see the P-2 retraction).
- **Escape by composition, not by ejection.** Exports the individual primitives, and errors
  on any user config that touches a protected field. *(An `eject` command was proposed in
  revision 1 and rejected — see the SDK design §8.)*
- **Verification stays, and gets more reachable.** `verify:federation` becomes a loop over a
  standalone `cyweb-app verify`, so a scaffolded app can verify itself outside this monorepo.
  Hiding the config is exactly why verifying the output still matters.

#### A-2. Scaffolder: `npm create cytoscape-app` 【examples】

```bash
npm create cytoscape-app my-app -- --id myApp --port 6000 --template panel --yes
```

- Substitutes identity **everywhere at once**, removing the three-way manual sync. Directory
  name, package name, display name, and federation id are four separate flags, not one.
- Template variants: `panel`, `menu`, `context-menu`, `non-react`, `full`.
- **A fully non-interactive mode (`--yes` plus flags) is a hard requirement.** LLM agents
  handle interactive prompts badly; without this the entire agent path is dead on arrival.
- Emits an `AGENTS.md` **placeholder** into the generated project; E-1c owns its content.
- Pins `@cytoscape-web/api-types` to an exact tested prerelease rather than a floating range.
- The dev registration URL is printed by the SDK's dev server, not written to a file (A-3b).

#### A-3. Stop requiring developers to edit someone else's repository 【examples】

All three registration paths **already exist in the host** and are mentioned nowhere here:

| Path | Implementation |
|---|---|
| App Settings → Install from URL | `AppSettingsDialog.tsx` (`data-testid="install-from-url-input"`) |
| Custom manifest URL / uploaded manifest file | same dialog, Manifest Source |
| `?installApp=<manifestUrl>` deep link | `src/models/AppModel/PendingAppInstall.ts` |

`isAllowedOrigin` permits localhost when the host is on localhost, so **this works today**.

This item splits cleanly, and the halves have very different costs:

- **A-3a — documentation only.** Delete "edit `apps.local.json`" from `README.md` and
  `guides/getting-started.md`, replace with Install from URL and the deep link. Needs
  nothing else, not even A-1 or A-2. Hours of work; removes the most offensive step in
  onboarding.
- **A-3b — dev install manifest.** The SDK's dev server serves `/cyweb-app.json` from
  middleware and prints
  `http://localhost:5500/?installApp=http://localhost:6000/cyweb-app.json` once the port is
  actually bound. Needs A-1.
  > Revision 1 had the scaffolder write a tracked `public/cyweb-app.json`. **That breaks the
  > build**: `public/` is copied into `dist/`, where the App Store publish allowlist matches
  > no rule for it and fails deliberately. Serving it also removes the staleness that a
  > tracked copy would acquire on the first port or version change.

> While here: `dev`, `watch`, and `dev:local` in the host are **byte-identical**, yet the
> guide explains a difference between them. The registry is selected by `command`
> (`cytoscape-web/vite.config.ts:215`), not by script name. Fixing the guide is 【examples】;
> removing the duplicate scripts is 【host】 and cosmetic.

#### A-4. A host you do not have to clone 【host】— currently blocked

`isAllowedOrigin` requires `hostIsLocalhost && urlIsLocalhost`, so the deployed host will
not load a localhost app. Any version of this needs a deliberate host decision about a
dev-mode origin exception (and its security implications). **Do not plan around it.**

An alternative that avoids the question entirely: `npx cyweb-dev` fetches a published
static build of the host and serves it on 5500. That needs the host project to publish
build artifacts, which is a release-process change rather than a code change.

---

### Theme B — Support "write it" with types and examples

#### B-1. Generate `mf-declarations.d.ts` 【host】

13 of 27 exposes are declared, by hand. Move to a generator with `federationExposes.ts` as
input, and extend the host's contract test (`federationExposes.test.ts`) to assert
set-equality between declarations and exposes. Alongside that:

- Type the 14 deprecated exposes and carry **`@deprecated` JSDoc into the declarations** —
  both IDEs and LLMs act on it.
- Close the `ScopedApi` gap and **cut `1.0.0` GA**; the README already claims "App API 1.0".

*Host-independent substitute until then: **P-3**, which detects the drift without fixing it.*

#### B-2. `recipes/` — single-file, copy-pasteable snippets 【examples】

`hello-world` is comprehensive at 1,977 lines, far too much for someone who just wants to
color nodes by degree. Add 15–20 standalone snippets:

```
recipes/color-by-degree.tsx         recipes/export-selection-tsv.ts
recipes/listen-selection-change.ts  recipes/create-network-from-csv.ts
recipes/add-context-menu-action.ts  recipes/run-layout-and-fit.ts     ...
```

Each opens with five lines stating what it does, what it imports, and what it requires, and
stands alone. **LLMs adapt a close-fitting snippet far more accurately than they compose
from a specification** — which is why this is sequenced with the LLM work, not with docs.
These become the bulk of `llms-full.txt` (E-2).

#### B-3. `PanelHostProps` is an empty interface 【host】

Panels receive no props at all — no `isActive`, no `networkId`. Every app is forced into the
same `useWorkspaceApi().getCurrentNetworkId()` preamble. Low urgency; bundle with other
host-side API work.

---

### Theme C — Build the "verify it" feedback loop

#### C-1. New package: `@cytoscape-web/app-test` 【examples】

Every `cyweb/*` module is an ambient declaration resolved by the federation runtime, which
means **an app developer cannot write a single unit test today**. Provide an in-memory fake host:

```ts
import { createMockHost } from '@cytoscape-web/app-test'

const host = createMockHost({
  networks: [{ id: 'n1', nodes: ['a', 'b'], edges: [['a', 'b']] }],
})
render(<MyPanel />, { wrapper: host.Wrapper })
await userEvent.click(screen.getByText('Select Neighbors'))
expect(host.api.selection.getSelection('n1')).toEqual(ok({ nodes: ['b'], edges: [] }))
```

- Ship a vitest preset that aliases `cyweb/*` to the mock.
- Ship `ApiResult` assertion helpers (`expectOk` / `expectFail`).
- Keep mock and host honest via **P-4**, not via host CI.
- **This is what changes LLM agent behavior.** Without a fast, deterministic, local signal,
  an agent can only fall back on manual browser checks, and the self-correction loop never closes.

#### C-2. Make load failures legible 【host】— the one irreducible host dependency

All three failure paths in `loadRemoteApp.ts` are `logApp.warn` + `return undefined`, and the
UI shows a "failed" chip. There is **no host-independent substitute**: the reason exists only
in a debug-gated console line that no ordinary user will see.

- Add `error: { code, message, hint, docUrl }` to `AppLoadState`.
- Make the chip clickable — a dialog with the reason, the URL, and a copyable diagnostic block.
- Named error codes (`APP_NO_DEFAULT_EXPORT`, `APP_ID_MISMATCH`, `APP_REMOTE_UNREACHABLE`),
  each with a documentation URL. **Wording must contain the next action**: "Remote 'myApp'
  loaded but exposed no default export from './AppConfig'. Check `exposes` in `vite.config.ts`."
- Add `window.CyWebApi.diagnostics.getAppErrors()` so MCP tools and agents can read failures.

> Note the interaction with A-1: packaging the config structurally eliminates the missing
> `type: 'module'` case that `guides/troubleshooting.md` calls "the least legible failure in
> the whole setup". **A-1 therefore lowers C-2's urgency without replacing it** — which is
> why C-2 is sequenced after A-1 rather than before.

#### C-3. Enforce `apiVersion` host-side 【host】

Refuse to mount on a major mismatch and route the message through C-2. **No host-independent
substitute exists** (see the P-2 retraction), so this is real, unavoidable host work — and it
is not merely a comparison: the field needs a **bump policy** first, or comparing it means
nothing.

The alternative remains available and may be the better one: delete `apiVersion` and rely
solely on the feature detection `packages/api-types/src/CyWebApi.ts` already recommends.

#### C-4. Write real tests in the examples 【examples】

Once C-1 lands, add one or two component tests per example. The point is that **the sample
collection itself demonstrates how to test an app** — not coverage. Also fix
`guides/troubleshooting.md:332`, which uses `jest.mock` in a Vitest repository.

---

### Theme D — "Publish it"

#### D-1. A self-service interim registry 【examples ~】

For the App Store (`apps.cytoscape.org`) the host's **distribution** machinery is fully built —
`?installApp=`, the origin allowlist, `installGate`, semver `compatibleHostVersions`, workspace
persistence. Only the server is missing.

> **Gated on Theme G.** The distribution path being ready is not the same as being safe to
> open: an installed app has the host's full privileges, including credential access. A
> self-service registry must not launch before G-1…G-5. The examples-side work below can be
> built and tested in the meantime; **publishing it is what waits.**

- 【examples】 Add `community-apps.json` with a PR template and CI validation (URL
  reachability, manifest schema, a `preflight:apps`-equivalent check).
- 【examples】 Developers point App Settings → Manifest Source at the catalog URL. Manual,
  but functional today.
- 【host】 A first-class "Community catalog" toggle in App Settings. Deferred; the manual
  path removes the urgency.

#### D-2. A hosting guide 【examples】

Nothing says where to put your `remoteEntry.js`. One page covering GitHub Pages, Netlify,
and S3+CloudFront, with **the `_`-prefixed path trap** (the `_virtual_mf-*` chunks, i.e. the
`.nojekyll` incident itself) and the existing `preflight:apps` presented as the command for
checking your own deployment.

Three requirements the guide must state explicitly, because all three are load-bearing and
none is documented anywhere today:

**The manifest and the artifact may live on different servers — and normally do.** The
production catalog is served from the host's own origin while every `remoteEntry.js` it names
is on `cytoscape.org`. This works because the origin allow-list gates the **remote's** URL and
never looks at the manifest's, and because the app templates deliberately leave `base` unset,
so Module Federation resolves `publicPath: 'auto'` and chunks load relative to wherever
`remoteEntry.js` actually is.

**CORS and MIME are needed in two independent places.** The manifest server must allow the
host origin to `fetch()` it. The artifact server must allow the host origin to `import()`
`remoteEntry.js` **and every transitive chunk** — cross-origin ESM requires CORS — and serve
them as `text/javascript`. Configuring one and not the other produces a failure that looks
nothing like a CORS problem.

**The artifact's origin, not the manifest's, must be on the host's allow-list** for any
install path — `appInstallAllowedOrigins` is `apps.cytoscape.org` and its staging sibling in
production, plus localhost when the host itself is on localhost. Self-hosting a manifest is
unrestricted; self-hosting the artifact it points at is not. Say so plainly rather than
letting a developer discover it at install time.

#### D-3. Give `zipForAppStore` a consumer 【examples】

The zip is produced on every build and nothing consumes it. Make the D-1 submission flow
accept it.

---

### Theme E — LLM-based development (cross-cutting, entirely 【examples】)

> Premise: LLMs fail here in three ways — **(1) inventing APIs that do not exist,
> (2) trusting stale or self-contradictory context, (3) being unable to self-correct because
> failures are unreadable.** (1) and (2) are fully addressable from this repo. (3) is
> partly C-2's job, and partly E-4's.

#### E-1. `AGENTS.md` for the third-party developer's agent 【examples】

The current `CLAUDE.md` is written **for maintainers of this repository**, and it has rotted:
it instructs updating a nonexistent `remotes.d.ts`, references deleted `simple-menu` /
`simple-panel` apps, and cites a `@cytoscape-web/types` package that does not exist. The same
rot is in all five `.serena/memories/` files.

**This is currently negative value, not missing value** — it actively misleads exactly the
audience being targeted. Splitting accordingly:

- **E-1a — remove the wrong things.** Purge the stale claims from `CLAUDE.md`,
  `.serena/memories/*`, and `design/apps/README.md`. Cheap, and worth doing before anything
  new is written.
- **E-1b — write the right thing.** `AGENTS.md` at the repository root (the de-facto
  cross-tool standard read by Claude, Cursor, Copilot, and Codex), with `CLAUDE.md` reduced
  to a one-line `@AGENTS.md` stub. Best written *after* A-1/A-3 land, so it describes the
  new workflow rather than being rewritten twice.
- **E-1c — per-app `AGENTS.md`** emitted by the scaffolder, scoped to rules that apply inside
  *your* app: always check `ApiResult.success`; do not touch the four load-bearing config
  items; panels use `lazy()`; what `unmount` must clean up.

#### E-2. Generate and publish `llms.txt` / `llms-full.txt` 【examples】

Serve at `https://cytoscape.org/cytoscape-web-app-examples/llms.txt`.

- `llms.txt` — an index: every guide, every example, the API reference, each with a one-line
  description.
- `llms-full.txt` — the full API surface plus the recipes, concatenated into one file sized to
  fit a context window.
- **Generate both** from the host's `Api.md` and type declarations (read-only consumption — no
  host change). Hand-maintaining them would manufacture more of failure mode (2).

#### E-3. `api-surface.json` — a machine-readable API surface 【examples】

Aimed squarely at failure mode (1). Generated from `federationExposes.ts` and the TS
declarations: every module × every method × signature × the error codes it can return × a
one-line example.

Three consumers: the source for `llms-full.txt`, the source for MCP tool definitions, and a
**dev-mode "did you mean"** — which `app-runtime` can implement app-side by proxying the API
objects in development, so even this does not need the host.

#### E-4. Turn `claude-bridge` into a public product 【examples】

An MCP server with 57 tools over a live Cytoscape Web, currently `published: false` and hidden.
Two distinct audiences:

1. **End users** — "load this network and color the nodes by degree", in natural language.
2. **App developers' agents** — **drive the host to verify the app they just wrote**: click the
   menu item, read the state back, take a screenshot. With C-1 as the unit layer and this as
   the E2E layer, **the LLM development loop closes end to end.**

The work:

- Publish as `@cytoscape-web/mcp-server` → `npx @cytoscape-web/mcp-server`, with a
  `claude mcp add` one-liner in the README.
- Replace the five-step WSL2 setup (PowerShell portproxy plus a firewall rule) with a
  Playwright-managed Chrome launch.
- Add app-development tools: `install_app_from_url`, `reload_app`, `list_app_resources`, and
  `get_app_load_errors`. The last one ideally reads C-2's diagnostics API — but **it works
  today without C-2**, because the MCP server speaks CDP and can read the console directly,
  where `logApp.warn` is enabled in dev builds.
- Rename to match its purpose, clear `published: false`, and list it as an example.

#### E-5. Distribute a Claude Code skill 【examples】

A skill an app developer installs into their own environment, in the spirit of the host repo's
`docs/prompts/`. Contents: the `CyApp` shape, handling `ApiResult`, the four load-bearing
config items, the known anti-patterns, and the order to run the verification commands. Serves
as the entry point to everything built in E-1 through E-4.

---

### Theme G — The app security boundary 【host】

> Surfaced by the review of the App SDK design. Not a blocker for a Developer Preview;
> **a hard prerequisite for public, self-service app distribution.**

An app runs in the host's own browser context — same origin, DOM, storage, and network
identity. There is no sandbox, no capability restriction, and no signature verification. An
app can import `cyweb/CredentialStore` (one of the 14 legacy exposes still in
`federationExposes.ts`) and **read the user's NDEx credentials**.

Nothing in this roadmap's Track A changes that, and everything in Track A makes it easier to
author an app. That asymmetry is the reason this theme exists.

| Item | Why |
|---|---|
| **G-1** iframe or worker isolation for app code | The only real containment |
| **G-2** A capability API replacing ambient access | Least privilege per app |
| **G-3** Block raw store exposes, `CredentialStore` first | Direct credential read today |
| **G-4** Subresource integrity / artifact signature | The store must be able to verify what it serves; today nothing checks that the artifact matches what its manifest claims (§below) |
| **G-5** Threat model, penetration test, privilege-control E2E | The evidence the gate opens on |
| **G-6** Close the catalog-path bypass of the origin allow-list | The install path's "hard gate" is not applied on the catalog path (§below) |

#### G-6, in detail — the origin allow-list is bypassed on the catalog path

The origin allow-list gates **the remote's URL, not the manifest's** — every
`isAllowedOrigin` call site passes `entry.url`. That is a deliberate and correct choice, and
`runInstallIntents.ts:93-97` states the reasoning: *"A React app's bundle is loaded as code
into this origin, so the allow-list stays a hard gate."*

But it is applied on **only four** paths — the install intent, Install from URL, `installApp`,
and workspace restore. `activateApp` is not one of them: it calls
`loadRemoteApp(id, catalogEntry.url, …)` directly, with no origin check.

For the default catalog (`DEFAULT_MANIFEST_URL = '/apps.json'`, same-origin and operator-
curated) that is fine. It stops being fine the moment a user sets **App Settings → Manifest
Source** to an arbitrary URL: every entry in that manifest is then loaded as code into the
host's origin, from any origin it names, **without passing the gate that the install path
calls mandatory**. The same applies to the "Community catalog" that D-1 proposes — which is
one more reason D-1's launch is gated on this theme.

Related, and the reason G-4 matters independently: **nothing verifies that the artifact matches
its manifest.** `version`, `compatibleHostVersions`, and `name` are claims made by whoever
serves the manifest about a file served by someone else. Only `id` is checked against the
loaded module (`loadRemoteApp.ts:32-37`).

**Acceptance constraint — do not fix this by applying the allow-list to the catalog path.**
The bypass is, today, the only thing that makes **two** planned configurations work against a
host the developer did not build: an organization's internal app catalog (H-2), and a shared
dev host loading an app from `localhost` (H-5). A naive fix deletes both and leaves no
replacement.

The fix must instead be: **a trusted-origin set that is configurable at runtime and applied
consistently on both paths.** The public host then defaults to `apps.cytoscape.org` alone, a
self-hosting organization adds its own internal origin, and a user who points Manifest Source
at an arbitrary URL still has the artifact's origin gated. Security and organizational
distribution are only in conflict if the fix is written narrowly.

**Gate:** D-1 (community registry) and any App Store launch stay closed until G-1 through G-6
land. The SDK ships as a Developer Preview in the meantime, stating the boundary plainly
rather than implying one that does not exist — see
[`../app-sdk/app-sdk-design.md`](../app-sdk/app-sdk-design.md) §3.

---

### Theme H — Organizational app distribution 【host】

> A planned deployment mode: an institution runs an internal web server offering its own
> apps, alongside (or instead of) the public store. Distinct from Theme G — this is about
> **deployment flexibility**, not safety — but the two are coupled through G-6.

Two configurations, with very different standing today.

**Self-hosted host — works, at the cost of a rebuild.** An organization that deploys its own
Cytoscape Web controls `apps.json` (fetched at runtime, so it is a file swap) and
`appInstallAllowedOrigins`. But `config.json` is a **build-time `import`** — `App.tsx:17` and
ten other modules pull it into the bundle — so changing the allow-list means **rebuilding the
host**, while changing the catalog does not. That asymmetry is the friction.

**Public host plus an internal catalog — works only by accident.** Setting App Settings →
Manifest Source to an internal URL persists to IndexedDB (`AppStore.ts:307`), and the internal
remotes load *because the catalog path skips the origin check*. That is G-6. Closing G-6
narrowly removes this configuration outright.

| Item | Detail |
|---|---|
| **H-1** Load `config.json` at runtime | Today it is bundled. An operator should be able to set `appInstallAllowedOrigins` (and the NDEx URL, thresholds, Keycloak settings) without a rebuild — the same treatment `apps.json` already gets via `appsConfigPlugin` |
| **H-2** Additive catalog sources | `obtainCatalogEntries` **replaces**: given a custom source it never fetches `DEFAULT_MANIFEST_URL`. `composeCatalog` unions the manifest with `installedApps`, not manifest with manifest. An organization wanting "internal apps **and** public apps" must copy the public entries into its own manifest |
| **H-3** Organization-wide provisioning | `setManifestSource` is called only from `AppSettingsDialog`. There is no URL parameter, no policy file, no deployment-time default — every user configures it by hand. (`?installApp=` installs one app; it does not select a catalog) |
| **H-4** Keep this configuration working across the G-6 fix | See the acceptance constraint under G-6 |
| **H-5** Let a non-localhost host opt into localhost apps | The allow-list is an EXACT origin match including the port, so "localhost on any port" cannot be expressed at all (§below) |

H-1 is the prerequisite for the others and is independently useful: every value in
`config.json` is currently frozen at build time for every deployment.

#### H-5, in detail — a shared dev host cannot accept a developer's local app

Same shape as the organizational catalog, different audience:
**`https://dev1.ndexbio.org/cytoscape` is intended as a recommended host for app
developers**, with the app itself on `http://localhost:<port>`.

Measured 2026-08-18, and the host side is ready: dev1 publishes a correct
descriptor — `{"name":"cyweb","remoteEntry":"https://dev1.ndexbio.org/cytoscape/remoteEntry.js","apiVersion":"1.0"}`,
with the `/cytoscape/` base present exactly once — and a full seven-key share
scope. An app loads there.

**Installing one does not work**, and cannot be configured to:

```js
if (allowedOrigins.includes(parsed.origin)) return true          // EXACT match, port included
const hostIsLocalhost = window.location.hostname === 'localhost' || '127.0.0.1'
const urlIsLocalhost  = parsed.hostname === 'localhost' || '127.0.0.1'
return hostIsLocalhost && urlIsLocalhost                          // BOTH must be localhost
```

`parsed.origin` carries the port, and there is no wildcard, so allow-listing
"localhost" means allow-listing one port. The scaffolder picks the first free
port from 6000, so it differs per developer and per app. Enumerating them is not
a configuration, it is a losing game.

The fix is a policy change rather than a longer list — one boolean instead of N
ports:

```js
return (hostIsLocalhost || allowsLocalhostApps) && urlIsLocalhost
```

**This route works TODAY only through the G-6 bypass** — Manifest Source reaches
`activateApp`, which skips the origin check entirely. So it joins the
organizational catalog as a second thing the G-6 fix must not quietly remove;
the acceptance constraint under G-6 covers both.

**Until H-1, H-5 and G-6 land together, dev1 is documented for the job it can do
today**: verifying a DEPLOYED app against a real HTTPS host served from a
non-`/` base path, which localhost cannot exercise at all.

---

### Theme F — Drift cleanup

【examples】 unless marked.

| Item | Detail |
|---|---|
| **The lint stack does not exist** | `.eslintrc.json` is present but `eslint` / `prettier` appear zero times in `package-lock.json`, there is no `lint` script and no CI job. `hello-world/README.md:574` claims enforcement by a plugin not even referenced in the config. → Adopt oxlint to match the host, or delete the config |
| README: "the template is not pre-registered" | It has been since `c002f44b`. Following the instruction produces a duplicate id, **dropped with a warning and no other signal** |
| Root README Development Commands | Omits `typecheck`, `test`, `check:imports`, `manifest:validate` |
| `guides/troubleshooting.md:332` | Uses `jest.mock` in a Vitest repository |
| `design/apps/README.md:9-10` | Links to `simple-menu/` and `simple-panel/` design docs that do not exist |
| Repo hygiene | No CONTRIBUTING, CHANGELOG, issue/PR templates, CODEOWNERS, or dependabot config |
| 【host】 Host README App Development section | Still advertises the `new-app-api` branch, the `@alpha` tag, and "Phase 1" — all shipped |
| 【host】 `installGate.ts:17` | Says "webpack DefinePlugin", post-Vite-migration |
| 【host】 `src/app-api/AGENTS.md` | Says `window.CyWebApi` is assigned in `src/init.tsx` (it is `src/boot/bootstrap.tsx`); the directory tree is stale |

#### F-1. The pinned toolchain carries known advisories 【both repos】

Both repositories pin `vite@8.0.13` and `@module-federation/vite@1.16.8`, matched
to each other on purpose, and both carry the same five high-severity advisories:

| Advisory | Reaches us through | Exploitable here? |
| --- | --- | --- |
| `adm-zip <0.6.0` — crafted ZIP triggers a 4GB allocation | `@module-federation/vite` → `dts-plugin` | **No.** The vulnerability is in *parsing* a ZIP; neither repo reads one. The SDK only ever creates them |
| `undici 7.0.0-7.28.0` — twelve advisories | same path | Not reached: `dts-plugin` is build-time type generation, and `dts: false` everywhere |
| `vite 8.0.0-8.0.15` — `server.fs.deny` bypass, launch-editor NTLM disclosure | direct | Windows dev servers only. Affects a developer's own machine, not published artifacts or Cytoscape Web's users |

**None of them reach a published app or an end user.** They are build-tooling
advisories on a developer's machine.

They cannot be fixed in one repository. `@module-federation/vite` produces the
federation output — the remoteEntry format, the share-scope wiring — that this
whole project verifies, and the two repos pin it to the same version precisely so
they cannot disagree. Bumping the examples alone manufactures the host/app
divergence P-1 exists to catch; `npm audit fix --force` would do exactly that,
jumping 1.16.8 → 1.20.7 and vite → 8.2.1, both outside the stated ranges.

Do it as **one coordinated bump across both repos**, through the full loop:
`verify:federation`, the in-host load, and `preflight:apps`. Not as a pre-release
tidy-up.

> Already done, and not a substitute: `@cytoscape-web/app-runtime` no longer
> declares `adm-zip` as a runtime dependency — the App Store zip is opt-in and off
> by default, so the module is loaded at the point of use and the package now ships
> with **zero runtime dependencies**. That is the right shape regardless of the
> advisory, but it does **not** reduce anyone's audit count: `@module-federation/vite`
> pulls `adm-zip` in transitively either way. Only the coordinated bump clears it.


---

## 3. Sequencing

Two tracks. **Track A needs no host coordination and covers everything except one item.**
Ordering principle within each track: **stop the bleeding, then remove steps, then add
capability** — fixing what is actively wrong or actively risky outranks building what is merely
missing.

### Track A — this repository

| Stage | Items | Why here |
|---|---|---|
| **A0 · Stop the bleeding** | **P-1** singleton assertion · **E-1a** purge stale agent context · **A-3a** drop "edit `apps.local.json`" from the docs · F (lint stack, README drift, `jest.mock`, dead links) | All cheap. P-1 is the only item where waiting risks breaking already-published apps in the field. E-1a and A-3a remove instructions that are **actively wrong today** — negative value, and aimed at the target audience |
| **A1 · Remove steps** | **[App SDK & Scaffolding](../app-sdk/app-sdk-design.md)** — A-1 `app-runtime` → A-2 scaffolder → A-3b dev install manifest · **P-3** type-drift detection in CI | The 18-step path collapses here. Now a separate project with its own design doc and six phases |
| **A2 · Close the loop** | **C-1** `app-test` (validated by **P-4**) → **C-4** example tests | Independent of A1, but sequenced after so the tests are written against the new project shape rather than being rewritten |
| **A3 · LLM assets** | **E-1b/c** `AGENTS.md` → **E-3** `api-surface.json` → **B-2** recipes → **E-2** `llms.txt` → **E-4** MCP publication → **E-5** skill | Deliberately after A1/A2: these documents describe the workflow, and writing them first means writing them twice. E-3 and B-2 are both inputs to E-2 |
| **A4 · Publish** | **D-2** hosting guide → **D-1** community registry → **D-3** zip consumer | Only matters once there are third-party apps to publish. **Launching D-1 is gated on Theme G**; building it is not |

### Track B — host repository

| Priority | Item | Note |
|---|---|---|
| **B0** | **C-2** legible load failures | The only item with no host-independent path. Best interleaved **after Track A1**: A-1 removes the most common failure mode, so C-2's remaining scope is smaller and better understood by then |
| **B1** | **B-1** generated declarations + api-types 1.0 GA | P-3 makes the drift visible; this fixes it. GA also settles the "App API 1.0" claim the README already makes |
| **B2** | F 【host】 items (README, `src/app-api/AGENTS.md`, `installGate.ts:17`) | Trivial; fold into whichever host PR comes first |
| **B3** | **B-3** `PanelHostProps` · **C-3** `apiVersion` policy then enforcement, or deletion · **D-1** host catalog UI | Build on evidence. The manual Manifest Source path covers D-1's practical case |
| **B4** | **H-1** load `config.json` at runtime | Cheap, independently useful, and a **prerequisite** for both the organizational catalog (H-2…H-4) and a configurable trusted-origin set in the G-6 fix. Worth pulling forward if any organizational deployment is on the horizon |
| **B5** | **G** the app security boundary, **H-2…H-4** organizational distribution | Not urgent for a Developer Preview; **mandatory before any public, self-service app distribution**. G-6 and H-4 are the same piece of work seen from two directions and must be designed together |
| — | **A-4** deployed host + localhost app | Structurally blocked by `isAllowedOrigin`. Needs a security decision, not an implementation |

### With one maintainer, in practice

Bus factor is 1 (all 127 commits by a single author), so the two tracks are sequential in
wall-clock time. The recommended interleave:

```
A0  →  A1  →  B0 (C-2)  →  A2  →  A3  →  B1  →  A4  →  B2/B3  →  B4/B5
```

Pull **B4 (H-1)** forward if an organizational deployment becomes concrete: it is small, it
unblocks the rest of Theme H, and it is the mechanism the G-6 fix wants to build on.

The single context switch into the host repo sits between A1 and A2, at the point where
onboarding first becomes real enough that failures start reaching actual third-party
developers.

### Checkpoints

- **Design A-1 and A-2 together.** The scaffolder must emit a `vite.config.ts` that calls
  `defineCyWebApp`; either one alone accomplishes little.
- **P-4 is not optional for C-1.** A mock that drifts produces the worst outcome — tests that
  pass against the mock and fail in the browser — and is net-harmful.
- **Do not add hand-maintained artifacts.** Track A adds two packages, a CLI, and an MCP
  server to a one-maintainer project. Every one of them must be generated, asserted, or
  self-verifying.

---

## 4. Files affected

**New (this repository)**
- `packages/app-runtime/` — `defineCyWebApp`, metadata parser + `virtual:cyweb-app-meta`,
  precompiled runtime plugin, sentinel, build gates, and the `cyweb-app` verify CLI
- `packages/app-test/` — `createMockHost`, vitest preset, `ApiResult` assertions
- `packages/create-cytoscape-app/` — CLI, non-interactive mode required
- `AGENTS.md` (root), `recipes/`, the `llms.txt` / `api-surface.json` generators
- `community-apps.json` plus PR template and validation workflow

**Modified (this repository)**
- `scripts/preflight-apps.mjs` — count → assertion (P-1); new drift check script (P-3)
- Every `*/vite.config.ts` (322 lines → a handful); delete every `*/src/mfRuntimePlugin.ts`
  and `*/src/cywebHostSentinel.ts`; `apps.manifest.json` (publish `claude-bridge`)
- `README.md`, `guides/*.md` — registration path, how to test, drift fixes
- `claude-bridge/mcp-server/` — publishable package plus app-development tools
- `CLAUDE.md`, `.serena/memories/*` — purge, then reduce to a stub

**Modified (host `cytoscape-web`)** — the complete list
- `src/models/AppModel/AppLoadState.ts` — add `error` (C-2)
- `src/features/AppManager/loader/loadRemoteApp.ts` — return structured errors (C-2)
- `src/features/AppManager/AppListPanel.tsx` — surface the reason (C-2)
- `src/app-api/core/index.ts` — add a `diagnostics` domain (C-2)
- `packages/api-types/src/mf-declarations.d.ts` — generate; cut 1.0 GA (B-1)
- `README.md`, `src/app-api/AGENTS.md`, `installGate.ts` comment — drift fixes (F)

---

## 5. Acceptance criteria

| Item | Criterion |
|---|---|
| P-1 | Hand-editing a `configuredShared` version in `apps.manifest.json` turns CI red. Bumping the host's React major (simulated) turns CI red |
| A-3a | Neither `README.md` nor `guides/` mentions `apps.local.json`, and the documented path works against a stock host clone |
| A-1 / A-2 | On a clean machine, `npm create cytoscape-app my-app -- --yes --id x --port 6000` → `npm run dev` → open the printed `?installApp=` URL — **and nothing else** — shows the panel. All five existing apps build through the new package and pass `cyweb-app verify`. *(The SDK design's §7 is the full list and is authoritative.)* |
| G | Every published SDK version carries the Preview deprecation notice, and no public app catalog launches, until G-1…G-6 land. (Withholding the `latest` dist-tag was the original mechanism and is **not possible** — npm assigns it to a new package's first version and refuses to delete it; see the app-sdk runbook §2) |
| G-6 / H-4 | After the bypass is closed, an organization can still serve its own catalog **and** its own artifacts to a host it did not build — verified end to end, not asserted. A fix that passes the security test and fails this one is not done |
| H-1 | Changing `appInstallAllowedOrigins` takes effect by replacing a served file, with no rebuild — the treatment `apps.json` already gets |
| C-1 / P-4 | `project-template` has a "click the menu item → the selection changes" test that passes with no browser, no host, and no network — **and the same suite passes against a real host page** |
| C-2 | Breaking the URL, removing the default export, and mismatching the id each produce **a different, specific, actionable reason** in the UI |
| P-3 | The check fails today (14 undeclared exposes, missing `ScopedApi`) and passes after B-1 |
| E-4 | On a bare machine, `npx @cytoscape-web/mcp-server` → `cytoscape_get_workspace` succeeds from Claude, with none of the five manual WSL2 steps |
| E-2 / E-3 | CI verifies the generated files match their sources. Hand edits are rejected |
| Overall | **Field test**: give an LLM agent that has never seen this repository only `AGENTS.md` and `llms.txt`, ask it to build an app that colors nodes by degree, and measure whether it finishes. Run the same task before and after, and compare the number of correction rounds |
