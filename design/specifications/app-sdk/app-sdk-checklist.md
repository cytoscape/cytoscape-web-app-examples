# Implementation Checklist — App SDK & Scaffolding

> Track progress across Phase 0 and the six design phases. Mark `[x]` when
> complete. Run the per-phase verification before starting the next phase.
>
> **Status: NOT STARTED.** No package exists yet. Phase 0 must close the §9
> open questions and capture the baseline before any code is written.
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

## Phase 0: Baseline and open questions

_Design: §9, and the exit criterion of §5 Phase 1_

No implementation. This phase exists for two reasons: Phase 1's success test
compares against a build that no longer exists once work starts, and §9's open
questions change the shape of what gets built.

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

- [ ] **Scaffolder package name** — `create-cytoscape-app` (unscoped, enables
      `npm create cytoscape-app`) or `@cytoscape-web/create-app`. §9 Q1
  - [ ] Availability confirmed: `npm view create-cytoscape-app`
- [ ] **SDK package name** availability confirmed: `npm view @cytoscape-web/app-runtime`
- [ ] **Import allowlist — in or out.** §9 Q2. A build-time check cannot see a
      dynamic `import()`, so a partial guardrail may buy less than the false
      confidence it creates. **If out, edit design §3** so Preview stops
      promising it
- [ ] **`virtual:cyweb-app-meta` field list frozen.** §9 Q3 — whether `author`,
      `license`, `repository` join `id`, `displayName`, `version`, `description`
- [ ] **Preview version line and tag** — `0.x` under `next`, both packages moving
      in lockstep
- [ ] **The exact `@cytoscape-web/api-types` version** generated projects pin
      (currently `1.0.0-beta.3` is published; the host source is at `beta.4`)

### Deliverables — baseline (Phase 1 compares against this)

- [ ] Build all five apps at current HEAD; archive each `dist/mf-manifest.json`
      outside the working tree. **Record the commit sha** — the comparison is
      meaningless without it
- [ ] Record the per-app `verify:federation` check counts — expected to be
      unchanged after migration: `hello-world` 27, `network-workflows` 26,
      `project-template` 26, `claude-bridge` 26, `network-statistics` **16**
      (it shares nothing, so the per-package assertions have nothing to assert)
- [ ] Record per-app bundle sizes (raw, gzip, file count) from the vite-migration
      Phase 8 table, or re-measure

### Verification (Phase 0)

- [ ] Baseline archived and reachable by sha
- [ ] No open §9 question remains
- [ ] Both npm names are available, or the fallbacks are chosen

---

## Phase 1: Extract the SDK, convert `project-template` only

_Design: §4.1, §4.2, §4.3, §4.4, §4.8, §4.9_

Deliberately one app. Everything unknown becomes verified fact here before the
pattern is applied four more times.

### Pre-read files

| File | Purpose |
| ---- | ------- |
| `project-template/vite.config.ts` | Lines 31–33 (runtime-plugin path), 63–89 (`CONFIGURED_SHARED`), 115–136 (`noSharedPayload`), 186–235 (`zipForAppStore`), 237–242 (why `base` is unset) |
| `project-template/src/mfRuntimePlugin.ts` | Lines 16–35 (why the MF types are not imported), 75–97 (both remotes arrays) |
| `project-template/package.json` | `peerDependencies` and the two `"//"` prose blocks explaining them |
| `project-template/tsconfig*.json` | Three configs; `skipLibCheck: false` on app sources is deliberate |

### Deliverables — package skeleton (§4.1, §4.8)

- [ ] Create `packages/app-runtime/` — `@cytoscape-web/app-runtime`, `0.1.0`,
      `type: module`, `engines.node >= 24`
  - [ ] `exports` limited to **`./vite` and `./meta`**. The runtime plugin is
        resolved internally, not exported
  - [ ] `bin: { "cyweb-app": … }` declared now, implemented in Phase 4
- [ ] Add `packages/*` to the root `workspaces`
- [ ] **Scope `scripts/manifest.mjs` validation to app workspaces only** — it
      currently asserts the `workspaceDir` set equals the `workspaces` set in
      both directions, so adding a package breaks it immediately
- [ ] Fix build order: **SDK → the five apps → (Phase 5) scaffolder fixtures**

### Deliverables — app metadata (§4.3)

- [ ] `cyweb` block schema with **runtime** validation, failing the build with
      the offending field named:
  - [ ] `id` matches `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/` — the same rule the host's
        `parseManifest.ts` applies, so a locally valid id cannot be rejected on install
  - [ ] `id` of `cyweb` is reserved and refused
  - [ ] `port` present and free-form valid; `displayName` present
  - [ ] `version` is canonical SemVer
- [ ] Read `<root>/package.json` with `node:fs` — **not** an import.
      `tsconfig.node.json` does not enable `resolveJsonModule`
- [ ] `./meta` export — the schema types plus the `virtual:cyweb-app-meta`
      module declaration
- [ ] The virtual-module plugin, exposing **only the allowlisted fields**
  - [ ] Never the raw `package.json`: importing it bundles `devDependencies`,
        `scripts`, and every private field into the browser bundle
