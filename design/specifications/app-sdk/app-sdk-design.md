# App SDK & Scaffolding — Design

> Status: **Draft — approved for Developer Preview implementation.**
> The design is settled enough to build; the artifacts ship under the `next` dist-tag as a
> Developer Preview, not as GA. §3 states what Preview does and does not promise.
>
> Scope carved out of [`../developer-onboarding/developer-onboarding-roadmap.md`](../developer-onboarding/developer-onboarding-roadmap.md)
> (items A-1, A-2, A-3b, P-1). This document is self-contained and authoritative for its scope.
>
> Touches **this repository only**. No host change is required at any point — but see §3,
> which records host-side work that gates GA.
>
> Revision 2 incorporates an external design review; §8 records what was accepted, what was
> rejected, and why.
>
> **Implementation tracking: [app-sdk-checklist.md](app-sdk-checklist.md)** — the phases below,
> broken into checkable items with per-phase verification.

## 1. Problem

Starting a Cytoscape Web app means copying `project-template/` and hand-editing it. Three
concrete costs follow.

**Load-bearing boilerplate is duplicated five times.** Every app carries its own copy of
`vite.config.ts` (322 lines), `src/mfRuntimePlugin.ts` (101 lines), and
`src/cywebHostSentinel.ts` (13 lines) — of which the app-specific content is **two constants**:
`APP_ID` and `DEV_SERVER_PORT`. The five copies of `test/mfRuntimePlugin.test.ts` (122 lines
each) differ only by an app-name string.

**Four things in that config are load-bearing and fail illegibly.** The template documents
them at length precisely because each one looks correct when it is wrong:

| # | Item | Failure when wrong |
|---|---|---|
| 1 | `remotes.cyweb.type: 'module'` | The remote resolves **no exports** against the ESM host and **nothing throws**. `guides/troubleshooting.md` calls it "the least legible failure in the whole setup" |
| 2 | Production `entry` is `CYWEB_HOST_REQUIRED`, not a URL | A deployed app points at the **end user's own** `localhost:5500` |
| 3 | `runtimePlugins: [mfRuntimePlugin]` | The resolver file alone is inert; the app silently keeps its compiled-in entry |
| 4 | `shared` keys exactly matching the host's five singletons, `import: false` | A `@mui/material/Box` subpath import silently bundles a second MUI |

**The app ID must be kept in sync by hand in three places** with no import between them:
`APP_ID` in `vite.config.ts:16`, `CyApp.id` in `TemplateApp.tsx:31`, and `id` in the host's
registry. Nothing detects a mismatch until the host refuses to load the app.

## 2. Goals / Non-goals

**Goals**

1. An app's build configuration is **one function call**, and the four load-bearing items
   cannot be got wrong because the app never states them.
2. App metadata is declared **once** and every other use site derives from it.
3. `npm create cytoscape-app` produces a running app with **no manual editing**, and with a
   **fully non-interactive mode** — LLM agents handle interactive prompts badly, and they are
   a primary audience.
4. A new app registers with a local host **without editing the host repository**.
5. A scaffolded app can be **verified outside this monorepo** (`cyweb-app verify`).
6. The five existing apps migrate onto the SDK, proving it covers the real range (including
   the non-React app and the app with two exposes).

**Non-goals** — each belongs elsewhere:

- **Isolating untrusted app code.** The SDK neither creates nor removes the trust boundary;
  see §3.
- `@cytoscape-web/app-test` (the mock host and unit-test story).
- `AGENTS.md` / `llms.txt` / `api-surface.json` content. The scaffolder emits an `AGENTS.md`
  **placeholder**; the LLM project owns what goes in it.
- Any host change: legible load failures (C-2), generated type declarations (B-1),
  `PanelHostProps` (B-3), meaningful `apiVersion` enforcement (C-3).
- Deterministic App Store packaging (`cyweb-app package`) and the community registry —
  the publishing project.
- The full documentation rewrite. This project updates only the pages describing the scaffold
  path.

## 3. Trust boundary and release posture

**A Cytoscape Web app runs in the host's own browser context.** It shares the host's origin,
DOM, storage, and network identity. There is no sandbox, no capability restriction, and no
signature verification. An app can import `cyweb/CredentialStore` — one of the 14 legacy
exposes still listed in `federationExposes.ts` — and read the user's NDEx credentials.

