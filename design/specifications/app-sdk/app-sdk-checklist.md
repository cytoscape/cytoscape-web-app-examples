# Implementation Checklist — App SDK & Scaffolding

> Track progress across Phase 0 and the six design phases. Mark `[x]` when
> complete. Run the per-phase verification before starting the next phase.
>
> **Status: Phases 0 and 1 complete. Phase 2 is next.**
> `@cytoscape-web/app-runtime@0.1.0` exists and `project-template` builds
> through it, with its federation output matching
> [`phase0-baseline.md`](phase0-baseline.md) in every audit field except the
> runtime-plugin path. The other four apps still carry their own copies.
>
> **Phases are strictly ordered.** Phase 1 converts exactly one app; the other
> four keep their hand-written configs until Phase 2. Nothing outside the app
> currently being converted may break.
>
> **Release gate.** Phase 6 publishes under the `next` dist-tag only. The
> `latest` tag stays unpublished until the host-side security work
> (roadmap Theme G, G-1…G-6) lands — see design §3. This is not a formality:
> an installed app has the host's full privileges, including credential access
> through `cyweb/CredentialStore`.

_Design: [app-sdk-design.md](app-sdk-design.md) — full rationale and the reasoning behind every decision below. Section references (§) point into it._

_Umbrella: [developer-onboarding-roadmap.md](../developer-onboarding/developer-onboarding-roadmap.md) — where this project sits (stage A1) and what it deliberately excludes._

**Format note:** this follows the layout of
[`../vite-migration/vite-migration-checklist.md`](../vite-migration/vite-migration-checklist.md)
— all phases in one file, because Phase 2 is the same procedure applied to four
apps and the shared block is defined once in **Phase 1**.

**Phase-boundary note:** the design's §5 lists the `cyweb` package.json block
under Phase 3. **It is moved to Phase 1 here**, because `defineCyWebApp` takes
no `id` or `port` argument (§4.2) — identity has to come from the block from the
first converted app onward. Phase 3 keeps what actually belongs to it: adopting
the virtual module in app code, the dev middleware, and the docs.

**Repository note:** unless a step says otherwise, paths are relative to
`cytoscape-web-app-examples/`. Steps in the **host** repo would be prefixed
`cytoscape-web/` — there are none; this project touches no host file.

---

## Phase 0: Baseline and open questions ✅ **COMPLETE**

_Design: §9, and the exit criterion of §5 Phase 1_

No implementation. This phase exists for two reasons: Phase 1's success test
compares against a build that no longer exists once work starts, and §9's open
questions change the shape of what gets built.