- [ ] Add the `cyweb` block to `project-template/package.json`

### Deliverables — the config builder (§4.2)

- [ ] `defineCyWebApp(import.meta.url, options?)` — the first argument is
      **required**. `process.cwd()` is wrong whenever Vite runs from a monorepo
      root or with `--config`
- [ ] Options, and only these: `react`, `exposes`, `devHostPageUrl`,
      `devHostRemoteEntryUrl`, `appStoreZip`, `vite`
  - [ ] **No `id` override** — identity has one source
  - [ ] **No wholesale `shared` replacement** — it would defeat P-1
- [ ] `exposes` merged with the mandatory `./AppConfig`; a key collision is fatal
- [ ] Protected fields enforced, with a **named error naming the path** when user
      `vite` config touches one — it must neither silently win nor silently lose:
  - [ ] the runtime-plugin registration
  - [ ] `remotes.cyweb` — `type`, `name`, `entryGlobalName`, `shareScope`, and the
        production entry sentinel
  - [ ] the shared singleton set and its `singleton: true` / `import: false` flags
  - [ ] the `./AppConfig` expose
  - [ ] `server.port`, `server.strictPort`, `server.origin`, the CORS header
  - [ ] `build.target`, `build.outDir`, and the deliberate **absence** of `base`
- [ ] Composable exports — `cywebFederation`, `noSharedPayload`, `CYWEB_SHARED` —
      documented as **advanced and unsupported**, outside the high-level API's guarantees
- [ ] `CYWEB_SHARED` is the single source of truth for the five singletons

### Deliverables — the runtime plugin (§4.4)

- [ ] Move `mfRuntimePlugin` and `cywebHostSentinel` into the package
- [ ] **Ship precompiled `.js`, not `.ts`** — `runtimePlugins` entries are
      interpolated into an `import "<path>"` inside a generated virtual module,
      and a `.ts` file in `node_modules` is not reliably transformed
- [ ] Resolve the path with `createRequire(import.meta.url).resolve(...)`, still
      `normalizePath`-ed (a Windows backslash path is an invalid specifier)
- [ ] Preserve the **both-arrays** write: `userOptions.remotes` **and**
      `options.remotes`. Writing one works in exactly one of the two init paths,
      silently
- [ ] `apiVersion` is **read for the dev banner only** — no comparison, no
      enforcement (the P-2 retraction)
- [ ] Move the five copies of `test/mfRuntimePlugin.test.ts` into one suite here,
      still against a **real `ModuleFederation` instance**

### Deliverables — build plugins (§4.4, §4.9)

- [ ] `noSharedPayload` takes the app root from `configResolved`
      (`config.root`, `config.build.outDir`), **not** from `import.meta.url`
  - [ ] Keep `apply: 'build'`, `enforce: 'post'`, and the **namespace prefixes**
        (`/node_modules/@mui/`, not a package list — `@mui/utils` is the case)
- [ ] `zipForAppStore` likewise, and **opt-in with `appStoreZip` defaulting to
      `false`**. It currently runs on every build, which is why stale `*.zip`
      files sit in the working tree
- [ ] The explanatory comments move **with** the code they explain

### Deliverables — convert `project-template`

- [ ] `vite.config.ts` → three lines
- [ ] Delete `src/mfRuntimePlugin.ts`, `src/cywebHostSentinel.ts`,
      `test/mfRuntimePlugin.test.ts`
- [ ] Keep a short block in the template stating what `defineCyWebApp` sets up
      and why, linking to the SDK source for the full reasoning
- [ ] Confirm `guides/architecture-overview.md` still carries the four-item table

### Verification (Phase 1)

- [ ] **Byte-comparable federation shape** — the built `mf-manifest.json` audit
      fields (`configuredShared`, `configuredRemote`, `configuredRuntimePlugins`)
      match the Phase 0 baseline **except the runtime-plugin path**. This is the
      phase's whole point: the config moved, the output did not
- [ ] `npm run verify:federation` passes with the **same check count** as baseline (26)
- [ ] `npm run typecheck` passes on all three configs
- [ ] `npm run check:imports` passes
- [ ] The SDK's runtime-plugin suite passes — all cases the five copies covered
- [ ] The production build carries the sentinel, never `localhost:5500`
- [ ] `noSharedPayload` still fires on a **rendered** `@mui/material/Box`. An
      unused subpath import does not bundle MUI; the fixture has to render it
- [ ] The app loads in a running host from `apps.local.json`, mounts, panel renders
- [ ] **Packed-tarball resolution smoke test, npm and pnpm.** `npm pack` the SDK,
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
- [ ] **Import allowlist** — if Phase 0 decided it out (§9 Q2)

### Known non-issues

- [ ] Plugin 1.16.8 prints `Shared dependency "@emotion/styled" has import: false
      but is not installed locally` on correct builds. Do **not** treat plugin
      warnings as CI errors on account of it
- [ ] `network-statistics` reports **16** checks, not 26. It shares nothing, so
      the per-package share assertions have nothing to assert