The SDK does not change this. It does, however, **lower the barrier to authoring apps**, which
raises the exposure of an unchanged model. That asymmetry is why the release posture is
staged rather than "publish and see".

**Developer Preview (this project's deliverable)**

- Published under the `next` dist-tag, versioned `0.x`, and **every version
  carries an npm deprecation notice** naming the Preview status and the trust
  boundary. That notice is the gate — see the correction below.
- The README and the generated `AGENTS.md` state the boundary in plain terms: *an app you
  install has the same privileges as Cytoscape Web itself; install only apps you trust.*
- **No import allowlist.** Restricting app sources to the typed `cyweb/*` modules was
  considered and **dropped** (§9 D-2). As a security control it is worthless — the threat is a
  malicious app author, who simply would not use this build tooling — and shipping it inside a
  section about the trust boundary would imply a containment that does not exist. The honest
  version of its value is a deprecation signal on the raw store exposes, which belongs in the
  type declarations (roadmap B-1), not here.
- What Preview does **not** promise: safety of untrusted app code, accurate runtime API
  version enforcement, or legible load-failure reporting.

> **Correction (2026-08-18).** An earlier revision made "no `latest` dist-tag"
> the release gate. **That is not achievable on npm**: the registry assigns
> `latest` to a brand-new package's first version whatever `--tag` says, and
> refuses to delete it (`400`, after a successful auth; the CLI docs do not
> mention the restriction). `0.1.0` went out carrying both `next` and `latest`
> before this was discovered.
>
> The mechanism is now a **deprecation notice** applied to every published
> version, which is arguably the stronger one: almost nobody notices a missing
> dist-tag, while npm prints a deprecation on **every install**. What the tag
> still buys is that publishing with `--tag next` does not MOVE `latest`, so a
> later Preview cannot become the default install by accident.

**GA is gated on host-side work**, none of it in this project's scope. Registered on the host
track of the roadmap:

| Prerequisite | Why |
|---|---|
| iframe or worker isolation for app code | The only real containment |
| A capability API replacing ambient access | Least privilege per app |
| Blocking raw store exposes, `CredentialStore` first | Direct credential read today |
| Subresource integrity / artifact signature | The store must verify what it serves. Nothing today checks that an artifact matches the `version` and `compatibleHostVersions` its manifest claims — only `id` is verified against the loaded module |
| Closing the catalog-path allow-list bypass | `activateApp` loads `catalogEntry.url` with no origin check, so a user-set Manifest Source can load code from any origin — the gate the install path calls mandatory. Must be closed **without** removing organizational internal catalogs, which currently depend on it (roadmap Theme H) |
| Structured load errors (C-2) | A gated install that fails silently is worse than none |

The App Store (roadmap D-1) inherits the same gate: **no public, self-service distribution of
third-party apps before these land.**

## 4. Design

### 4.1 Packages

| Package | Contents | Notes |
|---|---|---|
| `@cytoscape-web/app-runtime` | `./vite` — config builder and build plugins · `./meta` — metadata schema, types, and the `virtual:cyweb-app-meta` declaration · `bin: cyweb-app` — the standalone verifier · internal: the precompiled MF runtime plugin | An app's **devDependency**. Public exports are exactly `./vite` and `./meta` |
| `create-cytoscape-app` | The scaffolder CLI and its templates | Run once, never installed |

`@cytoscape-web/api-types` stays a **direct dependency of each app**, not a re-export of the
SDK: coupling an SDK release to every types release would force churn in both directions.

The `bin` is not an export, so it does not widen the public API surface; it is available as
`npx cyweb-app verify` in any app that already has the SDK.

Node ≥24, ESM only, matching the repository.

### 4.2 `defineCyWebApp`

```ts
// vite.config.ts, in full
import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url)
```

`import.meta.url` is a required first argument. The SDK must locate the app root to read
`package.json`, and `process.cwd()` is wrong whenever Vite runs from a monorepo root or with
`--config`. The explicit argument costs nothing and is always correct. *(This also closes
what revision 1 left as an open question about a zero-argument form.)*

```ts
defineCyWebApp(import.meta.url, {
  react?: boolean                    // default true; false ⇒ no React plugin, no shared block
  exposes?: Record<string, string>   // merged with the mandatory './AppConfig'
  devHostPageUrl?: string            // default http://localhost:5500
  devHostRemoteEntryUrl?: string     // default derived from devHostPageUrl via the URL API
  appStoreZip?: boolean              // default FALSE — see §4.9
  vite?: UserConfig                  // merged last; conflicts with protected fields are fatal
})
```

`react: false` exists because `network-statistics` is a non-React app that legitimately
declares `configuredShared: {}` and no peer dependencies. `exposes` exists because
`hello-world` exposes a second module (`./NetworkSummaryMenuItem`) as its strongest test of
the shared-React singleton.

**Removed relative to revision 1:** an `id` override (identity has exactly one source — §4.3)
and wholesale `shared` replacement (it would defeat the centralization that P-1 depends on).

**Protected fields.** These are set by the SDK and are not user-configurable:

- the MF runtime plugin registration
- `remotes.cyweb` — `type`, `name`, `entryGlobalName`, `shareScope`, and the production entry sentinel
- the shared singleton set and its `import: false` / `singleton: true` flags
- the `./AppConfig` expose
- `server.port`, `server.strictPort`, `server.origin`, the CORS header
- `build.target`, `build.outDir`, and the deliberate absence of `base`

The `vite` option is merged **last**, and if it sets any protected path the build **fails with
a named error** identifying the path. It neither silently wins nor silently loses. This
preserves extensibility — plugins, `resolve.alias`, `define`, `test` config — without putting
the four load-bearing items back in reach. §8 records why this differs from the review.

**Composable primitives** (`cywebFederation`, `noSharedPayload`, `CYWEB_SHARED`) remain
exported and are documented as **advanced and unsupported**: outside the guarantees the
high-level API makes.

### 4.3 One declaration of app metadata

The canonical source is the app's `package.json`: standard fields where they exist, and a
validated `cyweb` block for what is Cytoscape-specific.

```json
{
  "name": "@example/my-app",
  "version": "0.1.0",
  "description": "Colors nodes by degree",
  "author": "Jane Roe",
  "license": "MIT",
  "repository": "https://github.com/example/my-app",
  "cyweb": { "id": "myApp", "displayName": "Degree Colorizer", "port": 6000 }
}
```

Parsed **once**, with runtime schema validation, at `defineCyWebApp` time. `id` is checked
against `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/` — the same rule the host's `parseManifest.ts` applies,
so an id that passes locally cannot be rejected on install. `cyweb` is reserved. `version`
must be canonical SemVer. Invalid metadata fails the build with the offending field named.

**App code receives an allowlisted subset through a virtual module**, never the raw file:

```ts
import { id, displayName, version, description } from 'virtual:cyweb-app-meta'

export const MyApp: CyAppWithLifecycle = { id, name: displayName, version, description, ... }
```

Revision 1 followed the existing `import packageJson from '../package.json'` pattern
(`TemplateApp.tsx:22`). That is a defect: it bundles the **entire** `package.json` —
devDependencies, scripts, private fields — into the browser bundle. The virtual module
exposes six fields, drops the `resolveJsonModule` requirement, and makes the id
unforgeable-by-typo. `./meta` ships its type declaration.

Consumers, one source:

| Consumer | Reads |
|---|---|
| `vite.config.ts` | `<root>/package.json` via `node:fs` |
| `CyApp` | `virtual:cyweb-app-meta` |
| Dev install manifest | Generated per request (§4.5) |
| `apps.manifest.json` | Generated from app metadata + `CYWEB_SHARED` (§4.8) |

### 4.4 What moves into the SDK, and what changes on the way

Extraction is not a pure move; four things must be reworked because they currently depend on
living beside the app.

| Current | In the SDK |
|---|---|
| `mfRuntimePlugin` path via `new URL('./src/mfRuntimePlugin.ts', import.meta.url)` | Resolved inside the package via `createRequire(import.meta.url).resolve(...)`, still `normalizePath`-ed. **Shipped precompiled as `.js`** — `runtimePlugins` entries are interpolated into an `import "<path>"` in a generated virtual module, and a `.ts` file inside `node_modules` is not reliably transformed |
| `zipForAppStore` / `noSharedPayload` reading `new URL('./dist', import.meta.url)` | Take the app root from Vite's `configResolved` hook (`config.root`, `config.build.outDir`) instead of the config file's own location |
| `APP_VERSION` from `readFileSync(new URL('./package.json', …))` | Read once by the metadata parser (§4.3) |
| `CONFIGURED_SHARED` duplicated per app | `CYWEB_SHARED`, exported. **The single source of truth** that P-1's assertion, each app's `peerDependencies`, and the generated `apps.manifest.json` are all derived from or checked against |
| Five copies of `test/mfRuntimePlugin.test.ts` | One suite in the SDK package |

The extensive comments in `project-template/vite.config.ts` move with the code they explain.
This is a real loss to acknowledge: that file is one of the repository's documented strengths,
and hiding it removes a teaching artifact. Mitigation — the template keeps a short block
stating what `defineCyWebApp` sets up and why, linking to the SDK source for the full
reasoning, and `guides/architecture-overview.md` keeps the four-item table.

**`apiVersion` is read for diagnostics only.** Revision 1 proposed an app-side major/minor
check against `window.__CYWEB_HOST__.apiVersion`. That is withdrawn: the host's value is a
hardcoded `'1.0'` with no bump policy, and the documented contract is `api-types` SemVer plus
feature detection. A comparison against a constant that never changes detects nothing and
manufactures false assurance. The resolver continues to validate `name` and `remoteEntry`, and
surfaces `apiVersion` in the dev banner. Making the field meaningful is host work (roadmap C-3).

### 4.5 Registering with a local host, without a tracked file

The host already implements three registration paths and this repository documents none of
them. `installGate.isAllowedOrigin` permits a localhost app URL when the host is itself on
localhost, so the deep link works today against a stock host clone.

**The manifest is served by dev middleware, not written to `public/`.** Revision 1 wrote a
tracked `public/cyweb-app.json`; that is a defect on two counts. It goes stale the moment the
port or version changes, and — decisively — `public/` is copied into `dist/`, where
`APP_STORE_PUBLISH_CLASSES` matches no rule for it and **deliberately fails the build**
(`project-template/vite.config.ts:164`). It would break on the first `npm run build`.

Instead the SDK registers middleware serving `/cyweb-app.json`, generated per request from the
parsed metadata, and prints the banner **after the server actually listens**, so the port shown
is the port bound:

```
  Cytoscape Web app "myApp" — http://localhost:6000

  Install into a local host:
  http://localhost:5500/?installApp=http://localhost:6000/cyweb-app.json
```

All URLs are composed with the `URL` API, not string concatenation, so a host served under a
base path still produces a correct link. `devHostPageUrl` and `devHostRemoteEntryUrl` are
separate options because they are different things.

> Deployed hosts remain out of reach: `isAllowedOrigin` requires `hostIsLocalhost && urlIsLocalhost`.
> A production install manifest is the publishing project's concern.

### 4.6 `create-cytoscape-app`

```bash
# interactive
npm create cytoscape-app@latest

# non-interactive — the mode agents and CI use
npm create cytoscape-app@latest my-app -- \
  --id myApp --display-name "Degree Colorizer" --port 6000 --template panel --yes
```

| Flag | Default |
|---|---|
| *target directory* | positional; must not exist, or must be empty and not a symlink |
| `--package-name` | derived from the directory name |
| `--id` | derived from the directory name, camelCased and validated |
| `--display-name` | derived from `--id` |
| `--port` | first free port from 6000, skipping 5500 and the examples' 2222/3333/5555/6100/7000 |
| `--template` | `panel` · `menu` · `context-menu` · `non-react` · `full` |
| `--yes` | accept every default, never prompt |
| `--pm` | `npm` or `pnpm`, both formally supported |
| `--no-install` | skip dependency install |

Directory name, package name, display name, and federation id are **four separate things** and
are not conflated.

**`--yes` plus flags must cover every prompt.** A prompt with no flag equivalent is a bug: it
makes the agent path unusable.

**All validation runs before any filesystem side effect.** A non-empty or symlinked target, an
unknown flag, a reserved or malformed id, an occupied port, an invalid SemVer, or an `exposes`
key colliding with `./AppConfig` aborts with nothing written.

Generated projects **pin `@cytoscape-web/api-types` to an exact prerelease** that the SDK's
tests were run against. `^1.0.0-beta.3` floats across betas — which is how the examples ended
up on `beta.3` while the host source was at `beta.4` with `ScopedApi` missing. Optional
capabilities use feature detection, per the package's own recommendation.

Generated tree (`panel` template):

```
my-app/
├── package.json          ← name, version, cyweb block, peerDeps derived from CYWEB_SHARED
├── vite.config.ts        ← 3 lines
├── index.html            ← remote-only stub
├── tsconfig.json  tsconfig.node.json  tsconfig.test.json
├── AGENTS.md             ← placeholder; the LLM project owns the content
├── src/
│   ├── index.ts          ← export { default } from './MyApp'
│   ├── MyApp.tsx         ← CyAppWithLifecycle, metadata from virtual:cyweb-app-meta
│   └── components/MyPanel.tsx
└── test/smoke.test.ts    ← asserts the AppConfig shape; see §7
```

No `TODO:` markers survive: everything they currently mark is substituted at generation time.

### 4.7 `cyweb-app verify`

`npm run verify:federation` today is a repo-root script reading `apps.manifest.json` — a
third-party developer has no way to run it on their own app. Repackaging
`scripts/verify-federation-build.mjs` as `npx cyweb-app verify` makes this repository's
strongest asset available to the people the project exists for.

Checks, against a built `dist/`:

- the federation shape — ESM entry, `type: 'module'`, the runtime plugin registered, the
  production sentinel shipped rather than a localhost URL
- metadata consistency — `mf-manifest.json` matches the parsed `package.json`
- shared payload — no MUI, Emotion, React, or ReactDOM implementation in the remote's chunks
- **no absolute workspace paths** and no full `package.json` in the output

It reads only the app's own directory, so it works outside this monorepo. The repository's
`verify:federation` becomes a loop over `cyweb-app verify`.

### 4.8 Repository integration

- `packages/*` joins the npm workspaces. `scripts/manifest.mjs` currently assumes every
  workspace is an app; its validation is scoped to **app workspaces only**.
- Build order is fixed: **SDK → the five apps → scaffolder fixture tests.**
- `apps.manifest.json`'s `federationName`, `port`, and `configuredShared` are **generated**
  from each app's metadata and `CYWEB_SHARED`, removing the hand-written duplication that
  `manifest.mjs` exists to cross-check.

### 4.9 The App Store zip

`zipForAppStore` currently runs on **every** build, which is why stale `*.zip` files sit in
the working tree. It moves into the SDK as **opt-in, defaulting to false**.

The existing implementation is not suitable as a signed artifact: entry order, timestamps, and
file modes are unpinned, so two builds of the same source differ. A deterministic
`cyweb-app package` — canonical SemVer, output containment, atomic write, fixed order and
metadata, SHA-256 digest — is **deferred to the publishing project**, where the integrity and
signature requirements from §3 live. Moving the zip off the default build is the part that
belongs here.

## 5. Implementation phases

### Dependencies — none blocking

This project can start immediately and finish without waiting on anything.

| Dependency | Standing |
|---|---|
| The host | **None.** No host change at any phase. GA is gated on host security work (§3); Preview is not |
| `@cytoscape-web/api-types` | Uses the **already-published** `1.0.0-beta.3`. Does not need B-1 or the 1.0 GA |
| `@cytoscape-web/app-test` (C-1) | **Not needed.** The scaffolder emits a smoke test that asserts the `AppConfig` shape, which requires no mock host |
| `AGENTS.md` content (E-1) | **Not needed.** The scaffolder emits a placeholder; the LLM project fills it |
| P-1 (singleton assertion) | **Soft.** Phase 2 repoints P-1 at `CYWEB_SHARED`. If P-1 has not landed, generate the manifest fields anyway and repoint later — nothing breaks |
| A-3a (docs drop `apps.local.json`) | **Soft.** Phase 3 updates the pages this project touches. The wider documentation pass is separate and may come before or after |

The roadmap schedules P-1 and A-3a in stage A0, ahead of this project, so in the intended
order both are already done. Neither is a gate.

Each phase below leaves the repository releasable.

**Phase 1 — Extract the SDK.** `defineCyWebApp`, the metadata parser, the `cyweb` package.json
block, the virtual module, the protected-field merge, the composable exports, the precompiled
runtime plugin, and the migrated test suite. Convert `project-template` only. Success is a
**byte-comparable federation shape**: the built `mf-manifest.json` audit fields match the
pre-migration build except for the runtime-plugin path, and `verify:federation` passes unchanged.

> The `cyweb` block belongs here, not in Phase 3: `defineCyWebApp` takes no `id` or `port`
> argument (§4.2), so identity must come from the block from the first converted app onward.

**Phase 2 — Migrate the remaining four apps.** `hello-world` (second expose),
`network-workflows`, `network-statistics` (`react: false`), `claude-bridge`. Delete every
`src/mfRuntimePlugin.ts`, `src/cywebHostSentinel.ts`, and `test/mfRuntimePlugin.test.ts`, and
replace each with a meaningful smoke test (§7). Repoint P-1's assertion and `manifest.mjs`'s
peer-version check at `CYWEB_SHARED`; generate the manifest fields.

**Phase 3 — Identity in app code, and dev registration.** App configs read
`virtual:cyweb-app-meta` instead of `../package.json`; the dev middleware and banner. Update
`project-template/README.md` and the scaffold section of `guides/getting-started.md`; remove
the "edit `apps.local.json`" instruction from the paths this project touches.

**Phase 4 — `cyweb-app verify`.** Extract from `verify-federation-build.mjs`; make the repo
script a loop over it.

**Phase 5 — The scaffolder.** Five templates, built **from** the migrated apps rather than as a
separate copy, so a template cannot drift from a working example.

**Phase 6 — Preview release.** Publish both packages under `next` with npm provenance from a
protected release environment. Pin the examples to the published versions rather than
workspace links, and run the acceptance criteria on a clean machine.

## 6. Risks

| Risk | Mitigation |
|---|---|
| **Runtime-plugin resolution from `node_modules`** — the highest technical risk. The path is interpolated into a generated `import "<path>"`; package layout, symlinked workspaces and pnpm all affect whether it resolves | Ship precompiled `.js`; resolve with `createRequire`; smoke-test a fixture app built from a **packed tarball** under both npm and pnpm, asserting `configuredRuntimePlugins` points inside the package and the remote initializes against a real host page |
| **Lowering the barrier while the trust model is unchanged** | Staged release (§3); trust boundary stated in the README, the generated `AGENTS.md`, and the install path; GA and the App Store gated on host isolation work |
| **The SDK pins the shared singleton set**, so a host React/MUI bump requires an SDK release | The intended centralization. An SDK minor accompanies any host share-scope change, and P-1 turns CI red until it ships |
| **Losing the teaching value** of the annotated config | Comments move with the code; template keeps a summary block; `guides/architecture-overview.md` keeps the four-item table |
| **Two more packages for a one-maintainer project** | One repo, one release script, versioned in lockstep |
| **A template silently drifts from the examples** | Phase 5 generates templates from the migrated apps; CI scaffolds, builds, and verifies the result |

## 7. Acceptance criteria

| # | Criterion |
|---|---|
| 1 | **Packed-tarball install**: both packages are packed, installed into a temporary directory, and all five templates are scaffolded, built, and verified — under **npm and pnpm** |
| 2 | On a clean machine: scaffold → `npm run dev` → open the printed URL against a stock host clone → complete the install flow as implemented (open URL → confirm → install → activate → open the right panel) → **the panel appears, with no file edited by hand anywhere**. The exact dialog steps are confirmed against `PendingAppInstall` handling when the test is written |
| 3 | Changing `cyweb.id`, `cyweb.port`, or `version` in `package.json` alone propagates to the dev manifest, the dev banner, and the `AppConfig` — verified by asserting all three against the same source |
| 4 | All five apps build through the SDK and pass `cyweb-app verify`, `npm run typecheck`, and `npm run check:imports` |
| 5 | **Path-based**, not grep-count: `src/mfRuntimePlugin.ts` and `src/cywebHostSentinel.ts` exist in no app, and no app source imports either. *(Revision 1's grep-count and line-count criteria are withdrawn as vanity metrics.)* |
| 6 | Every app retains a **meaningful smoke test** after migration — a vacuous `vitest run` must neither fail for want of tests nor pass while testing nothing |
| 7 | Editing a version in `CYWEB_SHARED` without updating the generated manifest turns CI red (P-1) |
| 8 | Every interactive prompt has a flag equivalent; `--yes` with flags never prompts |
| 9 | Rejected **before any file is written**: non-empty or symlinked target, unknown flag, reserved or malformed id, occupied port, invalid SemVer, `./AppConfig` expose collision |
| 10 | A `@mui/material/Box` subpath import still fails the build via `noSharedPayload` |
| 11 | `vite` config touching a protected path fails with a named error identifying the path |
| 12 | Built artifacts contain no absolute workspace path, no full `package.json`, and no unexpected shared payload |
| 13 | **GA gate**: every published version carries the Preview deprecation notice, and `latest` is never MOVED forward, until the §3 host-side prerequisites — threat model, penetration test, privilege-control E2E — are complete. (`latest` existing at all is unavoidable; see the correction in §3) |

## 8. Review disposition

An external review of revision 1 raised 18 points. All were accepted except one, and two
identified outright defects.

**Defects found** — §4.3 (bundling the whole `package.json` into the browser) and §4.5
(`public/cyweb-app.json` breaking the build via the publish allowlist). Both fixed as designed
above.

**Withdrawn on review** — the app-side `apiVersion` major/minor check (§4.4). The roadmap had
positioned it as a host-independent substitute for C-3; it is not a substitute, because the
host value is a constant with no bump policy. The roadmap is corrected accordingly.

**Rejected: removing the `vite` escape hatch.** The review proposed dropping arbitrary
merging entirely in favor of protected fields alone. Protected fields are adopted; the merge
is kept, with conflicts made fatal.

Rationale: with no escape hatch, every unanticipated need — a plugin, an alias, a `define`, a
test setting — becomes a feature request against a single-maintainer SDK. That failure mode is
worse than the one being avoided, and it is the failure mode that made the copy-paste template
attractive in the first place. Erroring on protected-path conflicts gets the invariant without
the rigidity: the four load-bearing items stay unreachable, and everything else stays open.

**Scope held.** The review's `cyweb-app package` (deterministic, signable artifacts) is real
work but belongs with publishing and integrity, not here. Only the part that touches this
project — taking the zip off the default build — is included (§4.9). `cyweb-app verify` is
adopted in full, because a scaffolded app that cannot be verified outside the monorepo defeats
goal 5.

## 9. Decisions — closed in Phase 0

Nothing here is open. All three were settled before implementation began; the baseline they
were settled against is [`phase0-baseline.md`](phase0-baseline.md).

**D-1. The scaffolder is `create-cytoscape-app`** — unscoped, so the invocation is
`npm create cytoscape-app my-app`. All four candidate names (`create-cytoscape-app`,
`@cytoscape-web/create-app`, `@cytoscape-web/app-runtime`, `@cytoscape-web/app-test`) were
confirmed unpublished. The unscoped name costs a global-namespace claim and buys a call that
is short enough to hand to an agent verbatim.

**D-2. No import allowlist.** See §3. A build-time check cannot see a dynamic `import()`, and
the party it would restrain is the one party guaranteed not to use the SDK. Dropped rather
than shipped as a partial guardrail inside a trust-boundary section.

**D-3. `virtual:cyweb-app-meta` carries four fields** — `id`, `displayName`, `version`,
`description`. These are exactly what `CyApp` consumes. `author`, `license`, and `repository`
stay out: no current app uses them, and adding an export later is non-breaking, so the
reversible choice is the smaller one.

### Accepted consequence — `ScopedApi` has no types in generated apps

`@cytoscape-web/api-types` publishes `1.0.0-beta.3` as its highest version; **`beta.4` exists
only in the host source and is not on npm.** Generated projects therefore pin `beta.3`, whose
`mf-declarations.d.ts` does not declare `cyweb/ScopedApi` — so `useScopedApi` is untypeable in
a scaffolded app until the host publishes.

Accepted rather than worked around. Waiting on a host publish would make this project depend
on the host, which §2 rules out; hand-writing a local declaration would reintroduce exactly the
drifting `.d.ts` the api-types package exists to remove. Roadmap B-1 closes it.