> **Three decisions taken, all recorded in design §9 as D-1…D-3:**
>
> - **`create-cytoscape-app`**, unscoped. All four candidate names were confirmed
>   unpublished, so the constraint §9 Q1 hung on ("it needs the npm name to be
>   available") is satisfied.
> - **No import allowlist.** Dropped, not deferred — design §3 now says so. It
>   restrains only the party guaranteed to use the SDK, which is not the threat,
>   and a partial guardrail inside a trust-boundary section implies containment
>   that does not exist.
> - **Four metadata fields** — `id`, `displayName`, `version`, `description`.
>   Adding an export later is non-breaking, so the smaller set is the reversible one.
>
> **One consequence accepted:** `@cytoscape-web/api-types` publishes `1.0.0-beta.3`
> as its highest version — **`beta.4` is not on npm**, it exists only in the host
> source. Generated apps pin `beta.3`, so **`cyweb/ScopedApi` is untypeable in a
> scaffolded app** until the host publishes. Waiting would make this project depend
> on the host; a hand-written local declaration would reintroduce the drifting
> `.d.ts` that api-types exists to remove. Roadmap B-1 closes it.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `design/specifications/app-sdk/app-sdk-design.md` | §9 open questions; §4.2 protected fields |
| `project-template/vite.config.ts` | The 322 lines being generalized; every comment is a requirement |
| `project-template/src/mfRuntimePlugin.ts` | The resolver; note the "BOTH arrays" hazard |
| `package.json` (root) | `workspaces`, script names the new packages must not collide with |
| `apps.manifest.json` | `configuredShared` per app — becomes generated in Phase 2 |
| `scripts/manifest.mjs` | Validates every workspace as an app; must be scoped in Phase 1 |
| `scripts/verify-federation-build.mjs` | Becomes `cyweb-app verify` in Phase 4 |

### Deliverables — decisions (write them down)

- [x] **Scaffolder package name** — **`create-cytoscape-app`**, unscoped (§9 D-1)
  - [x] Availability confirmed — all four unpublished: `create-cytoscape-app`,
        `@cytoscape-web/create-app`, `@cytoscape-web/app-runtime`,
        `@cytoscape-web/app-test`
- [x] **SDK package name** — `@cytoscape-web/app-runtime`, available
- [x] **Import allowlist — OUT** (§9 D-2). Design §3 edited: it no longer
      promises one, and records why it was dropped rather than deferred
- [x] **`virtual:cyweb-app-meta` field list frozen** (§9 D-3) — `id`,
      `displayName`, `version`, `description`. `author` / `license` /
      `repository` stay out; adding an export later is non-breaking
- [x] **Preview version line and tag** — `0.x` under `next`, both packages in lockstep
- [x] **`@cytoscape-web/api-types` pin for generated projects** —
      **`1.0.0-beta.3` exactly**. It is the highest version on npm; `beta.4` is
      host-source-only. See the consequence note above

### Deliverables — baseline (Phase 1 compares against this)

- [x] Build all five apps at current HEAD and capture the audit fields —
      [`phase0-baseline.md`](phase0-baseline.md), commit `2e91020`
  - [x] Raw `mf-manifest.json` files kept out of git: they embed the absolute
        build-machine path including the username, and this repository is public.
        The committed record carries the audit fields with the path normalized to
        `<REPO>/`, which is exactly what Phase 1 compares
- [x] Record the per-app `verify:federation` check counts — **measured, and they
      match the predicted values exactly**: `hello-world` 27,
      `network-statistics` **16**, `network-workflows` 26, `project-template` 26,
      `claude-bridge` 26
- [x] Record per-app bundle sizes (raw, gzip, file count) — measured over the
      whole `dist/`, not the narrower publish set. Total 727,835 raw / 237,876
      gzip / 111 files

### Verification (Phase 0)

- [x] Baseline archived and reachable by sha — `2e91020`, committed in the repo
      rather than a scratch directory, so Phase 1 can still reach it in a later session
- [x] No open §9 question remains — all three closed as D-1…D-3
- [x] All npm names are available; no fallback needed
- [x] `npm run build` and `npm run verify:federation` both green at the baseline
      commit, so the comparison starts from a known-good state

---

## Phase 1: Extract the SDK, convert `project-template` only ✅ **COMPLETE**

_Design: §4.1, §4.2, §4.3, §4.4, §4.8, §4.9_

Deliberately one app. Everything unknown becomes verified fact here before the
pattern is applied four more times.

> **Four decisions taken during implementation, and one measurement:**
>
> - **The runtime-plugin path is derived, not resolved.** The design said
>   `createRequire(import.meta.url).resolve(...)`; the implementation uses
>   `new URL('../runtime/mfRuntimePlugin.js', import.meta.url)`. It cannot be
>   defeated by a symlinked workspace or a store layout, and it needs no entry in
>   `exports`, which keeps the public surface at the two subpaths §4.1 promises.
>   **Verified both ways**: under npm the path lands in
>   `node_modules/@cytoscape-web/app-runtime/…`, under pnpm in the real
>   `node_modules/.pnpm/…` path. Name resolution would have had to be correct
>   about `exports` self-reference in both.
> - **`noSharedPayload` never needed the app root.** §4.4's table lists it beside
>   `zipForAppStore` as reading `import.meta.url`; only `zipForAppStore` did. The
>   module ids `noSharedPayload` inspects are already absolute, so it moved
>   unchanged and `configResolved` was added to the zip plugin alone.
> - **`project-template`'s smoke test landed here, not in Phase 2.** Deleting its
>   only test file leaves `vitest run` with nothing to run, which fails the app's
>   `test` script. The replacement asserts what is specific to this app — its
>   metadata and the shape of what `./AppConfig` exports — rather than the runtime
>   plugin, which is now tested once in the package.
> - **The SDK carries its own tests for the new logic.** `readAppMeta` and the
>   protected-field check are new code with new failure modes; 42 tests across
>   three files, up from the 12 the single ported suite contributes.
>
> **Measured, and it confirms why the virtual module exists.** The built app
> chunk contains the WHOLE package.json — `devDependencies`, `scripts`, the `"//"`
> prose blocks, everything — because `TemplateApp.tsx` still does
> `import packageJson from '../package.json'`. Grepping the output finds
> `devDependencies`, `typescript` and `vitest` in a browser bundle. This is
> pre-existing (the Phase 0 baseline has it too) and Phase 3 is where app code
> switches to `virtual:cyweb-app-meta`. The tarball fixture, which already uses
> the virtual module, shows **no leak** — so the fix is proven, just not yet
> adopted. Note that adding the `cyweb` block grew the leak by ~0.8 kB in the
> meantime.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `project-template/vite.config.ts` | Lines 31–33 (runtime-plugin path), 63–89 (`CONFIGURED_SHARED`), 115–136 (`noSharedPayload`), 186–235 (`zipForAppStore`), 237–242 (why `base` is unset) |
| `project-template/src/mfRuntimePlugin.ts` | Lines 16–35 (why the MF types are not imported), 75–97 (both remotes arrays) |
| `project-template/package.json` | `peerDependencies` and the two `"//"` prose blocks explaining them |
| `project-template/tsconfig*.json` | Three configs; `skipLibCheck: false` on app sources is deliberate |

### Deliverables — package skeleton (§4.1, §4.8)

- [x] Create `packages/app-runtime/` — `@cytoscape-web/app-runtime`, `0.1.0`,
      `type: module`, `engines.node >= 24`
  - [x] `exports` limited to **`./vite` and `./meta`**. The runtime plugin is
        resolved internally, not exported
  - [x] `bin: { "cyweb-app": … }` declared now, implemented in Phase 4
- [x] Add `packages/*` to the root `workspaces`
- [x] **Scope `scripts/manifest.mjs` validation to app workspaces only** — it
      currently asserts the `workspaceDir` set equals the `workspaces` set in
      both directions, so adding a package breaks it immediately
- [x] Fix build order: **SDK → the five apps → (Phase 5) scaffolder fixtures**

### Deliverables — app metadata (§4.3)

- [x] `cyweb` block schema with **runtime** validation, failing the build with
      the offending field named:
  - [x] `id` matches `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/` — the same rule the host's
        `parseManifest.ts` applies, so a locally valid id cannot be rejected on install
  - [x] `id` of `cyweb` is reserved and refused
  - [x] `port` present and free-form valid; `displayName` present
  - [x] `version` is canonical SemVer
- [x] Read `<root>/package.json` with `node:fs` — **not** an import.
      `tsconfig.node.json` does not enable `resolveJsonModule`
- [x] `./meta` export — the schema types plus the `virtual:cyweb-app-meta`
      module declaration
- [x] The virtual-module plugin, exposing **only the allowlisted fields**
  - [x] Never the raw `package.json`: importing it bundles `devDependencies`,
        `scripts`, and every private field into the browser bundle
- [x] Add the `cyweb` block to `project-template/package.json`

### Deliverables — the config builder (§4.2)

- [x] `defineCyWebApp(import.meta.url, options?)` — the first argument is
      **required**. `process.cwd()` is wrong whenever Vite runs from a monorepo
      root or with `--config`
- [x] Options, and only these: `react`, `exposes`, `devHostPageUrl`,
      `devHostRemoteEntryUrl`, `appStoreZip`, `vite`
  - [x] **No `id` override** — identity has one source
  - [x] **No wholesale `shared` replacement** — it would defeat P-1
- [x] `exposes` merged with the mandatory `./AppConfig`; a key collision is fatal
- [x] Protected fields enforced, with a **named error naming the path** when user
      `vite` config touches one — it must neither silently win nor silently lose:
  - [x] the runtime-plugin registration
  - [x] `remotes.cyweb` — `type`, `name`, `entryGlobalName`, `shareScope`, and the
        production entry sentinel
  - [x] the shared singleton set and its `singleton: true` / `import: false` flags
  - [x] the `./AppConfig` expose
  - [x] `server.port`, `server.strictPort`, `server.origin`, the CORS header
  - [x] `build.target`, `build.outDir`, and the deliberate **absence** of `base`
- [x] Composable exports — `cywebFederation`, `noSharedPayload`, `CYWEB_SHARED` —
      documented as **advanced and unsupported**, outside the high-level API's guarantees
- [x] `CYWEB_SHARED` is the single source of truth for the five singletons

### Deliverables — the runtime plugin (§4.4)

- [x] Move `mfRuntimePlugin` and `cywebHostSentinel` into the package
- [x] **Ship precompiled `.js`, not `.ts`** — `runtimePlugins` entries are
      interpolated into an `import "<path>"` inside a generated virtual module,
      and a `.ts` file in `node_modules` is not reliably transformed
- [x] Resolve the path with `createRequire(import.meta.url).resolve(...)`, still
      `normalizePath`-ed (a Windows backslash path is an invalid specifier)
- [x] Preserve the **both-arrays** write: `userOptions.remotes` **and**
      `options.remotes`. Writing one works in exactly one of the two init paths,
      silently
- [x] `apiVersion` is **read for the dev banner only** — no comparison, no
      enforcement (the P-2 retraction)
- [x] Move the five copies of `test/mfRuntimePlugin.test.ts` into one suite here,
      still against a **real `ModuleFederation` instance**

### Deliverables — build plugins (§4.4, §4.9)

- [x] `noSharedPayload` takes the app root from `configResolved`
      (`config.root`, `config.build.outDir`), **not** from `import.meta.url`
  - [x] Keep `apply: 'build'`, `enforce: 'post'`, and the **namespace prefixes**
        (`/node_modules/@mui/`, not a package list — `@mui/utils` is the case)
- [x] `zipForAppStore` likewise, and **opt-in with `appStoreZip` defaulting to
      `false`**. It currently runs on every build, which is why stale `*.zip`
      files sit in the working tree
- [x] The explanatory comments move **with** the code they explain

### Deliverables — convert `project-template`

- [x] `vite.config.ts` → three lines
- [x] Delete `src/mfRuntimePlugin.ts`, `src/cywebHostSentinel.ts`,
      `test/mfRuntimePlugin.test.ts`
- [x] Keep a short block in the template stating what `defineCyWebApp` sets up
      and why, linking to the SDK source for the full reasoning
- [x] Confirm `guides/architecture-overview.md` still carries the four-item table

### Verification (Phase 1)

- [x] **Byte-comparable federation shape** — the built `mf-manifest.json` audit
      fields (`configuredShared`, `configuredRemote`, `configuredRuntimePlugins`)
      match the Phase 0 baseline **except the runtime-plugin path**. This is the
      phase's whole point: the config moved, the output did not
- [x] `npm run verify:federation` passes with the **same check count** as baseline (26)
- [x] `npm run typecheck` passes on all three configs
- [x] `npm run check:imports` passes
- [x] The SDK's runtime-plugin suite passes — all cases the five copies covered
- [x] The production build carries the sentinel, never `localhost:5500`
- [x] `noSharedPayload` still fires on a **rendered** `@mui/material/Box`. An
      unused subpath import does not bundle MUI; the fixture has to render it
- [x] The app loads in a running host from `apps.local.json` — verified through
      the real host loader, not by eye: a dynamic `import()` inside a live
      `localhost:5500` page, `init()` against the host's own share scope (11
      entries), then `get('./AppConfig')`, which returned `id: 'template'` and
      both declared resources. A resolver that never ran could not have loaded at
      all — the production build carries a sentinel, not a URL
- [x] **Packed-tarball resolution smoke test, npm and pnpm.** `npm pack` the SDK,
      install into a temp fixture app, build, and assert
      `configuredRuntimePlugins` points **inside the package**. This is the
      highest technical risk in the project (§6) and cannot be deferred

---

## Phase 2: Migrate the remaining four apps

_Design: §5 Phase 2, §4.2 (`react`, `exposes`), §4.4 (`CYWEB_SHARED`)_

> **The Phase 1 block transfers unchanged.** Only the options differ. If an app
> needs a protected field, stop — that is a design finding, not a special case.

### Deliverables — per app

- [ ] `hello-world` — second expose `./NetworkSummaryMenuItem` via `exposes`
- [ ] `network-workflows` — no options beyond the default
- [ ] `network-statistics` — **`react: false`**: no React plugin, no shared block,
      `configuredShared` stays `{}`
  - [ ] Keep `@types/react` in `devDependencies` — the published api-types
        declarations reference React types. Do not "clean this up"
- [ ] `claude-bridge` — no options beyond the default
- [ ] Add the `cyweb` block to each app's `package.json`

### Deliverables — remove the duplication

- [ ] Delete every remaining `src/mfRuntimePlugin.ts` and `src/cywebHostSentinel.ts`
- [ ] Delete every remaining `test/mfRuntimePlugin.test.ts`
- [ ] **Replace each with a meaningful smoke test.** Deleting all five leaves
      `vitest run` with nothing to run — which either fails the app's `test`
      script or, if someone reaches for `--passWithNoTests`, passes while testing
      nothing. Both outcomes are worse than the duplication

### Deliverables — generated manifest (§4.8)

- [ ] `apps.manifest.json`'s `federationName`, `port`, and `configuredShared`
      generated from each app's metadata and `CYWEB_SHARED`
- [ ] Repoint `scripts/manifest.mjs`'s peer-version cross-check at `CYWEB_SHARED`
- [ ] Repoint P-1's live-host assertion at `CYWEB_SHARED`
  - [ ] **Soft dependency.** If P-1 has not landed, generate the fields anyway
        and repoint later — nothing breaks

### Verification (Phase 2)

- [ ] Every Phase 1 verification step, per app
- [ ] Check counts match the Phase 0 baseline exactly: **27 / 26 / 26 / 26 / 16**
- [ ] **Path-based, not grep-count:** `src/mfRuntimePlugin.ts` and
      `src/cywebHostSentinel.ts` exist in no app, and no app source imports either
- [ ] `vitest run` reports a **non-zero test count in every app**
- [ ] `npm run verify:federation` and `npm run check:imports` print no `skipped` lines
- [ ] CI green on all jobs

---

## Phase 3: Identity in app code, and dev registration

_Design: §4.3, §4.5_

### Deliverables — identity through the virtual module

- [ ] Every app's `CyApp` reads `virtual:cyweb-app-meta`, not `../package.json`
- [ ] No app imports `../package.json` any more

### Deliverables — dev install manifest (§4.5)

- [ ] Dev middleware serving `/cyweb-app.json`, generated per request from the
      parsed metadata
  - [ ] **Not** a tracked `public/cyweb-app.json`. `public/` is copied into
        `dist/`, where the App Store publish allowlist matches no rule for it and
        **deliberately fails the build**. It would also go stale on the first
        port or version change
- [ ] The banner prints **after the server actually listens**, so the port shown
      is the port bound
- [ ] All URLs composed with the `URL` API, never string concatenation
- [ ] `devHostPageUrl` and `devHostRemoteEntryUrl` are separate options

### Deliverables — documentation (this project's slice only)

- [ ] `project-template/README.md` — the new three-line config and the printed
      install URL
- [ ] `guides/getting-started.md` — the scaffold section; remove "edit
      `apps.local.json`" from the paths this project touches
  - [ ] The wider documentation pass is A-3a and is **not** in scope here

### Verification (Phase 3)

- [ ] Changing `cyweb.id`, `cyweb.port`, or `version` in `package.json` **alone**
      propagates to the dev manifest, the dev banner, and the `AppConfig` —
      asserted against the same source, not read three times by hand
- [ ] `npm run build` succeeds for all five — nothing unclassified lands in `dist/`
- [ ] The printed URL completes the install flow against a **stock host clone**:
      open → confirm → install → activate → open the right panel → panel visible
  - [ ] The exact dialog steps are confirmed against `PendingAppInstall` handling
        when the test is written, not assumed from this checklist

---

## Phase 4: `cyweb-app verify`

_Design: §4.7_

The repository's strongest asset is currently unreachable by the people the
project exists for: `verify:federation` reads `apps.manifest.json` and only
works inside this monorepo.

### Deliverables

- [ ] Extract `scripts/verify-federation-build.mjs` into the SDK as
      `cyweb-app verify`, reading **only the app's own directory**
- [ ] Checks, against a built `dist/`:
  - [ ] Federation shape — ESM entry, `type: 'module'`, runtime plugin
        registered, production sentinel shipped rather than a localhost URL
  - [ ] Metadata consistency — `mf-manifest.json` matches the parsed `package.json`
  - [ ] Shared payload — no MUI, Emotion, React or ReactDOM implementation in the
        remote's chunks
  - [ ] **No absolute workspace paths** and no full `package.json` in the output
- [ ] `npm run verify:federation` becomes a loop over `cyweb-app verify`

### Verification (Phase 4)

- [ ] Check counts unchanged from Phase 2 after the extraction
- [ ] Runs green in a **clean copy outside the monorepo** (no `apps.manifest.json`
      reachable)
- [ ] **Goes red on a deliberately broken build** — drop the runtime plugin,
      swap the sentinel for a localhost URL, render a MUI subpath import. A gate
      never seen to fail is not known to work

---

## Phase 5: The scaffolder

_Design: §4.6_

### Deliverables — the CLI

- [ ] Create `packages/create-cytoscape-app/` (name per Phase 0)
- [ ] Flags, with directory name / package name / display name / federation id
      kept as **four separate things**: positional target, `--package-name`,
      `--id`, `--display-name`, `--port`, `--template`, `--yes`, `--pm`,
      `--no-install`
- [ ] **Every prompt has a flag equivalent.** A prompt without one is a bug: it
      makes the agent path unusable
- [ ] Port picker takes the first free port from 6000, skipping 5500 and the
      examples' 2222 / 3333 / 5555 / 6100 / 7000
- [ ] **All validation before any filesystem side effect** — non-empty or
      symlinked target, unknown flag, reserved or malformed id, occupied port,
      invalid SemVer, `./AppConfig` expose collision
- [ ] Generated projects **pin `@cytoscape-web/api-types` to the exact version
      chosen in Phase 0**, not a floating range. `^1.0.0-beta.3` floats across
      betas — which is how the examples reached `beta.3` while the host source
      was at `beta.4` with `ScopedApi` missing

### Deliverables — the templates

- [ ] Five templates — `panel`, `menu`, `context-menu`, `non-react`, `full` —
      generated **from the migrated apps**, not maintained as a separate copy
- [ ] `AGENTS.md` **placeholder** only; E-1c owns the content
- [ ] `test/smoke.test.ts` asserting the `AppConfig` shape — deliberately **no**
      dependency on `@cytoscape-web/app-test`, which does not exist yet
- [ ] **No `TODO:` marker survives** — everything they currently mark is
      substituted at generation time

### Verification (Phase 5)

- [ ] `--yes` plus flags never prompts
- [ ] Each rejection case aborts with **nothing written**
- [ ] **Packed tarball → temp directory → scaffold all five templates → build →
      `cyweb-app verify`, under npm AND pnpm**
- [ ] A CI job scaffolds, builds and verifies, so a template cannot drift from a
      working example unnoticed

---

## Phase 6: Developer Preview release

_Design: §3, §4.1_

### Deliverables

- [ ] Publish both packages under the **`next`** dist-tag, `0.x`
- [ ] npm provenance, from a **protected release environment**
- [ ] The trust boundary stated plainly in the SDK README and the generated
      `AGENTS.md`: *an app you install has the same privileges as Cytoscape Web
      itself; install only apps you trust*
- [ ] State what Preview does **not** promise — safety of untrusted app code,
      accurate runtime API version enforcement, legible load-failure reporting
- [ ] Pin the examples to the published versions rather than workspace links
- [ ] **Do not publish `latest`**

### Verification (Phase 6)

- [ ] `npm view <pkg> dist-tags` shows `next` and **no `latest`**
- [ ] The full acceptance criterion runs on a **clean machine**:
      `npm create cytoscape-app my-app -- --yes --id myApp --port 6000` →
      `npm run dev` → open the printed URL → panel appears, **with no file
      edited by hand anywhere**

---

## Final Verification

### Build & test

- [ ] `npm run typecheck --workspaces` passes
- [ ] `npm run test --workspaces --if-present` passes, with a non-zero test count
      in every app
- [ ] `npm run build --workspaces` succeeds
- [ ] `cyweb-app verify` passes for all five apps at the Phase 0 baseline counts
- [ ] `npm run check:imports` passes for all five
- [ ] `npm run deploy` produces exactly the approved publish set

### Contract

- [ ] Every `remoteEntry.js` is an ES module; every production `dist/` carries the
      sentinel, never `localhost:5500`
- [ ] No React / ReactDOM / MUI / Emotion implementation in any remote's bundle
- [ ] No built artifact contains an absolute workspace path, a full
      `package.json`, or an unexpected shared payload
- [ ] `src/mfRuntimePlugin.ts` and `src/cywebHostSentinel.ts` exist in no app
- [ ] Changing `cyweb.id` alone renames the app everywhere — federation name,
      `CyApp.id`, and the generated dev manifest

### Deferred, deliberately

- [ ] **GA (`latest`)** — gated on roadmap Theme G: iframe/worker isolation, a
      capability API, blocking raw store exposes (`CredentialStore` first),
      artifact integrity/signature, the catalog-path allow-list bypass, and the
      threat model / penetration test / privilege-control E2E that opens the gate
- [ ] **`cyweb-app package`** — deterministic, signable App Store artifacts
      (canonical SemVer, output containment, atomic write, fixed entry order,
      timestamps and modes, SHA-256 digest). Belongs with the publishing project;
      only taking the zip off the default build is in scope here (§4.9)
- [ ] **`@cytoscape-web/app-test`** — the mock host. The scaffolder's smoke test
      is deliberately independent of it
- [ ] **`AGENTS.md` content** — the scaffolder emits a placeholder; E-1c fills it
- [x] **Import allowlist** — decided **out** in Phase 0 (§9 D-2). Not deferred:
      dropped. The deprecation signal it was reaching for belongs in the type
      declarations (roadmap B-1)

### Known non-issues

- [ ] Plugin 1.16.8 prints `Shared dependency "@emotion/styled" has import: false
      but is not installed locally` on correct builds. Do **not** treat plugin
      warnings as CI errors on account of it
- [ ] `network-statistics` reports **16** checks, not 26. It shares nothing, so
      the per-package share assertions have nothing to assert
