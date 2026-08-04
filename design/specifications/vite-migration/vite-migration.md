# App Examples — Webpack → Vite Migration Plan

> **Status: Phases 1–5 complete; Phases 6–8 not yet implemented.** The pilot
> (`project-template`) is migrated, loads in a running host from a production
> artifact carrying only the sentinel, and installs standalone. Phase 2 was
> closed with its production-deploy gate **waived** (unavailable in the team's
> current workflow), which makes Phase 3's Pages preflight the only remaining
> release gate — see §8. That preflight is now built and **self-activating**:
> it arms itself when the first `published` app flips to Vite, which is Phase 4.
>
> **Scope:** the five workspace apps in this repository. `patterns/` was
> **deleted in Phase 1** (§7.5). The host repo (`cytoscape-web`)
> already builds with Vite and already expects the artifacts this plan
> produces, but it is **not untouched**: it gains the published host descriptor
> and its pure URL helper (§6.3, §11.2), a direct `@module-federation/runtime`
> dependency, `verify:federation` in CI, and an extended E2E fixture (§11.2).
> All of that is Phase 2, and Phase 2 is not complete until it is deployed to
> production (§8).
>
> **Host-side background** (in `cytoscape-web`, referenced throughout):
>
> - [`docs/design/module-federation/specifications/remote-app-loading-modernization.md`](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/specifications/remote-app-loading-modernization.md)
>   — why the host now loads remotes as ES modules
> - [`docs/design/module-federation/specifications/vite-migration-federation-test-hardening.md`](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/specifications/vite-migration-federation-test-hardening.md)
>   — the host's own Vite migration and its test net

- Rev. 20 (8/4/2026): Keiichiro ONO and Claude (Opus 5) — **`hello-world`
  migrated.** The per-app block transferred verbatim from the pilot, which is
  what Phase 4 existed to establish. §7.6's `__webpack_public_path__` removal
  was verified where it had to be — at runtime, since `typecheck` and `build`
  both pass on the broken version. Corrected the subpath-import count: **75**
  rewritten, not the 79 `check:imports` reported, because four of those lived
  in the file §7.6 rewrote away.
- Rev. 19 (8/4/2026): Keiichiro ONO and Claude (Opus 5) — **Phase 4 pilot
  migrated.** The two open §8 decisions are settled from real output (accept
  the absolute paths; do not publish the SSR files), and §5.7's A-vs-B question
  is answered with numbers that are far larger than the estimate: **800,753 vs
  92,325 browser bytes**, an 8.7× difference, because MUI's fallback alone is
  674 kB. Two things were also learned that the plan did not anticipate — the
  `noSharedPayload` gate and Option A are mutually exclusive by construction,
  and an *unused* subpath import does not bundle MUI, so a gate test must
  actually render the component.
- Rev. 18 (8/1/2026): Keiichiro ONO and Claude (Opus 5) — Closed the last
  Phase 3 gap. The §8 preflight — which the Phase 2 waiver promoted from
  "cheap insurance" to the only release gate — was exercised against
  production (red), a control host (red, via `--selftest`) and a correct host
  (green, 10/10). Recorded because red-only and green-only both look like
  proof and are not. Also: this repository's first PR CI ran green (PR #2).
- Rev. 17 (8/1/2026): Keiichiro ONO and Claude (Opus 5) — **Phase 3
  implemented**, and a probe build of the §5.5 canonical config settled four
  things this plan had been assuming. §11.0's verifier is now written against
  the **real** `mf-manifest.json` (recorded below) rather than an inferred one;
  `react/jsx-runtime` is confirmed derived **only when JSX is present**, which
  is what `DERIVED_SHARED_ALLOWLIST` exists for; §5.8's root-barrel decision is
  confirmed to bundle no MUI under the canonical config; and **§8 Decision A
  reproduced in this repo**, which in turn showed that a post-hoc text scan
  cannot stand in for the `generateBundle` payload gate — it is false in both
  directions. Two Phase 3 checks were also narrowed to the case where they
  mean anything (see §8).
- Rev. 16 (8/1/2026): Keiichiro ONO and Claude (Opus 5) — **Phase 2 declared
  complete with its production-deploy gate waived**, that deployment not being
  available in the team's current workflow. Recorded the consequence rather
  than only the decision: §8's option (1) is gone, so the Pages preflight is no
  longer "cheap insurance" but the **only** thing preventing an app being
  published against a host that cannot load it — with the three properties it
  must now have, and the §13 risk row rewritten from "structural, not
  procedural" to what is actually true. CI is green on PR #655 (run
  30720488880): `verify:federation` 36/36 and the E2E on all three browsers,
  so `remote-app-load` — the only check of the remote → host direction — has
  now actually run.
- Rev. 15 (8/1/2026): Keiichiro ONO and Claude (Opus 5) — Recorded the first
  execution of the §8 descriptor contract: **10/10 on `localhost:5500`**, run
  by hand in the browser console. Wrote that console form into §8 as a third
  sanctioned way to execute the contract (no Playwright install needed, which
  is what made it usable here), with an explicit note that it covers the
  host → descriptor half only.
- Rev. 14 (8/1/2026): Keiichiro ONO and Claude (Opus 5) — **Phase 2 code
  landed in `cytoscape-web`.** Two shape changes fell out of building it:
  §6.3's inline `Object.defineProperty` became
  `publishHostDescriptor(target, base, href)`, because the inline form makes
  the immutability contract untestable (importing `bootstrap.tsx` runs the
  whole boot); and the host's descriptor-contract spec takes a
  `CYWEB_HOST_URL` override so one file covers CI, production and branch
  previews — Phase 2's exit criterion needs a production run before Phase 3's
  `preflight-host.mjs` exists. Also recorded the first real measurement of the
  §8 SSR artifacts, from the fixture's own build.
- Rev. 13 (8/1/2026): Keiichiro ONO and Claude (Opus 5) — **Phase 1 executed.**
  Recorded the four Phase 1 decisions as settled rather than open (canonical
  URL, built set = the five workspaces, published set = **four apps**,
  `claude-bridge` excluded; `patterns/` deleted), deleted `patterns/`, and
  bumped `@cytoscape-web/api-types` to `1.0.0-beta.3` with the lockfile.
- Rev. 12 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Final review
  response. Gave the smoke runner an app-selection predicate (running it over
  every `published` app mid-migration would fail on the still-Webpack ones by
  construction), and split the cache-bust assertion for `remoteEntry.js` from
  the one for its chunks (a relative ESM import does not inherit the parent
  URL's query, so requiring `?v=` on chunks was unimplementable).
- Rev. 11 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Tenth review
  response. Staged the publish policy and the peer cross-check by `bundler`
  (Phase 3 would otherwise fail on every still-Webpack app); derived the
  runtime-plugin audit field from the real array instead of a literal (it was
  false-green); put `smokeObservable` in the schema and fixed the catalog
  injection for the host's first-wins dedupe; corrected the
  `waitForFunction` signature and the fixture's `WorkspaceInfo` shape.
- Rev. 10 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Ninth review
  response. Replaced the unimplementable `?installApp=` smoke path (the host
  requires a single-entry manifest and its origin allowlist excludes
  `cytoscape.org`) with `/apps.json` interception; added `configuredRemote` to
  the audit artifact so the verifier's remote assertions have a source; fixed
  the Playwright dependency/contract/phase gaps; settled the fixture's ambient
  types on a local declaration; hardened `copy-dist`'s delete boundary.
- Rev. 9 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Eighth review
  response. Pinned the shared-audit artifact to a single `CONFIGURED_SHARED`
  object consumed three ways, decided in Phase 3 rather than Phase 4; widened
  the payload gate to namespace prefixes (`@mui/utils` slipped through);
  restricted `check:imports` to migrated apps; specified the manifest-driven
  tooling and its validation rules; gave the preflight/smoke gates a runner and
  a contract; fixed the fixture's `runtimePlugins` registration and the
  api-types fresh-checkout resolution; redefined `copy-dist` around an approved
  publish set.
- Rev. 8 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Seventh review
  response. Split the shared contract into **configured** vs **effective** (the
  plugin derives extra keys such as `react/jsx-runtime`, so exact equality
  against five keys fails on a correct build); gave the manifest a concrete
  schema; specified the host fixture's federation wiring in Phase 2; replaced
  the string-match Pages preflight and the HTTP-only smoke with real load
  checks; put the payload gate into the canonical config; made `check:imports` a
  real script.
- Rev. 7 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Sixth review
  response. Fixed the test-file placement and the structural type (a
  non-generic `beforeInit` does not satisfy the real hook); purged the §13 risk
  table of the withdrawn trailing-slash and Node-only-`skipLibCheck` positions;
  unified the release gate across §8, the phase table and §13; added the
  `@mui/icons-material` policy (measured: one icon import = 148.7 kB of local
  MUI payload); tightened the shared-verifier and `generateBundle` contracts.
- Rev. 6 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Fifth review response.
  **Reversed §5.8 again**: the trailing-slash share key externalizes at build
  time but cannot resolve at runtime, because the host only provides the
  subpaths it itself imports — 9 of the apps' 20 are not among them. Root-barrel
  imports with the exact key are the fix, measured. Also: the runtime type
  import breaks the **app** tsconfig after Webpack removal, not just the Node
  one (§7.4); narrowed the localhost verifier check; moved payload verification
  to `generateBundle`; added the deploy release-gate mechanism.
- Rev. 5 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Fourth review
  response. **Added §5.8: MUI subpath imports bypass the `shared` block**, which
  would have silently defeated §5.7 — with a measured fix that needs no source
  changes. Corrected §5.7's claim that a version mismatch warns (the plugin's
  `import: false` path takes the first provider with no semver check). Recorded
  the SSR-loader artifacts and absolute build-path leakage §8 must decide about.
  Fixed `lib` to `ESNext`, the descriptor `name` contract, the duplicated
  sentinel, the CI-scope and Phase-4 step-range contradictions, and added the
  production-host descriptor release gate.
- Rev. 4 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Third review response.
  **Reversed the §5.7 shared-fallback decision on measured evidence**: the
  fallback chunks are statically imported by the exposed module, so Rev. 3's
  "emitted but never fetched" was wrong and its step 13 was unfalsifiable.
  Implemented the fail-loud fallback policy in the canonical config instead of
  only asserting it; added `skipLibCheck` to the Node tsconfig only (the MF SDK
  types import `webpack`); pinned Vitest into the dependency table and CI;
  reworked Phases 1, 3 and 7.
- Rev. 3 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Second review
  response. Split Phase 3 so `noEmit` and the verifier land per app rather than
  repo-wide (Rev. 2 would have broken every remaining Webpack build); resolved
  the shared-fallback contradiction (§5.7); specified the two-tsconfig layout
  and standalone API-types resolution (§7.4); made the host descriptor typed and
  immutable (§6.3); added `normalizePath` for Windows (§6.4); corrected the
  `HelloHeader` replacement (§7.6). Withdrew three incorrect claims: `patterns`'
  `remotes` string is **not** doubly prefixed, `minimize: false` is 4-of-5
  workspace apps, and the api-types lockfile mismatch is **real**, not
  hypothetical.
- Rev. 2 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Review response.
  Corrected the runtime plugin to write `userOptions.remotes` (Rev. 1 mutated
  the wrong array and would not have worked); fixed the `tsconfig`
  `typeRoots`/`@types/node` conflict; added the `__webpack_public_path__`
  removal; reordered the phases so Webpack is removed last; added the
  standalone-copy requirement for `project-template`; corrected the canonical
  Pages URL, the HMR claim, the `requiredVersion` rationale, and the `patterns`
  inventory row; replaced the byte-sniff verification with a build verifier.
- Rev. 1 (7/30/2026): Keiichiro ONO and Claude (Opus 5) — Initial plan.

---

## 1. Purpose

The host (`cytoscape-web`) builds with **Vite 8 (Rolldown) +
`@module-federation/vite`**. The example apps in this repository still build
with **Webpack 5 + `ModuleFederationPlugin`**. Third-party app developers
therefore have to learn two bundlers to read one system: the host docs describe
Vite, the copy-paste starting point (`project-template/`) hands them a
`webpack.config.js`.

This plan unifies this repository on Vite so that:

1. **One bundler, one mental model.** A developer reads `vite.config.ts` in the
   host and `vite.config.ts` in the template, and the federation blocks look the
   same.
2. **The examples actually load in the current host.** As §2 shows, this is not
   only a consistency concern — the webpack-built remotes are on the wrong side
   of a contract change the host already made.
3. **Shared singletons match the host's set**, closing a latent
   duplicate-Emotion bug.

## 2. This is not cosmetic — the examples are on the wrong loader contract

The host's remote loader was modernized (see *remote-app-loading-modernization*
above). `cytoscape-web/src/features/AppManager/ExternalComponent.tsx` now
registers every remote with the Module Federation runtime as
**`type: 'module'`**:

```ts
runtime.registerRemotes([{ name: scope, entry: url, type: 'module' }], {
  force: true,
})
```

In `@module-federation/runtime-core`, `type: 'module'` routes to `loadEsmEntry`,
which performs a native dynamic `import()` of `remoteEntry.js` and reads
`init`/`get` from the **ES module namespace**
(`node_modules/@module-federation/runtime-core/dist/utils/load.js`).

The webpack examples emit the classic **`var` library** format. The current
build output confirms it:

```js
// hello-world/dist/remoteEntry.js
var hello;(()=>{"use strict";var e,r,t,o,n,a,i={7094(e,r,t){var o={"./AppConfig":…
```

Imported as an ES module, `var hello` is **module-scoped**, not a global. The
namespace exports nothing, so the runtime gets no `init`/`get` and the remote
fails to register. The webpack-era global-registration contract the examples
rely on no longer exists on the host side.

There are two ways out: have the examples emit an additional `var` entry (the
plugin's `varFilename` option, for legacy hosts), or move the examples to Vite
so they emit the ESM entry the host already expects. This plan takes the second
— it is the same direction the host took, and it removes the two-bundler split
at the same time.

> **Secondary contract drift.** `FEDERATION_SHARED_SINGLETONS` in the host
> (`cytoscape-web/src/app-api/federation/federationExposes.ts`) now lists
> **five** singletons:
> `react`, `react-dom`, `@mui/material`, `@emotion/react`, `@emotion/styled`.
> Every example still declares only the first three. A MUI-using remote without
> shared Emotion builds its own Emotion cache — duplicated styles and broken
> theming. The migration must bring the **four React/MUI apps** to five;
> `network-statistics` shares nothing and is explicitly empty (§11.0).

## 3. Current state inventory

Five federated packages, five near-identical `webpack.config.js` files (a sixth,
`patterns/`, was deleted in Phase 1 — §7.5):

| Package              | Federation name     | Port | Exposes                              | Built? | Published? |
| -------------------- | ------------------- | ---- | ------------------------------------ | ------ | ---------- |
| `hello-world`        | `hello`             | 2222 | `./AppConfig`, `./NetworkSummaryMenuItem` | yes | yes    |
| `network-statistics` | `networkStatistics` | 3333 | `./AppConfig`                        | yes    | yes        |
| `network-workflows`  | `networkWorkflows`  | 7000 | `./AppConfig`                        | yes    | yes        |
| `project-template`   | `template`          | 5555 | `./AppConfig`                        | yes    | yes        |
| `claude-bridge`      | `claudeBridge`      | 6100 | `./AppConfig`                        | yes    | **no**     |

"Built" = in `workspaces`, so `npm run build` reaches it. "Published" = copied
into `docs/` by the Pages workflow. The two sets differ and the plan must keep
them distinct — Phase 1 settled both; see §8.

Shared root toolchain (`package.json` `devDependencies`): `webpack`,
`webpack-cli`, `webpack-dev-server`, `ts-loader`, `clean-webpack-plugin`,
`concurrently`, `typescript`, `@cytoscape-web/api-types`.

`claude-bridge/mcp-server/` is a separate Node package built with plain `tsc`.
**It is out of scope** — it never goes through the bundler.

### Pre-existing defects to fix while migrating

These are latent today and must not be carried across verbatim:

- **`patterns/` was not merely an orphan — it did not work.** It was absent from
  `workspaces` (never built, dependencies never installed); its port (5555)
  collided with `project-template`; it exposed `./PatternApp` pointing at
  `./src/PatternApp`, which **did not exist** (the file was `PatternsApp.tsx`);
  and its app id was `app-patterns` while its federation name was
  `createNetwork`, which the host's `loadRemoteApp` id check rejects outright.
  It also still used the legacy `components:` field rather than `resources:`.
  Dead code, not a migration candidate — **deleted in Phase 1**, see §7.5.
  (Rev. 2 also claimed its `remotes` string was doubly `cyweb@`-prefixed. That
  was wrong: `patterns` defined `LOCAL_CYWEB` **without** the prefix, unlike its
  siblings, so `` `${CYWEB_NAME}@${LOCAL_CYWEB}` `` was correct. The remaining
  defects carry the conclusion on their own.)
- **`hello-world` reads `__webpack_public_path__` at module scope.** A
  Webpack-injected global with no Vite equivalent; under Vite this is a
  `ReferenceError` at module evaluation, not a build error. See §7.6.
- **`network-workflows` hardcodes `mode: 'development'`,** ignoring its own
  `isProduction` flag — its "production" build is a development build.
- **Four of the five workspace apps set `optimization.minimize: false`** (all
  but `hello-world`), so the deployed Pages
  artifacts are unminified. Vite minifies by default; this is a behavioral
  change to accept deliberately, not to discover.
- **`hello-world` imports `terser-webpack-plugin`** which is not declared in any
  `package.json` — it resolves only transitively through `webpack`.
- **`project-template` declares no dependencies at all.** Its `package.json` has
  `scripts` and nothing else; React, MUI, TypeScript and the API types all
  resolve by hoisting from the monorepo root. Copying the directory out — the
  documented way to start an app — produces something that does not install.
  See §7.3.
- **The host's `apps.local.json` has no `template` entry.** Entries exist for
  `hello`, `networkWorkflows`, `networkStatistics` and `claudeBridge` only, so
  the template cannot be loaded locally without editing host config first.

## 4. Webpack → Vite mapping

| Webpack (current)                                   | Vite (target)                                                | Notes                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `webpack.container.ModuleFederationPlugin`           | `federation()` from `@module-federation/vite`                 | Pin the host's version: **1.16.8**                                        |
| `remotes: { cyweb: 'cyweb@http://…/remoteEntry.js' }`| `remotes: { cyweb: { type: 'module', … } }`                   | **Object form is mandatory** — see §5.1                                    |
| `entry: './src/index.ts'`                            | `index.html` + `exposes`                                      | Vite requires an HTML entry — see §5.3                                    |
| `output.publicPath: 'auto'`                          | leave `base` unset                                            | The plugin resolves `publicPath: 'auto'` when Vite `base` is unset         |
| `output.path: dist`, `output.clean: true`            | `build.outDir: 'dist'` (emptied by default)                   | —                                                                          |
| `module.rules` → `ts-loader`                         | esbuild/Oxc transpile (built in)                              | **Type checking is lost** — add `tsc --noEmit`, see §7.4                    |
| `resolve.extensions`                                 | Vite default                                                  | Drop it; the default already covers `.ts/.tsx/.js/.jsx/.json`              |
| `optimization.runtimeChunk`, `splitChunks`           | *(remove)*                                                    | The MF plugin owns the chunk graph; `manualChunks` is ignored by design    |
| `TerserPlugin`                                       | Vite default minifier (Oxc)                                   | Drop the explicit plugin                                                    |
| `devtool: false`                                     | `build.sourcemap: false` (default)                            | —                                                                          |
| `devServer.port` + `headers`                         | `server.port` + `strictPort` + `server.headers` + `server.origin` | See §5.2                                                              |
| `--env production=true` / `=false`                   | `vite build`                                                  | The two-build split goes away entirely — see §6.5 and §7.2                 |
| `isProduction ? PROD_CYWEB : LOCAL_CYWEB`            | runtime plugin reads `window.__CYWEB_HOST__`                  | **The host URL stops being a build-time constant** — see §6                |
| *(none)*                                             | `build.target: 'esnext'`                                      | Known-good starting target, not a hard requirement — see §5.4              |
| *(none)*                                             | `runtimePlugins: [<abs path>]`                                | Carries the runtime host resolution — see §6.4                            |

## 5. Target configuration

### 5.1 The `cyweb` remote must be declared as `type: 'module'`

The webpack string shorthand (`'cyweb@http://localhost:5500/remoteEntry.js'`)
maps to remote type **`var`**, which is the plugin's default. The host is built
by `@module-federation/vite` and emits an **ESM** `remoteEntry.js`, so the
shorthand cannot be used. Every example must use the object form:

```ts
const cywebRemote = (command: 'serve' | 'build') => ({
  cyweb: {
    type: 'module' as const,
    name: 'cyweb',
    entryGlobalName: 'cyweb',
    shareScope: 'default',
    // Dev keeps a working localhost default; a production build ships the
    // sentinel so a missing host descriptor fails loudly (§6.4).
    entry:
      command === 'serve'
        ? 'http://localhost:5500/remoteEntry.js'
        : CYWEB_HOST_REQUIRED,
  },
})
```

This is the single most error-prone step of the migration, and the one that
produces the least legible failure when wrong (the remote silently resolves no
exports). It deserves a prominent comment in `project-template`.

The `entry` value is never the operative URL: §6 replaces it at runtime with the
address the running host publishes. The `command` branch is not optional
decoration — an unconditional localhost entry is exactly the production defect
§6.4's fail-loud policy exists to prevent, because the resolver only throws when
it sees the sentinel.

### 5.2 Dev server

Three settings the webpack config did not need:

- **`server.strictPort: true`** — matches the host. A silent port fallback moves
  the remote off the URL registered in `apps.local.json`, and the failure
  surfaces later as an unexplained "app not found".
- **`server.origin: 'http://localhost:<port>'`** — tells Vite to emit absolute
  asset URLs in dev. Without it, the host (a different origin) resolves the
  remote's chunk URLs against *its own* origin.
- **`server.headers: { 'Access-Control-Allow-Origin': '*' }`** — carried over
  from `devServer.headers`; Vite's default CORS policy no longer permits
  arbitrary cross-origin dev requests.

### 5.3 Vite needs an HTML entry

Unlike webpack's `entry`, a Vite build is driven by `index.html`. A remote-only
bundle has no page of its own. The host repo already solved this for its E2E
fixture (`cytoscape-web/test/fixtures/remote-app/index.html`) — reuse that shape
verbatim:

```html
<!doctype html>
<html>
  <head>
    <title>hello-world remote</title>
  </head>
  <body>
    <!-- Remote-only build; this entry exists solely to satisfy Vite's
         requirement for an HTML entry. The host loads remoteEntry.js directly. -->
    <script type="module"></script>
  </body>
</html>
```

### 5.4 `build.target: 'esnext'` — start here, and know why

The Module Federation runtime's `importShared` uses top-level `await`. The host
sets `esnext` because a lower target failed its build with `REQUIRE_TLA` on
shared deps (`@mui/*`, `@emotion/*`); the E2E fixture copies it for the same
reason. That is direct evidence for the *host's* configuration, not a proof that
every remote in every plugin version needs it — a remote sharing fewer packages
may well build at a lower target.

Treat `esnext` as the **known-good starting value**, not a law. It is also a
browser-support decision: it drops any browser without top-level `await` and
modern syntax support. If a lower target is ever wanted, Phase 4 is where to
find out whether it builds — do not lower it silently per app.

### 5.5 Canonical `vite.config.ts` (project-template)

```ts
import { fileURLToPath } from 'node:url'

import { federation } from '@module-federation/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, normalizePath, type Plugin } from 'vite'

// TODO: Change to an unused port.
const DEV_SERVER_PORT = 5555

// Absolute path: runtimePlugins are imported from a generated virtual module,
// where a relative specifier has no stable base to resolve against.
// normalizePath because the plugin interpolates this straight into an
// `import "<path>"` — a Windows backslash path is an invalid specifier.
const mfRuntimePlugin = normalizePath(
  fileURLToPath(new URL('./src/mfRuntimePlugin.ts', import.meta.url)),
)

// Single definition of the runtime plugins WE register. federation() receives a
// copy — the plugin appends its own SSR runtime plugin to the array it is
// given, so passing this one directly would let internal entries leak into the
// audit field below.
const CONFIGURED_RUNTIME_PLUGINS = [mfRuntimePlugin] as const

// Sentinel emitted instead of a localhost fallback in production builds.
// Imported by src/mfRuntimePlugin.ts too — one definition, so the config and
// the runtime check cannot drift (§6.4).
import { CYWEB_HOST_REQUIRED } from './src/cywebHostSentinel'

// THE single definition of this app's shared configuration. Passed to
// federation() below AND embedded into mf-manifest.json via additionalData, so
// the verifier compares against exactly what the plugin received (§11.0) —
// a second constant could drift from the federation call.
//
// Keys are EXACT (no trailing slash) and match the host's
// FEDERATION_SHARED_SINGLETONS. This only works because app sources import the
// MUI/Emotion ROOT modules — `import { Box } from '@mui/material'`. A
// `@mui/material/Box` subpath import silently bundles MUI locally instead;
// see §5.8, which also explains why the trailing-slash key is not the answer.
//
// requiredVersion is declared compatibility metadata, not enforcement — the
// runtime does not compare it (§5.7).
export const CONFIGURED_SHARED = {
  react: { singleton: true, import: false as const, requiredVersion: '^18.3.1' },
  'react-dom': { singleton: true, import: false as const, requiredVersion: '^18.3.1' },
  '@mui/material': { singleton: true, import: false as const, requiredVersion: '^5.18.0' },
  '@emotion/react': { singleton: true, import: false as const, requiredVersion: '^11.10.4' },
  '@emotion/styled': { singleton: true, import: false as const, requiredVersion: '^11.10.4' },
} as const

// NOTE: `base` is intentionally NOT set anywhere below. The MF plugin then
// resolves publicPath to 'auto', so chunks resolve relative to remoteEntry.js
// wherever it is deployed — parity with the webpack build's
// `output.publicPath: 'auto'`, and it needs no knowledge of the deploy target.
// A fully absolute base would also work but re-pins the artifact to one
// deployment, which is exactly what §6 removes.
/**
 * Build-time gate: fail if a shared package's implementation ends up in this
 * remote's chunks (§11.0). `enforce: 'post'` so it inspects the graph AFTER the
 * federation plugin's rewriting; `apply: 'build'` because dev serves unbundled
 * modules. Physical node_modules paths only — the plugin's own
 * `virtual:mf:…loadShare…` wrappers legitimately name these packages.
 */
// NAMESPACE prefixes, not package names. A list of exact packages lets
// @mui/utils (and anything else under @mui or @emotion) through, dragging the
// implementation back into the bundle — verified.
const BANNED_PREFIXES = [
  '/node_modules/@mui/',
  '/node_modules/@emotion/',
  '/node_modules/react/',
  '/node_modules/react-dom/',
]
const noSharedPayload = (): Plugin => ({
  name: 'no-shared-payload',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== 'chunk') continue
      for (const id of Object.keys(chunk.modules)) {
        const path = id.replace(/\\/g, '/')
        if (path.startsWith('\0') || path.includes('virtual:mf')) continue
        const hit = BANNED_PREFIXES.find((prefix) => path.includes(prefix))
        if (hit !== undefined) {
          this.error(
            `[no-shared-payload] ${hit} bundled into ${chunk.fileName} ` +
              `via ${id}. Shared packages must come from the host — check for ` +
              `a subpath import (§5.8).`,
          )
        }
      }
    }
  },
})

export default defineConfig(({ command }) => {
  // Single definition, passed to federation() AND embedded in the manifest —
  // the native manifest does not record a remote's `type`, so without this the
  // verifier has no source for its `type: 'module'` assertion (§11.0).
  const CYWEB_REMOTE = {
    // The host is a @module-federation/vite build and emits an ESM
    // remoteEntry.js. `type: 'module'` is REQUIRED — the plugin defaults to
    // 'var' (webpack-style global), which resolves no exports against an ESM
    // host and fails silently.
    type: 'module' as const,
    name: 'cyweb',
    entryGlobalName: 'cyweb',
    shareScope: 'default',
    // DEV ONLY on the left. A production build deliberately ships the sentinel
    // rather than a localhost URL: without it, a deployed app whose host
    // predates the descriptor would try to connect to the END USER's own
    // loopback address. The sentinel makes mfRuntimePlugin.ts throw instead.
    entry:
      command === 'serve'
        ? 'http://localhost:5500/remoteEntry.js'
        : CYWEB_HOST_REQUIRED,
  }

  return {
  plugins: [
    react(),
    federation({
      name: 'template', // TODO: Change to your unique camelCase app name.
      filename: 'remoteEntry.js',
      dts: false,
      // Replaces the `cyweb` entry below with the URL the running host
      // publishes — see design/specifications/vite-migration.md §6.
      runtimePlugins: [...CONFIGURED_RUNTIME_PLUGINS],
      remotes: { cyweb: CYWEB_REMOTE },
      exposes: {
        './AppConfig': './src/index.ts',
      },
      // Must match FEDERATION_SHARED_SINGLETONS in the host
      // (src/app-api/federation/federationExposes.ts). React/ReactDOM must be
      // single or cross-boundary hooks throw "invalid hook call"; MUI relies
      // on Emotion, so both Emotion packages must be shared too.
      // `import: false` — do NOT bundle a local fallback. Those fallbacks are
      // statically imported by the exposed module, so they cost transfer and
      // parse time on every load even when the host's singleton wins (§5.7).
      shared: CONFIGURED_SHARED,
      // Emits mf-manifest.json (the verifier's effective-shared source) and
      // embeds the configured records, which the native manifest omits.
      manifest: {
        additionalData: ({ stats }) => {
          Object.assign(stats as Record<string, unknown>, {
            configuredShared: CONFIGURED_SHARED,
            // `entry` deliberately included: the verifier asserts a production
            // build ships the sentinel, not a localhost URL (§6.4).
            configuredRemote: CYWEB_REMOTE,
            configuredRuntimePlugins: [...CONFIGURED_RUNTIME_PLUGINS],
          })
        },
      },
    }),
    // AFTER federation() — see the plugin's own comment.
    noSharedPayload(),
  ],
  build: {
    outDir: 'dist',
    // esnext so the MF runtime's top-level await is allowed under Rolldown.
    target: 'esnext',
  },
  server: {
    port: DEV_SERVER_PORT,
    strictPort: true,
    origin: `http://localhost:${DEV_SERVER_PORT}`,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  }
})
```

`network-statistics` uses neither React nor MUI: it omits the `react()` plugin
and shares only what it actually imports (§7.3).

Note the config is no longer a function of `mode`: with the host URL resolved at
runtime (§6), nothing in it varies by environment.

### 5.6 Rejected: a shared config factory

An obvious DRY move is a root-level `createAppConfig()` that all five apps call.
**Rejected.** This repo's product is legibility: a developer copies
`project-template/` into their own repo, where a `../shared/` import does not
exist. A self-contained `vite.config.ts` per app keeps every example
copy-pasteable. The duplication is ~40 lines and is the point, not the cost.

What *is* dropped is the `deps` import from the **root** `package.json`, which
today supplies every `requiredVersion` — a cross-package reference that does not
survive a copy-paste. It is replaced by a local `CONFIGURED_SHARED` map in each
`vite.config.ts` (§5.5), not by omitting the field.

Omitting `requiredVersion` entirely is a viable alternative *only* in the
default (`import` enabled) case, and it is worth understanding why it is not a
loosening: `@module-federation/vite` then calls `searchPackageVersion()` on the
installed dependency and emits `"^<installed>"`, falling back to `"*"` only when
it cannot find the package. That is a change of provenance — from a hand-written
root block to what the package actually has installed — with one catch: **the
resolved version, not the declared range, is what ships**, so a lockfile refresh
can move the emitted range with no config edit.

§5.7 removes the option anyway. With `import: false` the same omission yields
`"*"`, so the ranges must be explicit — which also makes them auditable against
the host in one place.

### 5.7 Shared fallbacks are **transferred**, not merely emitted

`shared: { react: { singleton: true } }` means **"one instance wins at
runtime"**. It does not mean "do not bundle a copy" — and, critically, it does
not mean the bundled copy sits unused on disk.

Measured against the host's own remote fixture (`@module-federation/vite`
1.16.8, sharing only `react` / `react-dom`), `vite build` emits:

```
assets/…loadShare__react_mf_2_dom__loadShare__.js   195.13 kB   ← ReactDOM
assets/…loadShare__react__loadShare__.js             17.47 kB   ← React
```

and the **static** import chain is:

```
AppConfig (the exposed module)
  └─ import "…loadShare__react_mf_2_dom_mf_1_client__loadShare__.js"   (static)
       └─ import "…loadShare__react_mf_2_dom__loadShare__.js"          (static, 195 kB)
            └─ import "…loadShare__react__loadShare__.js"              (static, 17 kB)
```

No dynamic `import()` anywhere on that path. **Loading the exposed module
therefore downloads and parses the whole fallback payload, every time, even when
the host's singleton is the instance actually used.** Rev. 3 claimed these
chunks were "emitted but never fetched"; that was wrong, and it made §11's
step 13 unfalsifiable.

The two real options, corrected:

| Option                | Fallback transferred? | No host provider           | Provider present, version mismatch      |
| --------------------- | --------------------- | -------------------------- | --------------------------------------- |
| A. Keep fallbacks     | **yes, always**       | works (own copy)           | host's instance used, **silently**      |
| **B. `import: false`** | no                    | module unavailable         | host's instance used, **silently**      |

The right-hand column is the same for both, and it is worth being precise about
why. In the plugin's generated init code, an `import: false` share resolves as:

```js
const versions = shared?.[pkg]
const provider = versions && versions[Object.keys(versions)[0]]   // first provider
if (!provider) continue
```

**The first registered provider is taken with no semver comparison and no
warning.** `requiredVersion` is not consulted on this path. Neither option
detects a version skew — Rev. 4's "warns" was wrong (see the requirement below,
which is correspondingly weaker than Rev. 4 claimed).

Note also `if (!provider) continue` — with `import: false` and no provider,
nothing throws at init; the module is simply absent and the failure surfaces
later, at use. "Hard failure" is right in outcome, deferred in timing.

**This plan chooses B (`import: false`).** The reasoning:

- These apps exist to run inside Cytoscape Web. They import `cyweb/*`, so
  "works standalone" was never true for them — Option A only lets them
  self-supply *React*, not function. Rev. 3's "standalone run works" column
  overstated the benefit.
- The host provably wires the share scope (the §2 background doc's Stage 3, with
  an E2E asserting a single React across the boundary). The scenario Option A
  insures against is one the host already tests.
- The cost is not hypothetical: ~210 kB in a fixture sharing *two* packages.
  The four React/MUI apps, which also share MUI and Emotion, would carry
  substantially more,
  transferred on every app load, forever.

**Set `requiredVersion` explicitly anyway — but do not call it a safeguard.**
With `import: false` the plugin emits `requiredVersion: "*"` when the field is
omitted, so writing real ranges keeps the manifest honest and is what a future
plugin version (or an explicit check) would enforce. It is **metadata and
forward-compatibility, not validation**: as shown above, nothing compares it at
runtime today. If version skew must actually be rejected, that needs a separate
explicit check — a candidate for the §6.6 API-version work, not something this
field delivers for free.

#### Measured in Phase 4 on the real pilot

`project-template`, sharing all five packages, built both ways:

| | Browser JS | of which fallback chunks |
| --- | --- | --- |
| **A** — fallbacks kept | **800,753 B** | 715,226 B (MUI alone 674,087) |
| **B** — `import: false` (shipped) | **92,325 B** | 11,266 B |

**708 kB, or 8.7×.** The §5.7 estimate of ~210 kB came from a fixture sharing
two packages; an app that also shares MUI and Emotion pays far more, and pays
it on every load. B is settled.

**A and the payload gate cannot coexist.** Building with fallbacks enabled
fails §5.5's `noSharedPayload` immediately — `/node_modules/react/` is bundled
into the Emotion fallback chunk — because that is precisely what Option A
means. Choosing A would require deleting the gate as well, which removes the
only defence against §5.8's silent MUI duplication at the same time. The two
decisions are not independent, and this plan had treated them as if they were.

**Phase 4 confirms the choice with numbers**, not opinion: build the pilot both
ways, record transferred bytes for an app load in each, and confirm the
`import: false` build still mounts. If it does not, fall back to Option A and
record the measured cost as an accepted budget — but do not silently keep A on
the belief that its fallbacks are free.

### 5.8 `import: false` alone does **not** cover MUI — subpath imports bypass it

This is the trap that would have made §5.7 look done while achieving nothing for
MUI. The share block declares `@mui/material`; the app code writes

```ts
import Box from '@mui/material/Box'
```

**90 such imports across 22 files** in the five apps today, against exactly
**one** root-barrel import (`network-workflows`'s Jupyter panel; a second lived
in the now-deleted `patterns/`). The plugin resolves share keys through `matchesSharedSource`:

```js
function matchesSharedSource(source, key) {
  const keyBase = key.endsWith('/') ? key.slice(0, -1) : key
  if (key.endsWith('/')) return source === keyBase || source.startsWith(`${keyBase}/`)
  if (getCommonSharedSubpaths(keyBase).includes(source)) return true
  return source === keyBase          // ← exact match
}
```

`COMMON_SHARED_SUBPATHS` covers only `react`, `react-dom` and `solid-js`. MUI is
not in it, so with the key `'@mui/material'` every `@mui/material/X` import
falls through to `source === keyBase` — **false** — and gets bundled locally.

Measured on a probe remote (MUI + Emotion + React shared, all `import: false`):

| Source style                          | Share key          | Exposed `App` chunk |
| ------------------------------------- | ------------------ | ------------------- |
| `import Box from '@mui/material/Box'`  | `'@mui/material'`  | **67.14 kB** — MUI and Emotion internals bundled |
| `import Box from '@mui/material/Box'`  | `'@mui/material/'` | 0.46 kB — nothing bundled |
| `import { Box, Alert, Stack } from '@mui/material'` | `'@mui/material'` | **0.58 kB** — nothing bundled |

React and ReactDOM were correctly excluded in every case (they are in
`COMMON_SHARED_SUBPATHS`), which is exactly why this defect hides: the singleton
everyone tests for works, and only MUI/Emotion silently duplicate.

#### Why the trailing-slash key is *not* the fix

Rows 2 and 3 both make the bundle small, but they are not equivalent, and the
bundle size is the wrong thing to measure. A trailing-slash key does not share
"the whole package": the plugin materializes a share entry per **subpath
actually referenced in that build**, and the runtime looks providers up by exact
key. So `@mui/material/Alert` is only available to a remote if the **host**
imports `@mui/material/Alert` too.

It does not. Comparing the two repositories:

- Apps import **20 distinct MUI subpaths**.
- The host imports 38, but **9 of the apps' 20 are not among them**:
  `Alert`, `Chip`, `Divider`, `Snackbar`, `Stack`, `Table`, `TableBody`,
  `TableCell`, `TableRow`.

Under the trailing-slash scheme those nine resolve no provider, and per §5.7 a
missing provider with `import: false` fails **at use, not at load**. Worse for
this plan specifically: `project-template` — the Phase 4 pilot — uses only `Box`
and `Typography`, both of which the host does import. **The pilot would pass and
the later apps would fail**, which is the worst possible shape for a staged
migration.

Making it work would require the host to maintain an explicit registry of every
subpath any app might use, and to materialize them whether it needs them or
not — a permanent coupling between the host's imports and every third-party
app's imports. That is not a contract worth having.

#### The fix: root-barrel imports, exact share key

```ts
import { Box, Alert, Stack } from '@mui/material'
```

with `'@mui/material'` (no slash) on **both** sides — the key both host and
remote already agree on. Row 3 above measures it: **0.58 kB**, using `Alert` and
`Stack`, the exact subpaths the host does not import. Nothing is bundled,
because the shared module is the barrel itself.

- **No host change** beyond §6.3's descriptor. `FEDERATION_SHARED_SINGLETONS`
  stays as it is.
- **The barrel-bloat objection does not apply.** It is the usual argument
  against root imports, but with `import: false` the remote bundles no MUI at
  all — there is nothing for tree-shaking to trim.
- **Cost: 90 import rewrites across 22 files.** Mechanical, and it lands per app
  in Phases 4–6 with that app's migration.

Add a lint or CI grep banning `from '@mui/material/'` in app sources, so the
convention does not decay — the failure it prevents is invisible until an app
uses a subpath the host happens not to.

#### `@mui/icons-material` is not supported — ban it too

No example imports an icon today, and the rule should be written down before one
does. Measured on the probe, adding a single

```ts
import HomeIcon from '@mui/icons-material/Home'
```

took the exposed chunk from **0.58 kB to 148.7 kB**, with MUI and Emotion
internals inside it. `@mui/icons-material` is a separate package that the host
does not share at all, and each icon pulls `@mui/material/SvgIcon` and the
Emotion styling engine in behind it — the §5.8 problem again, one package
further out.

Supporting icons would need its own share/provider design (the host adding
`@mui/icons-material` to `FEDERATION_SHARED_SINGLETONS`, with the same
root-vs-subpath question). Out of scope here. Until then: **the same lint bans
`@mui/icons-material`**, the §11.0 build gate catches it if the lint is
bypassed, and `project-template` says so in a comment. Apps needing an icon can
inline an SVG.

**And verify on payload, not on config (§11.0).** A share block that *looks*
correct is the failure mode in every variant here; only "no MUI/Emotion module
in the remote's chunks" catches it.

## 6. Runtime host resolution — removing the hardcoded host URL

### 6.1 What is wrong with the build-time switch

Every app today hardcodes both host URLs and picks between them with a build
flag:

```js
const cywebUrl = isProduction
  ? 'cyweb@https://web.cytoscape.org/remoteEntry.js'
  : 'cyweb@http://localhost:5500/remoteEntry.js'
```

Consequences:

- **An app artifact is bound to one host deployment.** The GitHub Pages builds
  are production builds, so only `web.cytoscape.org` can load them. They cannot
  be exercised against a Netlify branch preview
  (`<branch>--incredible-meringue-aa83b1.netlify.app`), a self-hosted instance,
  or a colleague's local host.
- **Two builds per app that differ by one string** (`build` / `build-dev`).
- **Third-party developers inherit the problem.** A published app has to be
  rebuilt and redeployed to work against any host but the one it was compiled
  for — a poor contract for a plugin ecosystem.

The `remotes` block is being rewritten anyway (§5.1), so this is the moment to
fix it.

### 6.2 Where the URL should come from

A remote's `remoteEntry.js` is imported **by the host, into the host's page**.
The host therefore knows its own entry URL exactly and can hand it over.
Deriving it on the remote side instead (`window.location.origin +
'/remoteEntry.js'`) would be a guess: the host's `base` comes from
`config.json`'s `urlBaseName`, so the entry is not necessarily at the origin
root. A guess that misses fetches a 404 — or, worse, a *second* copy of the host
container under a different URL.

So: **the host publishes, the remote reads.**

### 6.3 Host-side change (`cytoscape-web`)

The central host-side change — see the header for the full Phase 2 list. In
`cytoscape-web/src/boot/bootstrap.tsx`, publish the entry URL **synchronously**
in the boot chunk:

The descriptor is a **typed, readonly, page-lifetime-immutable** value — not an
`any` cast. Declare it next to the federation constants it derives from:

```ts
// cytoscape-web/src/app-api/federation/hostDescriptor.ts
export const APP_API_VERSION = '1.0'

/**
 * Contract published to federated apps at boot. Immutable for the lifetime of
 * the page: once a remote has loaded, the MF runtime caches its Module against
 * the remoteInfo it was created with, so a later change here would not reach
 * an already-loaded app anyway (see §6.4).
 */
export interface CyWebHostDescriptor {
  /** Always 'cyweb'. Narrowed to a literal so consumers can check it and so
   *  the field means something — a `string` here is decoration nobody reads. */
  readonly name: 'cyweb'
  readonly remoteEntry: string
  readonly apiVersion: string
}

declare global {
  interface Window {
    readonly __CYWEB_HOST__?: CyWebHostDescriptor
  }
}
```

Both the URL construction and the installation live in `hostDescriptor.ts` as
functions, and `bootstrap.tsx` is one call. Rev. 13 showed the
`Object.defineProperty` inline in `bootstrap.tsx`; that version of the
immutability contract is **not unit-testable**, because importing
`bootstrap.tsx` runs the entire boot. Taking a `target` parameter fixes that at
no cost — it is the same reasoning that made the URL construction a pure helper
in the first place:

```ts
// cytoscape-web/src/app-api/federation/hostDescriptor.ts
export const buildHostRemoteEntryUrl = (
  base: string,
  href: string,
  filename: string,
): string => new URL(`${base}${filename}`, href).href

/**
 * Installs the descriptor on `target` as a frozen, non-writable,
 * non-configurable property. Takes `target` rather than reaching for `window`
 * so the immutability contract — the part a remote depends on, and the part
 * nothing else would notice breaking — is assertable from a unit test.
 * bootstrap.tsx passes the real `window`; the test passes a plain object.
 */
export const publishHostDescriptor = (
  target: object,
  base: string,
  href: string,
): void => {
  Object.defineProperty(target, '__CYWEB_HOST__', {
    value: Object.freeze({
      name: FEDERATION_NAME,
      remoteEntry: buildHostRemoteEntryUrl(base, href, FEDERATION_FILENAME),
      apiVersion: APP_API_VERSION,
    }) satisfies CyWebHostDescriptor,
    writable: false,
    configurable: false,
  })
}
```

Called **synchronously** at boot-chunk top level
(`cytoscape-web/src/boot/bootstrap.tsx`) — a remote's `beforeInit` hook is sync
and must never lose a race with this:

```ts
publishHostDescriptor(window, import.meta.env.BASE_URL, window.location.href)
```

`FEDERATION_NAME` / `FEDERATION_FILENAME` come from the existing
`src/app-api/federation/federationExposes.ts`, so the global cannot drift from
what the build actually emits. `import.meta.env.BASE_URL` is Vite's resolved
`base` — the same value `vite.config.ts` already derives from
`config.urlBaseName`.

Freezing is not ceremony: §6.4 explains why a *mutable* descriptor would promise
something the MF runtime cannot deliver.

This must **not** be folded into `window.CyWebApi`: that object is assigned from
an async `import()` and consumers are gated behind the `cywebapi:ready` event —
far too late, and the wrong shape for a synchronous hook.

`FEDERATION_SHARED_SINGLETONS` needs **no change** — §5.8 settles on the exact
keys the host already declares, which is one of the reasons that option won.

The host must, however, **declare `@module-federation/runtime` as a direct
dependency**. `ExternalComponent.tsx` already imports `registerRemotes` /
`loadRemote` from it by name while `package.json` still gets it transitively
through `@module-federation/vite` — the same latent break §7.1 fixes on the
examples side.

**No trust boundary is added.** The remote is already executing inside the
host's page; the host can rewrite anything the remote does regardless. Reading
one string from a host-owned global changes nothing about who trusts whom.

### 6.4 Remote-side change (this repo)

`@module-federation/vite` types `entry` as a plain `string` — there is no
build-time hook for a dynamic value. The runtime mechanism is a **Module
Federation runtime plugin**: `beforeInit` is a sync waterfall over the instance
options and runs before any remote is resolved.

#### Which array to write — the non-obvious part

`beforeInit` receives **two** remote lists, and writing the wrong one is a
silent no-op. From `runtime-core` 2.5.1, `ModuleFederation.formatOptions`:

```js
const { userOptions: userOptionsRes, options: globalOptionsRes } =
  this.hooks.lifecycle.beforeInit.emit({ origin: this, userOptions, options: globalOptions, shareInfo: shared })
const remotes = this.remoteHandler.formatAndRegisterRemote(globalOptionsRes, userOptionsRes)
```

and `formatAndRegisterRemote` (`remote/index.js`):

```js
formatAndRegisterRemote(globalOptions, userOptions) {
  return (userOptions.remotes || []).reduce((res, remote) => {
    this.registerRemote(remote, res, { force: false })
    return res
  }, globalOptions.remotes)
}
```

So on **first init** the declared remotes arrive in `args.userOptions.remotes`,
while `args.options.remotes` (the global accumulator) is still empty — mutating
it changes nothing and the app loads from the fallback URL. On **re-init** the
opposite holds: `options.remotes` already contains `cyweb`, and because
`registerRemote` is called with `force: false` the `userOptions` copy is
ignored. **Both must be handled.**

The sentinel lives in its own dependency-free module so `vite.config.ts`
(Node) and the runtime plugin (browser) share one definition:

```ts
// src/cywebHostSentinel.ts
/** Entry value a production build ships when no host descriptor is available. */
export const CYWEB_HOST_REQUIRED = 'cyweb:__CYWEB_HOST_REQUIRED__'
```

The production plugin deliberately **does not import types from
`@module-federation/runtime`**. That package's declarations reach
`@module-federation/sdk`, whose `ModuleFederationPlugin.d.ts` does
`import webpack from "webpack"` — so a `import type { ModuleFederationRuntimePlugin }`
here would make `tsc` fail with `TS2307: Cannot find module 'webpack'` the
moment Phase 7 uninstalls Webpack. Since the app tsconfig deliberately keeps
`skipLibCheck: false` (§7.4), a minimal local structural type is the way to keep
both properties:

```ts
// src/mfRuntimePlugin.ts
import { CYWEB_HOST_REQUIRED } from './cywebHostSentinel'

// Structural subset of the MF runtime plugin contract. Declared locally rather
// than imported from @module-federation/runtime: that package's types pull in
// `webpack`, which this repo does not depend on after Phase 7 (§7.4).
type RemoteEntryRecord = { name?: string; entry?: string }
type BeforeInitArgs = {
  userOptions: { remotes?: RemoteEntryRecord[] }
  options: { remotes?: RemoteEntryRecord[] }
}
type MfRuntimePlugin = {
  name: string
  // GENERIC pass-through, not `(args: BeforeInitArgs) => BeforeInitArgs`. The
  // real hook is a SyncWaterfallHook over `{userOptions, options, origin,
  // shareInfo}`; a signature that returns the narrowed type drops `origin` and
  // `shareInfo` and is not assignable (TS2322) when the plugin is handed to a
  // real ModuleFederation instance in the test.
  beforeInit: <T extends BeforeInitArgs>(args: T) => T
}

const HOST_REMOTE_NAME = 'cyweb'

/**
 * The host's entry URL, or undefined if the descriptor cannot be used for
 * routing. Validates the two fields routing depends on — `name` identifies the
 * descriptor as Cytoscape Web's, and an empty or relative `remoteEntry` is as
 * wrong as a missing one. `apiVersion` is deliberately NOT checked here; acting
 * on it is §6.6's deferred work.
 */
const readHostEntry = (): string | undefined => {
  const descriptor = (
    globalThis as { __CYWEB_HOST__?: { name?: unknown; remoteEntry?: unknown } }
  ).__CYWEB_HOST__
  if (descriptor?.name !== HOST_REMOTE_NAME) return undefined

  const value = descriptor.remoteEntry
  if (typeof value !== 'string' || value === '') return undefined
  try {
    // Absolute only: `new URL(relative)` throws, so this rejects relative
    // paths as well as non-HTTP schemes.
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

/**
 * Resolves the `cyweb` host entry at runtime instead of build time.
 *
 * The host publishes its own remoteEntry.js URL on `window.__CYWEB_HOST__`
 * during boot; this replaces the compiled-in placeholder with it. Effect: one
 * build of this app works against any Cytoscape Web deployment — production, a
 * Netlify branch preview, or a local host on any port.
 *
 * When the descriptor is missing or malformed, behavior depends on what the
 * build compiled in: a dev build keeps its localhost entry, a production build
 * carries the sentinel and fails loudly here. It must never silently fall back
 * to a localhost URL in production — that would send a deployed app at the end
 * user's own loopback address.
 */
export default function cywebHostResolver(): MfRuntimePlugin {
  return {
    name: 'cyweb-host-resolver',
    beforeInit(args) {
      const hostEntry = readHostEntry()

      // userOptions.remotes is what formatAndRegisterRemote actually reads on
      // first init; options.remotes is the already-registered set consulted on
      // re-init (registerRemote uses force:false, so it wins there). Writing
      // only one of the two works in exactly one of the two cases.
      for (const list of [args.userOptions.remotes, args.options.remotes]) {
        for (const remote of list ?? []) {
          if (remote.name !== HOST_REMOTE_NAME || !('entry' in remote)) continue

          if (hostEntry !== undefined) {
            remote.entry = hostEntry
          } else if (remote.entry === CYWEB_HOST_REQUIRED) {
            throw new Error(
              `[cyweb-host-resolver] This app must be loaded by Cytoscape Web: ` +
                `window.__CYWEB_HOST__ is missing or invalid. The host ` +
                `publishes it at boot; a host that predates it cannot load ` +
                `this app.`,
            )
          }
          // else: dev build, compiled-in localhost entry stands.
        }
      }
      return args
    },
  }
}
```

The sentinel is the mechanism that makes §11 step 10 testable and keeps the
production artifact free of `localhost:5500` — the verifier (§11.0) asserts that
string does not appear in a production `dist/`, and a unit test pins the error
message.

#### The rewrite is bounded to *pre-load* — say so

Writing both arrays covers registration, not retroactive redirection. Once a
remote has been loaded, `RemoteHandler` caches a `Module` in
`host.moduleCache`, keyed by `remote.name`, holding the `remoteInfo` it was
built with. Rewriting the registry afterwards does not move an
already-loaded remote to a new URL.

So the contract is deliberately narrow, and §6.3 enforces it: **the descriptor
is frozen and published before any remote initializes.** "Re-init support" here
means only "the second `init()` call in a page still resolves to the right
URL" — not "the host can relocate itself at runtime". Do not document it as the
latter.

#### Fallback URL policy

`http://localhost:5500/remoteEntry.js` is a *developer's* default and must not
be shipped. On a host that predates §6.3, a deployed app carrying it would
attempt a connection to the **end user's own loopback address** — at best a
confusing failure, at worst a surprising local request. The options were:

1. **Fail loudly** on an absent descriptor, with a message that names the cause.
2. **Relative best-effort** (`'/remoteEntry.js'`) — works for a root-deployed
   host, silently wrong for a based one.
3. Keep `localhost:5500` **only in `vite serve`**, never in `vite build`.

**This plan takes (1) and (3) together**, and they are implemented, not merely
asserted: §5.5 emits the sentinel for `command !== 'serve'`, and the plugin
above throws when it sees the sentinel with no descriptor. Rev. 2 and Rev. 3
stated this policy while their example code still hardcoded localhost
unconditionally — the gap that this revision closes.

The `remotes` entry itself cannot be dropped even though its value is now a
placeholder: the build-time declaration is what tells the plugin to rewrite
`import … from 'cyweb/NetworkApi'` into a federation call at all. Only the
`entry` string is deferred to runtime.

#### Unit test — required, with a runner

Assert the first-init path (empty `options.remotes`, populated
`userOptions.remotes`) against a **real `ModuleFederation` instance**, not a
hand-built args object: the bug being guarded against is precisely a mismatch
with the runtime's internals, so a mock would have reproduced Rev. 1's error.
Cover:

1. **First init** — populated `userOptions.remotes`, empty `options.remotes`;
   the entry is replaced. (The Rev. 1 defect.)
2. **Re-init** — populated `options.remotes`; the entry is replaced there too.
   Rev. 4 required this path in prose but did not test it, which is how the
   first-init case got missed in the first place.
3. **Descriptor absent, dev build** — localhost entry; left untouched.
4. **Malformed descriptor, production build** — a parameterized case over every
   rejection `readHostEntry` implements, each expected to throw with the pinned
   message: descriptor absent; `name` missing; `name` not `'cyweb'`;
   `remoteEntry` empty; `remoteEntry` relative (`/remoteEntry.js`);
   `remoteEntry` non-HTTP (`file:`, `data:`). Rev. 6 added the validation but
   tested only the absent case — the other five branches were unexercised.

This repository has **no test runner today**. Adopt **Vitest** (matching the
host, so one idiom across both repos): add it to the root `devDependencies`
(§7.1), give each app `"test": "vitest run"` (§7.2), and run it in the PR CI
(§8). Making this a Phase 4 exit criterion is the point — "worth writing" is how
a test does not get written.

### 6.5 What this removes

- The `isProduction` / `env.production` branch disappears from every config,
  along with both URL constants.
- `build-dev` stops being a *different app*. Keep it only if an unminified build
  is useful for debugging, and describe it as such.
- §8's pipeline publishes one artifact per app that works against every host
  deployment.

The reverse direction needs no work: the host already resolves *app* URLs at
runtime by fetching `/apps.json`, so app addresses were never build-time
constants.

### 6.6 Deferred: version skew

One artifact meeting many hosts means an app can meet a host older or newer than
the API it was written against. `__CYWEB_HOST__.apiVersion` is published for
this and `CyApp.apiVersion` already exists on the app side, so the comparison is
available — but acting on it is **out of scope here**. It is an API governance
question, not a bundler one. Recorded so the field is not dropped when that
design happens.

## 7. Per-package changes

### 7.1 Root `package.json`

**Add** (Phase 3 — Webpack stays installed alongside until Phase 7):

| Package                        | Version                | Why                                     |
| ------------------------------ | ---------------------- | --------------------------------------- |
| `vite`                         | `8.0.13`               | Match the host exactly                  |
| `@module-federation/vite`      | `1.16.8`               | Match the host exactly                  |
| `@module-federation/runtime`   | `2.5.1`                | §6.4 imports from it **by name**        |
| `@vitejs/plugin-react`         | match host (`^5.0.0`)  | React apps only                         |
| `@types/node`                  | pin explicitly         | See below — currently only transitive   |
| `vitest`                       | match host (`^4.1.8`)  | §6.4's runtime-plugin test; no runner exists today |
| `@playwright/test`             | match host (`1.61.0`)  | The §8 production preflight and §11 step 14 smoke — both need a real browser; not currently a dependency of this repo |

`@module-federation/runtime` resolves transitively through
`@module-federation/vite` today, and `@types/node` only through
`webpack-dev-server`. Both are load-bearing after this migration and both
disappear or float on an unrelated bump if left undeclared. `2.5.1` is the
version this plan's §6.4 was verified against; changing it means re-verifying
`formatOptions`/`formatAndRegisterRemote`, which is exactly the code the plugin
depends on.

**Remove — in Phase 7 only, never earlier**: `webpack`, `webpack-cli`,
`webpack-dev-server`, `ts-loader`, `clean-webpack-plugin`. Removing these while
any app's `build` script still invokes `webpack` breaks that app's build; §12
sequences this.

**`peerDependencies` must be migrated, not deleted.** The root block is the
repository's **only direct declaration of `@mui/material`** — every app resolves
MUI through it today. Dropping it after §5.6 stops reading it would leave MUI
undeclared everywhere. Move `@mui/material`, `react`, and `react-dom` into the
per-app dependency sets (§7.3) *before* touching the root block.

**`@cytoscape-web/api-types` was a live mismatch, not a hypothetical one.** The
root declared `^1.0.0-beta.2` and the host publishes `1.0.0-beta.3` — and while
that range *would* admit `beta.3`, `package-lock.json` resolved
`api-types-1.0.0-beta.2.tgz`. The repo was therefore compiling against
one-version-old declarations. **Fixed in Phase 1:** the range is
`^1.0.0-beta.3` and the lockfile was regenerated and committed; a range change
alone would not have moved it. All five Webpack builds still pass against the
new declarations.

Scripts: `dev`, `build`, `clean`, `deploy`, `copy-dist` keep their shape. Add a
repo-wide `typecheck` (`npm run typecheck --workspaces`) to replace the type
safety `ts-loader` was providing (§7.4), and
`npm run test --workspaces --if-present` so a migrated app joins the CI test
scope by gaining a `test` script — no workflow edit, nothing to forget.

### 7.2 Per-app `package.json`

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.test.json",
    "test": "vitest run"
  }
}
```

`typecheck` runs **all three** configs — §7.4 splits app sources, build tooling
and tests, because only the app config can afford `skipLibCheck: false`. A
single `tsc --noEmit` would also leave `vite.config.ts` unchecked, which is
where the §6.4 wiring lives.

`build-dev` is **dropped**. It existed to produce a build pointed at the local
host; with §6 that distinction no longer exists and one `build` serves every
target. Reintroduce it only if an unminified artifact is wanted for debugging —
in which case name it for that (`build:debug`), not for an environment.

The `--open /remoteEntry.js` in today's `dev` scripts opened a browser tab on a
JS file. Drop it; the useful signal is the port banner Vite prints.

### 7.3 New files, and self-contained dependencies

New per app:

- `vite.config.ts` (from the §5.5 template, with that app's name/port/exposes)
- `src/mfRuntimePlugin.ts` and `src/cywebHostSentinel.ts` (from §6.4 —
  identical in every app)
- `test/mfRuntimePlugin.test.ts` — **outside `src/`**, deliberately: it imports
  the real MF runtime, whose types need `skipLibCheck`, and the app tsconfig
  keeps that off (§7.4)
- `index.html` (from §5.3)
- **Delete** `webpack.config.js` (per app, as that app migrates — see §12)

**Each app must also declare its own dependencies.** Today they declare none and
rely on hoisting from the monorepo root (§3). That is invisible inside the
workspace and fatal outside it: `project-template` is documented as "copy this
directory to start an app", and a copy of it does not install. Every app —
`project-template` above all — gets explicit entries:

**React/MUI apps** (`project-template`, `hello-world`, `network-workflows`,
`claude-bridge`):

```jsonc
{
  "dependencies": {
    // whatever the app's own source imports beyond the shared singletons
  },
  "peerDependencies": {
    // host-provided singletons — with `import: false` (§5.7) these are
    // genuinely peers: the app never bundles them.
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@mui/material": "^5.18.0",
    "@emotion/react": "^11.10.4",
    "@emotion/styled": "^11.10.4"
  },
  "devDependencies": {
    "@cytoscape-web/api-types": "1.0.0-beta.3",
    "@module-federation/runtime": "2.5.1",
    "@module-federation/vite": "1.16.8",
    "@types/node": "^24.0.0",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^5.0.0",
    "typescript": "^5.6.2",
    "vite": "8.0.13",
    "vitest": "^4.1.8"
  },
  "engines": { "node": ">=24.0.0" }
}
```

Concrete versions, not placeholders — a template whose `package.json` says
`"…"` does not install, and §7.3's whole point is that the template works when
copied out. Re-pin `@cytoscape-web/api-types` whenever the host publishes.
`engines` belongs in the template too, not only at the repo root (§8).

**`network-statistics` is not a React app** — no `react()` plugin, no MUI or
Emotion peers, and its `shared` block covers only what it imports (§5.5). It
still needs **`@types/react` in `devDependencies`**: the published
`@cytoscape-web/api-types` declarations reference React types, so `tsc` cannot
resolve them without it. Do not "clean that up" — it is a property of the API
surface, not of this app.

Per §5.7 the `requiredVersion` values are written **explicitly in
`vite.config.ts`**'s `CONFIGURED_SHARED`, not inferred, so a lockfile refresh no longer silently moves
the declared range. The `peerDependencies` above should agree with them; keep
the two in step. ("Declared", not "negotiated" — §5.7: nothing compares these at
runtime.)

**Completion criterion for `project-template`** (§11 step 12): copy the
directory outside the monorepo — a **clean copy excluding `node_modules/` and
`dist/`**, or the test passes on hoisted leftovers — then
`npm install` → `npm run typecheck` → `npm test` → `npm run build`. All four
must succeed with no reference to `../node_modules` or `../package.json`. If
this test is not in the plan, the template's stated purpose is not actually
delivered.

### 7.4 `tsconfig.json` — type checking must be restored explicitly

`ts-loader` type-checked on every build. Vite transpiles without checking, so
**a migration that only swaps configs silently removes type checking from CI.**
Each app gets a `typecheck` script (§7.2), wired into the CI job (§8).

The tsconfigs also need Vite-appropriate options:

| Change                                        | Why                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `"moduleResolution": "node"` → `"bundler"`     | Matches how Vite actually resolves; required for `exports`-map packages |
| add `"isolatedModules": true`                  | esbuild/Oxc transpile file-by-file; catches unsupported constructs      |
| add `"noEmit": true`, drop `"outDir"`          | `tsc` is now a checker, not a builder                                   |
| add `"lib": ["ESNext", "DOM", "DOM.Iterable"]` | Adds the DOM libs; `ESNext` **matches** the implicit default for `target: ESNext` — writing `ES2022` here would silently narrow the available type surface |
| **delete `"typeRoots"`**                       | See below — it is actively wrong today                                  |

**`typeRoots` must go.** Every app sets
`"typeRoots": ["./node_modules/@types"]`, but no app has a local
`node_modules/` — everything hoists to the root. The setting therefore points at
a directory that does not exist, which silently costs nothing *until* something
needs an ambient package: adding `"types": ["node"]` on top of it yields

```
TS2688: Cannot find type definition file for 'node'
```

in every app. Deleting `typeRoots` restores TypeScript's default upward search
and fixes it. (Once §7.3 gives each app real dependencies, a local
`node_modules/` may reappear — the default search handles that too, which is
the point of removing the override rather than repointing it.)

**Three tsconfigs per app — this is the specified layout, not an alternative.**
The current `include: ["src/**/*"]` leaves `vite.config.ts` unchecked entirely,
and that file is where §6.4's `runtimePlugins` wiring lives. A single config
cannot serve both halves cleanly: the app half wants DOM libs and no Node
types, the config half needs `@types/node` and `import.meta.url`.

```jsonc
// tsconfig.json — application sources
{
  "include": ["src/**/*"],
  "compilerOptions": {
    "noEmit": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ESNext",
    "jsx": "react-jsx",
    "isolatedModules": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "resolveJsonModule": true,
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "types": ["@cytoscape-web/api-types"]
  }
}
```

```jsonc
// tsconfig.node.json — build tooling
{
  "include": ["vite.config.ts"],
  "compilerOptions": {
    "noEmit": true,
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ESNext",
    "types": ["node"],
    // REQUIRED. @module-federation/sdk's type definitions do
    // `import webpack from "webpack"` (ModuleFederationPlugin.d.ts), reached
    // here through @module-federation/vite. It resolves today only because the
    // repo still has a Webpack dependency — after Phase 7 it becomes TS2307.
    "skipLibCheck": true
  }
}
```

plus `tsconfig.test.json` (same shape as the Node config, `include: ["test/**/*"]`),
and `"typecheck"` running all three — see §7.2.

**The API-types reference must change too.** Today every app reaches the
declarations with

```jsonc
"files": ["../node_modules/@cytoscape-web/api-types/index.d.ts"]
```

— a hard path into the monorepo root, which is exactly what §7.3's standalone
criterion forbids. Replace it with package-name resolution:
`"types": ["@cytoscape-web/api-types"]` above, which works identically inside
the workspace (hoisted) and in a standalone copy (local `node_modules`). If that
does not pull in the `cyweb/*` ambient block, a one-line
`src/cyweb.d.ts` containing
`/// <reference types="@cytoscape-web/api-types" />` is the fallback — still
package-relative, still copy-safe. Verify which is needed in Phase 4, in **both**
the workspace and the standalone copy.

**`typeRoots` deletion is required regardless** of which of the two shapes
above is used.

**Three configs, and `skipLibCheck` in exactly two of them.**

The `webpack` type dependency is not confined to the Node config. The chain is

```
@module-federation/runtime → runtime-core → @module-federation/sdk
  → types/plugins/ModuleFederationPlugin.d.ts → import webpack from "webpack"
```

so **any** file importing from `@module-federation/runtime` drags it in — the
Node config via `@module-federation/vite`, and anything under `src/` that
imports the runtime's types. Rev. 5 put `skipLibCheck` only on the Node config
and would have broken the app config at Phase 7.

The layout that keeps the api-types check while surviving Webpack removal:

| Config               | Covers                                  | `skipLibCheck` |
| -------------------- | --------------------------------------- | -------------- |
| `tsconfig.json`      | `src/**/*` (app sources)                | **false**      |
| `tsconfig.node.json` | `vite.config.ts`                        | true           |
| `tsconfig.test.json` | `test/**/*` (the §6.4 runtime test)     | true           |

Two rules make the first column hold:

1. **`src/mfRuntimePlugin.ts` declares its own structural type** instead of
   importing `ModuleFederationRuntimePlugin` (§6.4). Nothing under `src/` then
   references the MF runtime's types at all.
2. **The real-`ModuleFederation` unit test lives outside `src/`** — it must
   import the runtime for real, so it needs `skipLibCheck`, and putting it under
   `src/` would force that flag onto the app config.

`typecheck` therefore runs all three (§7.2).

**Why `skipLibCheck: false` on the app config is worth this trouble:** this
repo's job includes catching breakage in `@cytoscape-web/api-types` — a
hand-maintained declaration bundle whose `mf-declarations.d.ts` is written by
hand. `skipLibCheck` would stop checking that file's internals, which is
precisely the thing worth checking here. (It would *not* hide errors in app code
that misuses the API — that check is unaffected either way. The loss is narrower
than it is often described, but it is a real loss in this repo.)

### 7.5 `patterns/` — deleted

Rev. 1 recommended adopting `patterns/`. The defect list in §3 changed that
conclusion: it exposed a module path that did not exist, its app id did not
match its federation name (so the host would reject it on load), it used the
pre-`resources` API shape, and its port collided with `project-template`.
Nothing about it worked, and nobody built it — "migrating" it would have meant
writing a new app under an old directory name.

**Decision (Phase 1, 8/1/2026): deleted.** Taken before any migration work
depended on knowing what it is. If its content is wanted, it should return as a
new example built from the migrated `project-template`, on its own schedule.
Deciding this early mattered: it is the difference between five apps to migrate
and six. The directory and its untracked `dist/` are gone; the git history
retains it.

### 7.6 Webpack-specific runtime code in app sources

Swapping configs is not sufficient — one app reads a **Webpack-injected
global** in application code.
[`hello-world/src/components/HelloHeader.tsx`](../../../hello-world/src/components/HelloHeader.tsx)
declares and reads it at module scope:

```ts
declare const __webpack_public_path__: string
const moduleServerUrl = __webpack_public_path__
```

The hand-written `declare const` means **TypeScript and the bundler both stay
silent**; under Vite this fails at runtime with a `ReferenceError` the first time
the module is evaluated — i.e. when the panel is opened, not when it is built.
The `typecheck` and `build` gates in §11 would both pass.

It is the only such occurrence in the repository (verified by grep for
`__webpack`), but it is deliberately *pedagogical* — the surrounding comment
presents it as "Example 0", teaching plugin authors to read their own serving
URL. So it cannot simply be deleted without losing the lesson.

**There is no drop-in replacement, and the obvious one is wrong.** The component
renders `` `${moduleServerUrl}remoteEntry.js` `` as a link. Under Webpack,
`__webpack_public_path__` is the *container root*, so that concatenation
resolves. `new URL('.', import.meta.url).href` — the tempting ESM equivalent —
returns the **current chunk's** directory, which in a production Vite build is
`…/assets/`. The link would become `…/assets/remoteEntry.js`, a 404. Anything
that reconstructs the entry URL by string-appending to a chunk path is guessing.

Three honest options:

1. **Show `import.meta.url` for what it is** — "this component was served
   from &lt;chunk URL&gt;" — and drop the `remoteEntry.js` concatenation. The
   lesson becomes "how to find your own code at runtime", which is true and
   bundler-agnostic.
2. **Design a real source for the remote's own entry URL.** The MF runtime knows
   it (`remoteInfo.entry`); exposing it deliberately would be a small API, not a
   one-liner. Worth doing only if plugin authors actually need it.
3. **Remove the example.** Defensible: the value it demonstrated was largely a
   Webpack implementation detail.

**This plan takes (1)** — it preserves a working lesson at no design cost.
Choosing (2) is a separate API proposal and must not be smuggled into a bundler
migration.

Prose comments referencing Webpack in app sources (e.g. "injected by Webpack's
DefinePlugin", a few lines below the same file) are part of this cleanup too —
they are wrong after the migration, and they are what a plugin author reads
first.

**Generalize the check:** before declaring an app migrated, grep its sources for
`__webpack_`, `require.context`, `require.ensure`, and `process.env.NODE_ENV`
patterns that assume DefinePlugin. Only `__webpack_public_path__` exists today;
the grep is cheap and the failure mode is invisible until runtime.

## 8. Build & deploy pipeline

[`.github/workflows/deploy-pages.yml`](../../../.github/workflows/deploy-pages.yml)
copies each `dist/` into `docs/<app>/` and publishes to GitHub Pages.

**Canonical published URL:** `https://cytoscape.org/cytoscape-web-app-examples/`.
The host's `src/assets/apps.json` and this repo's `README.md` both use it; the
`cytoscape.github.io` form used in Rev. 1 of this document was wrong. Apps are
served from
`https://cytoscape.org/cytoscape-web-app-examples/<app>/remoteEntry.js`. Any
new entry — and §7.5's removal — must use the same origin, or the registry and
the deployment disagree.

**This keeps working unchanged** because `base` is left unset (§5.5):
`publicPath: 'auto'` makes chunk URLs resolve relative to `remoteEntry.js`'s
actual location, so the subpath deployment works. Leave it unset. (Rev. 2 said a
path-only `base` "would break cross-origin loading". That is not established —
Rolldown emits chunk-to-chunk imports as relative specifiers regardless, so a
`/foo/` base may well survive. The reason to leave it unset is that `'auto'` is
the documented parity with `output.publicPath: 'auto'` and needs no per-target
knowledge; a *fully absolute* base would work too but re-pins the artifact to
one deployment, which is what §6 exists to remove.)

Workflow changes:

1. **`node-version: '22'` → `'24'`** — the host declares `engines.node >= 24`,
   and Vite 8 / Rolldown is exercised on 24 there. Node 24 must be declared in
   more than the workflow: this repo has **no `engines` field and no `.nvmrc`**,
   and [`guides/getting-started.md`](../../../guides/getting-started.md) still tells
   plugin authors "Node.js 18+". All four must agree.
2. **Add `typecheck`, `build`, then verify — in that order.** The verifier reads
   `dist/`, so it cannot precede `build`; Rev. 2's phrasing implied otherwise.
3. Output shape changes from `dist/{remoteEntry.js, main.js, <id>.js}` to
   `dist/{remoteEntry.js, assets/*.js, index.html}` — **plus SSR artifacts
   nobody asked for.** Measured on a probe remote with a non-empty `remotes`
   block, the plugin auto-registers its SSR entry loader and emits
   `remoteEntry.ssr.js`, `assets/ssrEntryLoader-*.js` (11.7 kB) and
   `assets/module-runner-*.js` (52.8 kB). None of it runs in a browser (it is
   guarded by `typeof window === 'undefined'`), but all of it is published.

   **Reconfirmed in Phase 2** on the host's own E2E fixture, the moment a
   `remotes` block was added to it: `remoteEntry.ssr.js` 1.56 kB,
   `assets/ssrEntryLoader-*` 11.62 kB, `assets/module-runner-*` 52.78 kB, plus
   `assets/virtual_mf-exposes-ssr…` 0.78 kB. So this is a property of declaring
   *any* remote, not of the probe's particular shape — Decision B applies to
   every migrated app.

**Two decisions for Phase 4, both from measured output:**

**Decision A — SETTLED 8/4/2026: accept.** Measured on the pilot: **10 such
literals, all in `remoteEntry.js`** and none in any other browser chunk. The
deciding fact is *who builds the published artifact*. Pages builds run in
GitHub Actions, where the path is
`/home/runner/work/cytoscape-web-app-examples/cytoscape-web-app-examples/…` —
a fixed runner account and a repository name that is already public. Nothing
private is disclosed. A local `npm run deploy` would embed a developer's home
directory instead, so **publishing from a workstation is the case to avoid**;
the workflow is the normal path and it is safe. Stripping the literals was
rejected as a post-build rewrite of the plugin's own strings — a standing
breakage risk on every plugin upgrade, for no gain on the path that actually
publishes.

**Decision B — SETTLED 8/4/2026: do not publish.** Measured on the pilot:
`remoteEntry.ssr.js` (793 B), `assets/ssrEntryLoader-*` (4,978 B),
`assets/module-runner-*` (28,018 B) and `assets/virtual_mf-exposes-ssr*`
(375 B) — **34,164 B per app** of Node-only code that cannot execute in a
browser. `copy-dist` excludes them, and §11 step 9 was then run against the
published set: the app loads and mounts with them absent, which is the check
this decision required. `mf-manifest.json` and `mf-stats.json` are excluded on
the same reasoning — nothing fetches them at runtime, and they describe the
build machine.

Original framing, kept for the reasoning:

**Decision A — absolute build-machine paths inside the browser
`remoteEntry.js`.** The probe's `remoteEntry.js` contains strings like
`/home/<user>/…/node_modules/@emotion/react/dist/emotion-react.cjs`: the SSR
loader's resolved specifiers, embedded as dead string literals. Harmless to
execution, but it publishes the build machine's directory layout and username on
a public CDN. Options: accept, or strip them in a post-build/`generateBundle`
step. **Deleting the SSR files does not help** — these strings live in the
browser entry.

**Decision B — whether to publish the SSR files at all.** `remoteEntry.ssr.js`
plus its loader and module-runner chunks are ~64 kB of Node code per app that
can never execute in a browser. Excluding unreachable JavaScript from a
published artifact is good practice independent of Decision A. Verify before
excluding: the browser entry references the loader by name, even though the
reference is unreachable at runtime.

Keep these separate in the Phase 4 write-up and in §13 — Rev. 6 listed
SSR-exclusion as a remedy for the path leak, which it is not.

**`copy-dist` copies an approved *browser publish set*, not "whatever `dist/`
contains."** Those are different, and Rev. 8 said both. Record the pilot's real
output, then decide per artifact class what is published — and encode that
decision, so a future plugin version adding a file does not silently publish it:

**The policy is per `bundler`, or Phase 3 cannot ship.** A strict allowlist
applied repo-wide would reject every still-Webpack app's `dist/` — `main.js`,
`152.js`, `src_components_*.js` are none of the classes below — and Phase 3's
exit criterion is that `npm run deploy` still produces the same `docs/`. So:

- **`bundler: 'webpack'`** — replace-copy the whole `dist/`, no class check.
  The policy is unchanged from today; these apps are on their way out.
- **`bundler: 'vite'`** — the exhaustive table below, unknown files fatal.
- **Phase 7 deletes the Webpack branch** along with the toolchain.

For Vite apps the classes are **mutually exclusive and exhaustive**, matched in
no particular order, with **anything unmatched failing the copy**. Rev. 9's
table had `assets/*.js = yes` overlapping `ssrEntryLoader-*` and
`module-runner-*`, which live in `assets/` too — a precedence puzzle that
resolves differently depending on how someone writes the loop.

| Class (exclusive)                                          | Publish? |
| ---------------------------------------------------------- | -------- |
| `remoteEntry.js`                                            | yes      |
| `assets/**` except the SSR names below                      | yes      |
| `assets/ssrEntryLoader-*`, `assets/module-runner-*`, `remoteEntry.ssr.js`, `assets/virtual_mf-exposes-ssr*` | Decision B |
| `index.html` (the §5.3 stub)                                | harmless; decide once |
| `mf-manifest.json`, `mf-stats.json`                         | build artifact for the verifier — not published unless a runtime consumer needs it |
| `.vite/manifest.json`                                       | no |
| **anything else**                                           | **fail the build** — a future plugin version must not publish a new file class by default |

**Known benign warning.** With a correct `import: false` configuration, plugin
1.16.8 still prints

```
[Module Federation] Shared dependency "@emotion/styled" has import: false but is
not installed locally. Named imports … will not work in production builds.
```

on builds where the package *is* installed and no named import is used.
Reproduced on the probe. Do not treat plugin warnings as errors in CI on account
of it, and record it so the first implementer does not spend an afternoon on a
non-problem.

**Fix `copy-dist`, do not just re-point it.** The root script runs
`cp -r hello-world/dist docs/hello-world`. Because `docs/hello-world` already
exists, that **nests** the build as `docs/hello-world/dist/` instead of
replacing the directory, and leaves stale hashed assets from previous builds
alongside. The Pages workflow avoids this only because it `rm -rf`s the targets
first. Give the script the same delete-then-copy treatment — with content-hashed
filenames, stale leftovers accumulate silently and are served indefinitely.

**Put the app inventory in one machine-readable manifest.** App id, federation
name, port, expected exposes, expected shared set, and whether it is published
are currently spread across `workspaces`, the workflow, `copy-dist`,
`apps.local.json` and each `vite.config.ts` — and §8 already documents two of
them disagreeing. A single root manifest that CI, the §11.0 verifier and
`copy-dist` all read removes the whole class of drift.

`apps.manifest.json` at the repo root, one entry per app:

```jsonc
{
  "apps": [
    {
      "workspaceDir": "hello-world",      // npm workspace + source location
      "publishPath": "hello-world",       // docs/<publishPath>; often != id
      "federationName": "hello",          // MF container name; == CyApp.id
      "port": 2222,
      "bundler": "vite",                  // "webpack" until that app migrates
      "published": true,                  // copied into docs/ by deploy
      "exposes": ["./AppConfig", "./NetworkSummaryMenuItem"],
      // Required when published === true (§11 step 14). Discriminated on `kind`
      // so an app whose output is not a DOM node is still expressible.
      "smokeObservable": {
        "kind": "dom",                    // "dom" | "console"
        "setup": [                        // optional pre-actions, in order
          { "action": "openAppsMenu" }
        ],
        "selector": "[data-testid='hello-panel']"
        // kind: "console" instead takes  "pattern": "<regex>"
        // and may need  "network": "<fixture network to load first>"
      },
      "configuredShared": {               // full records, not a name list
        "react":            { "singleton": true, "import": false, "requiredVersion": "^18.3.1" },
        "react-dom":        { "singleton": true, "import": false, "requiredVersion": "^18.3.1" },
        "@mui/material":    { "singleton": true, "import": false, "requiredVersion": "^5.18.0" },
        "@emotion/react":   { "singleton": true, "import": false, "requiredVersion": "^11.10.4" },
        "@emotion/styled":  { "singleton": true, "import": false, "requiredVersion": "^11.10.4" }
      }
    }
  ]
}
```

Details that are easy to get wrong and expensive to discover:

- **`workspaceDir`, `publishPath` and `federationName` are three different
  strings.** `hello-world` is the directory and the publish path; `hello` is the
  federation name and the app id. A manifest with one "name" field cannot drive
  both `copy-dist` and the verifier.
- **`configuredShared` holds records, not names** — §11.0 compares `singleton`,
  `import` and `requiredVersion`, so the manifest has to carry them.
  `network-statistics` gets `{}`, stated explicitly. For **`bundler: 'vite'`
  apps only**, the loader also **cross-checks each `requiredVersion` against
  that app's `peerDependencies`** — they are written in two files by hand
  (§7.3) and nothing else would notice them diverging. It cannot apply earlier:
  no app declares `peerDependencies` until §7.3 lands for it, in Phases 4–6.

  The general rule: **`bundler` gates every check that presumes the migrated
  shape** — publish classes, peer cross-check, verifier, `check:imports` — and
  an app's `bundler` flip, its `peerDependencies`, and its `vite.config.ts`
  all land in one commit.
- **Membership in `apps` *is* the built set.** No separate `built` field: an app
  in the manifest is in `workspaces` and gets built. `published` then selects
  the subset that reaches `docs/`.
- **`bundler`** is what makes the CI scope rule (below) mechanical: an app joins
  the Vite-only jobs by flipping one field in the commit that migrates it,
  rather than by someone remembering to edit a workflow.

#### Measured: what `mf-manifest.json` actually contains

Built with the §5.5 canonical config on `@module-federation/vite` 1.16.8. §11.0's
verifier asserts against this, so it is recorded rather than inferred:

```jsonc
{
  "id": "probe", "name": "probe",                 // container name
  "metaData": {
    "remoteEntry": { "name": "remoteEntry.js", "path": "", "type": "module" },
    "globalName": "probe", "publicPath": "auto", "pluginVersion": "0.2.5"
  },
  "exposes": [{ "name": "AppConfig", "path": "./AppConfig" }],
  "shared":  [{ "name": "react", "version": "18.3.1", "singleton": true,
                "requiredVersion": "^18.3.1",
                "assets": { "js": {"async":[],"sync":[]}, "css": {…} } }],
  "remotes": [{ "federationContainerName": "cyweb:__CYWEB_HOST_REQUIRED__",
                "moduleName": "", "alias": "cyweb", "entry": "*" }],
  // from manifest.additionalData — top level, not under metaData
  "configuredShared": {…}, "configuredRemote": {…}, "configuredRuntimePlugins": […]
}
```

Four things follow, three of which contradict a reasonable guess:

- **`remotes[]` carries no `type`, and `federationContainerName` holds the
  *entry string*, not a container name.** So the native manifest cannot answer
  "is the `cyweb` remote `type: 'module'`?" — which is the single most important
  question §11.0 asks. `configuredRemote` is not belt-and-braces; it is the only
  source. Match on `remotes[].alias` if you need the native record.
- **`exposes[].path` is the `./Name` key**; `exposes[].name` drops the `./`.
- **`shared[].assets` is empty on a correct `import: false` build.** That is a
  real, cheap assertion that the fallbacks were not emitted (§5.7).
- **Effective shared gains `react/jsx-runtime` the moment JSX enters the module
  graph, and not before.** Measured both ways on the same probe: no JSX → five
  keys, exactly the configured set; one `.tsx` → six. This is precisely why the
  effective list cannot be compared for equality against the configured one, and
  why `DERIVED_SHARED_ALLOWLIST` is a named constant rather than a shrug.

#### Measured: the payload gate cannot be moved out of `generateBundle`

Rev. 6 moved payload verification into `generateBundle` (§5.5's
`noSharedPayload`). Phase 3 tried to *also* assert it post-hoc, from the built
files, and that is **not implementable** — it is wrong in both directions:

- **False positives.** The probe's `remoteEntry.js` contains six literal
  `/home/<user>/…/node_modules/@emotion/react/dist/emotion-react.cjs.js`
  strings — the SSR loader's resolved specifiers, embedded as dead string
  literals. §8 Decision A, reproduced here independently. A scan for
  `/node_modules/@mui/` flags a **correct** build.
- **False negatives.** Module paths do not survive minification, so a genuinely
  bundled MUI — the §5.8 subpath-import defect this is meant to catch — leaves
  no such string at all.

`generateBundle` inspects `chunk.modules` keys before minification, which is the
only place the question is answerable. The verifier asserts `shared[].assets`
emptiness instead, and says in its own comments that this is *not* the §5.8
gate.

#### Measured: §5.8 holds under the canonical config

The probe imports `import { Box, Typography } from '@mui/material'` with the
exact `'@mui/material'` share key and `import: false`. **No `assets/*.js` chunk
references `@mui` or `@emotion` at all.** The 60 kB chunk in the output is the
Module Federation runtime itself, not MUI. `check:imports` run against the
current sources finds **92** banned imports (§5.8 estimated ~90) — 79 in
`hello-world`, 3 each in `network-workflows` and `project-template`, 7 in
`claude-bridge`, 0 in `network-statistics`.

The canonical config also **builds as written**, which removes the largest
unknown from Phase 4.

**A manifest nobody reads is a fourth place to drift.** Phase 3 must also land
the tooling, or the schema above is decoration:

| Piece                    | Obligation                                                                 |
| ------------------------ | -------------------------------------------------------------------------- |
| `scripts/manifest.mjs`   | Loads and validates `apps.manifest.json`; every other consumer imports it   |
| `npm run copy-dist`      | Iterates `published === true`, deletes `docs/<publishPath>` then copies     |
| `deploy-pages.yml`       | Calls `npm run copy-dist` instead of its hardcoded `rm -rf` / `cp -r` lines |
| `npm run verify:federation` | Iterates `bundler === 'vite'`, reads `configuredShared` + `exposes`      |
| `npm run check:imports`  | Iterates `bundler === 'vite'`, scans `<workspaceDir>/src`                   |

Validations the loader performs, each guarding a failure that is silent
otherwise:

- **`workspaceDir` set equals the root `workspaces` set**, both directions — an
  app in one and not the other is built-but-unverified or verified-but-unbuilt.
- **`publishPath`, `federationName` and `port` are each unique.** `patterns`
  duplicated `project-template`'s port for months (§3).
- **`publishPath` is a single relative segment** — reject absolute paths and
  `..`, and assert the resolved delete target is inside `docs/`. `copy-dist`
  deletes directories; a manifest typo must not be able to delete something else.
- **`publishPath` must not collide with a reserved path**, and the check must be
  concrete. "Single segment inside `docs/`" is not sufficient: `docs/images` and
  `docs/data` are tracked static assets, so `publishPath: "images"` would delete
  them and still pass every check above. Reserved set: **`data`, `images`,
  `index.html`**. Also reject the empty string, `.`, `..`, and any value
  containing `/` or `\\`. Then assert on the resolved path:
  `dirname(resolved) === docsRoot && resolved !== docsRoot` — which rules out
  both "escapes `docs/`" and "*is* `docs/`".
- **`workspaceDir` is unique too**, not just `publishPath`/`federationName`/
  `port` — two entries pointing at one directory silently publish it twice.
- **Validate every entry before deleting anything, then stage.** Build into a
  temporary directory and swap, so a manifest error caught on entry four does
  not leave `docs/` half-emptied.
- **Strict JSON schema:** reject unknown fields, constrain `bundler` to the
  enum, reject duplicate `exposes` entries, and require `smokeObservable`
  whenever `published === true` — it is what §11 step 14 asserts, and an
  unknown-field-rejecting loader would otherwise make the field unusable. An unknown field is usually a
  typo in a known one, which otherwise silently takes its default.
- **A `published: false` app's `docs/<publishPath>` is removed if present**, so
  un-publishing an app actually un-publishes it rather than freezing its last
  build on the CDN forever. **Removing an app from the manifest entirely is an
  error**, not a cleanup trigger: an absent entry is indistinguishable from a
  typo, and inferring "delete its published output" from a missing line is how
  a rename silently unpublishes an app. To retire one, set `published: false`
  (which cleans up), leave the entry in place for a release, then delete it.

**Timing:** the *contents* of the built and published sets are decided in
Phase 1; the manifest and all of the above are implemented in Phase 3. Phase 7
then has nothing left to reconcile.

**"Built" and "published" are different sets — keep them explicit.** The
workflow copies four apps; `claude-bridge` is in `workspaces` (so `npm run
build` builds it) but was *not* copied to `docs/`, while the root `copy-dist`
script *did* copy it. The workflow and the script therefore disagreed.

**Decision (Phase 1, 8/1/2026):**

- **Built set = all five workspaces** — `hello-world`, `network-statistics`,
  `network-workflows`, `project-template`, `claude-bridge`. Unchanged.
- **Published set = four apps.** `claude-bridge` is `published: false`: it is a
  developer tool that talks to a local MCP bridge server, so a Pages copy could
  not function for a visitor. This matches `deploy-pages.yml` and the four
  directories actually tracked under `docs/` — it is the **`copy-dist` script
  that was wrong**, and the manifest rewrite (Phase 3) is what corrects it. Do
  not "fix" `copy-dist` by hand in the meantime; Phase 3's exit criterion is
  that `npm run deploy` produces the same `docs/` the workflow does, and
  dropping `claude-bridge` there is part of that rewrite.
- **Canonical published URL** confirmed as
  `https://cytoscape.org/cytoscape-web-app-examples/` (above). No change needed:
  the host's `apps.json`, this repo's `README.md` and `docs/index.html` already
  agree on it.

Note the published set is **not** the same as the host's registry:
`src/assets/apps.json` lists only three apps (`hello`, `networkWorkflows`,
`networkStatistics`). `project-template` is published to Pages as the
copy-paste starting point but deliberately not offered as an installable app.
That is a third set, and it stays out of the manifest.

**There is no PR CI in this repository at all** — `deploy-pages.yml` runs only
on push to `main`, so nothing checks a pull request. Adding a PR workflow is
part of Phase 3, with a fixed scope rule so it never has to be reasoned about
again:

| Job                  | Applies to                                       |
| -------------------- | ------------------------------------------------ |
| `check:imports`      | `bundler === 'vite'` apps only                    |
| `typecheck`          | **always all five apps**                          |
| `build` + verifier   | **always all five**; verifier step gated on `bundler === 'vite'` |
| `test` (Vitest)      | apps with a `test` script (`--if-present`)        |

`typecheck` and `build` work for a Webpack app and a Vite app alike, so they
have no reason to be staged. The verifier asserts an ESM `remoteEntry.js` and
would fail a Webpack bundle by construction (§12), so it reads `bundler` from
the manifest and skips the rest. All five are covered by every job at the end of
Phase 6, when the last `bundler` flips to `vite`.

**`build` and the verifier belong to the same job.** The verifier reads `dist/`,
which does not survive a job boundary. Either keep them as consecutive steps in
one job (simplest), or upload `dist/` as an artifact and download it in the
verify job. Do not write a workflow where a separate verify job silently
verifies nothing because `dist/` is absent.

**`check:imports` has to be a real script, and it cannot run repo-wide yet.**
§5.8 says "a lint bans `@mui/material/` and `@mui/icons-material`", but this
repo has **no `lint` script at all** today — `.eslintrc.json` exists and nothing
runs it. Two constraints on how it is built:

- **Scope it by `bundler`.** The 90 offending imports are still present until
  Phase 6; a repo-wide check added in Phase 3 fails CI immediately. It applies
  to an app in the same commit that rewrites that app's imports.
- **Match import/export specifiers, not raw text.** A bare grep for
  `@mui/material/` also hits comments, strings and this very document if the
  path is ever widened. Restrict it to `import`/`export … from '<specifier>'`
  (and dynamic `import('<specifier>')`) within each manifest entry's
  `workspaceDir/src`.

The `generateBundle` gate (§11.0) is the load-bearing defense either way;
`check:imports` exists to fail in one second with a clear message instead of in
the middle of a build.

**What §6 buys here:** the Pages artifacts stop being production-only. Today
they are compiled against `web.cytoscape.org` and cannot be loaded by anything
else; afterwards the same deployed build is loadable by a Netlify branch
preview, a self-hosted host, or a developer's `localhost:5500`. That makes the
published examples usable for testing host changes before release — which they
have never been.

**Release gate — and it needs a mechanism, not an intention.** §5.5 ships a
sentinel rather than a localhost fallback, so a migrated app on Pages is
unloadable by a host that predates §6.3. But `deploy-pages.yml` triggers on
**push to `main`**: "hold the deploy until the host is ready" is not something
anyone can do by deciding it. Pick one:

1. **Move the gate into Phase 2's exit criteria** — the phase is not done until
   `__CYWEB_HOST__` is live on `web.cytoscape.org` and smoke-checked there.
   Simplest, and it makes the dependency structural rather than procedural.
2. **A GitHub Environment with required reviewers** on the `deploy` job, so the
   publish waits for an explicit approval.
3. **A preflight step** in the workflow that loads the production host in a
   headless browser and asserts the *same* contract `readHostEntry()` enforces
   (§6.4) — otherwise the gate can pass on a descriptor the resolver rejects:

   - `window.__CYWEB_HOST__.name === 'cyweb'`
   - `remoteEntry` is an absolute `http(s)` URL
   - `apiVersion` is a non-empty string
   - `Object.isFrozen(window.__CYWEB_HOST__)` and the property is
     non-writable/non-configurable — §6.3 makes immutability part of the
     contract, so check it rather than assume it
   - `await import(remoteEntry)` yields `init` and `get` as functions

   **One contract, defined once.** The full assertion list above is *the*
   descriptor contract; §11 step 11, Phase 2's exit check and this preflight all
   run it. Everywhere else must **reference** it rather than restate a subset —
   Rev. 10 restated it three times and each copy lost items, which makes the
   weakest copy the real gate.

   **Two implementations, deliberately.** Phase 2 is a host-repo change, and the
   host already has Playwright; it verifies the contract there. This repo's
   `scripts/preflight-host.mjs` (`npm run preflight:host <url>`) arrives in
   Phase 3, when the deploy workflow needs it. Rev. 10 claimed "one
   implementation" while scheduling the runner a phase after the exit criterion
   that depends on it — the two are the same assertions, not the same file.

   **Runner:** Playwright, pinned to the host's `1.61.0` (§7.1), with an
   `npx playwright install --with-deps chromium` step in the workflow.

   **Wait, do not sample — and get the signature right.**
   `cytoscape-web/src/index.tsx` **dynamically imports** `./boot/bootstrap`, so
   the descriptor does not exist at `load`/`domcontentloaded`:

   ```js
   // waitForFunction(pageFunction, arg, options) — options is the THIRD
   // parameter. Passing { timeout } second makes it the page-function `arg`
   // and silently leaves the timeout at its default.
   await page.waitForFunction(
     () => window.__CYWEB_HOST__ !== undefined,
     undefined,
     { timeout: HOST_DESCRIPTOR_TIMEOUT_MS },
   )
   ```

   If a headless browser in the deploy workflow is unwanted, keep a string match
   but label it for what it is — **rollback detection only**, not proof the
   contract holds.

   **A console paste is a legitimate third way to execute it** — same
   assertions, no Playwright install, which matters on a machine that lacks the
   Chromium system libraries. Open the target host and run:

   ```js
   await (async () => {
     const d = window.__CYWEB_HOST__
     const prop = Object.getOwnPropertyDescriptor(window, '__CYWEB_HOST__')
     const checks = []
     const ok = (label, pass, detail = '') => checks.push({ label, pass, detail })

     ok('name === "cyweb"', d?.name === 'cyweb', String(d?.name))
     let entry
     try { entry = new URL(d.remoteEntry) } catch {}
     ok('remoteEntry is absolute http(s)',
        !!entry && ['http:', 'https:'].includes(entry.protocol), d?.remoteEntry)
     ok('apiVersion non-empty string',
        typeof d?.apiVersion === 'string' && d.apiVersion !== '', d?.apiVersion)
     ok('Object.isFrozen(descriptor)', Object.isFrozen(d))
     ok('property not writable', prop?.writable === false)
     ok('property not configurable', prop?.configurable === false)

     if (entry) {
       const res = await fetch(entry.href)
       ok('remoteEntry 200', res.status === 200, String(res.status))
       ok('JS MIME type',
          /javascript|ecmascript/i.test(res.headers.get('content-type') ?? ''),
          res.headers.get('content-type'))
       const ns = await import(entry.href)
       ok('exports init()', typeof ns.init === 'function')
       ok('exports get()', typeof ns.get === 'function')
     }

     console.table(checks)
     console.log(checks.every((c) => c.pass) ? '✅ PASSED' : '❌ FAILED')
   })()
   ```

   Ten checks, and **all ten matter**. Do not stop at the 200: an SPA returns
   `index.html` for any unknown path, so the `init`/`get` assertion is the one
   that distinguishes a real container from a HTML page served with a
   misleading status.

   **What it does not cover.** This is the host → descriptor half only. A
   well-formed descriptor says nothing about whether a *remote* reads it — that
   is §6.4's resolver, whose own failure mode (writing the wrong remotes array,
   a silent no-op) is invisible from here. The fixture E2E is the only check
   that fails on it.

**(1) was adopted, with (3) as cheap insurance** that also catches a future host
rollback. Written out across the phases so the three places that mention it
agree:

| Phase | Gate obligation |
| ----- | --------------- |
| 2     | ~~**Exit criterion:** on `web.cytoscape.org`, `window.__CYWEB_HOST__` evaluates, and its `remoteEntry` URL can be `import()`ed with `init`/`get` present (§11 step 11). Not "the code is merged" — deployed and checked.~~ **Waived 8/1/2026** — see below. |
| 3     | Pages workflow gains the production-host preflight; it fails the deploy if the descriptor is absent. **Now the only gate.** |
| 4     | Run §11 step 14 immediately after the pilot's first Pages publish. |
| 8     | Re-run the smoke across every published app. |

### The Phase 2 gate was waived — (3) is now load-bearing

**Decision, 8/1/2026:** deploying the host to production is not available in the
team's current workflow, so Phase 2 was closed on its code and local
verification, with the deployed-descriptor check deferred to a dev deployment.

This does not make the hazard go away. §5.5 ships a **sentinel**, not a
localhost fallback, so an app published against a descriptor-less host cannot
load at all — that is the whole reason (1) existed. What changes is that the
belt is gone and only the braces remain, so option (3) has to actually hold:

- **The preflight must target the host the published apps will name** — that is
  whatever `apps.json` sets as the `cyweb` URL, production today. Pointing it at
  a dev deployment while publishing production-facing apps passes while proving
  nothing. If those two ever diverge, the preflight follows `apps.json`.
- **It must fail the deploy, not warn.** `deploy-pages.yml` publishes on push to
  `main` with no human step; a warning is a log line nobody reads.
- **It must be seen failing before it is trusted.** Point it at a host known not
  to publish the descriptor and confirm a non-zero exit. A gate that has never
  gone red is not known to work — and this one now has nothing behind it.

**Built in Phase 3, and deliberately self-activating.** `deploy-pages.yml` asks
`node scripts/manifest.mjs --needs-preflight` first, which exits 0 only when a
`published` app is also on `bundler: 'vite'`. The reason is not caution about CI
minutes: a Webpack app compiles the host URL in and never reads
`window.__CYWEB_HOST__`, so a descriptor-less host cannot break it — and
production **is** descriptor-less today, serving `runtime.<hash>.js` /
`vendors.<hash>.js`, a pre-Vite Webpack build of the host. An unconditional
fatal preflight would therefore have blocked every Pages deploy immediately,
over a hazard none of the currently-published apps is exposed to. Phase 4 arms
it by flipping one manifest field — the same commit that first creates the
hazard.

The "seen it go red" requirement is implemented as
`npm run preflight:host -- --selftest`: it runs the contract against a host that
will never publish a descriptor and **fails if the contract passes**. The deploy
workflow runs it alongside the real check, so the gate re-proves it can reject
on every deploy that needs it.

**Exercised in all three directions on 8/1/2026**, which is the evidence the
waiver made necessary:

| Target | Expected | Result |
| ------ | -------- | ------ |
| `https://web.cytoscape.org` — the host published apps actually name | reject | **red**: `window.__CYWEB_HOST__ … not present after 30000ms` |
| `--selftest` — a control host that will never publish a descriptor | detect the rejection | **green** |
| `http://localhost:5500` — a correct host | accept | **green, 10/10** |

Red on two hosts and green on a third is the part that matters. A gate that is
merely red has not been shown to accept anything, and one that is merely green
has not been shown to reject anything; either alone would read as proof and be
worth nothing.

Option (2) — a GitHub Environment with required reviewers on the `deploy` job —
becomes worth reconsidering here, since it is the only remaining option that
does not depend on the preflight being correct. Not adopted, but it is the
obvious fallback if Phase 3 finds the preflight hard to make reliable.

## 9. Dev workflow

Unchanged for the developer:

```bash
cd cytoscape-web && npm run dev            # host, :5500
cd cytoscape-web-app-examples && npm run dev   # all examples, concurrently
```

`@module-federation/vite` supports `vite serve`, so each example serves a live
`/remoteEntry.js` from its dev server.

**Do not promise HMR.** Cross-federation HMR is opt-in and **off by default** —
the plugin's `dev.remoteHmr` option documents `false`/`undefined` as "HMR
disabled", with `true` selecting a framework-aware strategy that, for React,
requires the plugin to proxy `/@react-refresh` against the *host's* refresh
runtime. Whether that path works for a Cytoscape Web host has not been tested.
Until it is, document the honest behavior: **the remote is served live; changes
require reloading the host page.** Enabling `remoteHmr` is worth a follow-up
experiment, not a claim in this plan.

**`apps.local.json` needs one addition.** It currently has entries for `hello`,
`networkWorkflows`, `networkStatistics` and `claudeBridge` — but **not
`template`**. Since `project-template` is the Phase 4 pilot, the entry has to
exist before it can be verified; add it (port 5555, id `template`) as part of
that phase. The other four entries' URLs and ports are unchanged by this
migration.

## 10. Documentation updates

The migration is only complete when the docs stop teaching webpack. Files with
webpack references (from a repo-wide scan):

| File                                                            | What changes                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`README.md`](../../../README.md)                                   | "Webpack Module Federation" → Vite; setup steps reference `vite.config.ts` |
| [`CLAUDE.md`](../../../CLAUDE.md)                                   | §"webpack.config.js Pattern" rewritten; §7 host-config row corrected to `vite.config.ts` |
| [`guides/getting-started.md`](../../../guides/getting-started.md)   | Config walkthrough (`Edit webpack.config.js` → `vite.config.ts`)     |
| [`guides/architecture-overview.md`](../../../guides/architecture-overview.md) | Bundler naming; `shared`/`singleton` explanation; **add** how the host address is resolved (§6) |
| [`guides/troubleshooting.md`](../../../guides/troubleshooting.md)   | Name-mismatch and shared-dep sections; **add** a `type: 'module'` symptom entry (§5.1) and a "wrong host / `__CYWEB_HOST__` missing" entry (§6) |
| [`guides/getting-started.md`](../../../guides/getting-started.md)   | **Also** "Node.js 18+" → 24 (§8), and the `typeRoots` setup step (§7.4) |
| `*/README.md` (5 apps)                                           | Build/dev command blocks; `hello-world/README.md` also says "Node.js 18+" |
| [`README.md`](../../../README.md) §Dev                              | Claims the host "hot-reloads your plugin" — not true by default (§9)  |
| `docs/<app>/*.js` (tracked)                                      | **Committed Webpack build output** — 32 tracked `.js` files under `docs/` (of 38 tracked files total). Replace or stop tracking; they are stale the moment an app migrates |
| [`README.md`](../../../README.md)                                   | **Also** the `typeRoots` install instructions, now wrong (§7.4)      |
| [`docs/index.html`](../../../docs/index.html)                       | The published landing page — links and app list after §7.5, **and its registration instructions**: it currently tells users to add a `remoteEntry.js` URL under Apps → App Settings, but the host's install path takes a **single-entry manifest** URL and enforces an origin allowlist that excludes `cytoscape.org` (§11 step 14). The instructions are wrong today and will stay wrong after this migration unless rewritten |
| [`design/apps/*/`](../../apps/)                                     | `claude-bridge` and `project-template` design docs                   |
| `.serena/memories/*.md`                                          | `project_overview.md`, `style_and_conventions.md`, `lessons.md`      |

`.eslintrc.json` still configures ESLint while the host has moved to oxlint.
Aligning them is **out of scope** here — it is a separate consistency question
from the bundler split, and bundling it would make this change harder to review.

## 11. Verification

### 11.0 A build verifier, not a byte sniff

Rev. 1 proposed `head -c 200 dist/remoteEntry.js` as the ESM regression guard.
That is too weak to be the gate for a public contract: it would pass a bundle
with the wrong container name, missing exposes, three singletons instead of
five, a `cyweb` remote left at `type: 'var'`, or the runtime plugin silently
dropped.

The host already solves this — `npm run verify:federation`
(`cytoscape-web/scripts/verify-federation-build.ts`) inspects its built output.
**Write the mirror image for this repo**, run per app in CI (§8), asserting on
`dist/`:

| Assertion                                                        | Catches                                    |
| ---------------------------------------------------------------- | ------------------------------------------ |
| `remoteEntry.js` is an ES module exporting `init` and `get`       | the §2 `var`-library regression             |
| container name equals the app's federation name                   | copy-paste from the template                |
| every expected expose key is present                              | a dropped or renamed expose                 |
| **configured** shared records exactly equal the manifest's set, matching on `singleton`, `import` and `requiredVersion` | the §2 Emotion drift, and a shared entry quietly gaining a fallback |
| **effective** shared keys are a superset of configured, with every extra one on an allowlist | an unexpected package sneaking into the share scope |
| the `cyweb` remote is present with `type: 'module'`               | §5.1, the least legible failure mode        |
| the `cyweb-host-resolver` plugin is in the bundle                 | §6.4 dropped from a config                  |
| the `cyweb` remote's `entry` equals `CYWEB_HOST_REQUIRED` exactly | §6.4's fail-loud policy quietly reverted, or the sentinel drifting between config and plugin |
*(Payload absence is **not** in this table: it is a build-time `generateBundle`
gate in each app's `vite.config.ts` (§5.5), not a post-build check. Listing it
here too would imply two implementations.)*

**Do not grep the bundle for `localhost`.** A blanket ban has a false positive
already in the repo: `network-workflows`'s Jupyter panel legitimately defaults
to `http://localhost:8888/lab`. Assert on the **`cyweb` remote's `entry` value**
specifically, which is the thing the policy is about.

**Do not detect MUI by text-matching minified chunks either.** Module
provenance is not reliably recoverable from minified output, and the §5.8
measurement showed the offending code sitting inside an ordinary `App-*.js`
chunk with a share block that looked entirely correct. Use a small Rollup plugin
in each app's `vite.config.ts` whose `generateBundle` walks `chunk.modules` and
fails the build if any module id resolves under `/node_modules/react/`,
`/node_modules/react-dom/`, `/node_modules/@mui/` or `/node_modules/@emotion/`
— **namespace prefixes**, since an exact-package list lets `@mui/utils` and its
siblings through. That makes it a **build-time
gate** rather than a post-hoc check, and it reports the offending module id.

Implementation conditions, all of which matter:

- **`apply: 'build'`** — dev serves unbundled modules; the check is meaningless
  there and would fire constantly.
- **`enforce: 'post'`** — run after the federation plugin has done its module
  rewriting, or the gate inspects a graph that is about to change.
- **Normalize ids and match physical `node_modules` paths only.** Match on a
  resolved, slash-normalized path segment (`/node_modules/@mui/material/`), not
  a substring of the raw id.
- **Allow the federation plugin's own virtual wrappers.** `virtual:mf:…loadShare…`
  modules legitimately mention the shared package names; failing on those makes
  the gate fire on a correct build.
- **Give the gate its own fixtures.** A positive case (root-barrel import →
  passes) and **three** negative ones: `@mui/material/Box` (subpath),
  `@mui/icons-material/Home` (banned package), and **`@mui/utils`** — the last
  is what proves the namespace prefix is still a prefix. A gate tested only
  against `@mui/material/Box` passes even after someone narrows it back to
  exact package names, which is precisely the regression that happened once
  already (§5.5). Without fixtures a future refactor turns the gate into a
  silent no-op.

The last two are the ones no manual check reliably catches, because both fail
*silently and only in some environments*.

**There are two shared sets, and conflating them makes the verifier fail on a
correct build.**

- **Configured shared** — what `vite.config.ts` declares: the five root keys for
  the React/MUI apps, `[]` for `network-statistics`.
- **Effective shared** — what the build actually registers. The plugin *derives*
  additional keys from what the code references. Measured on the root-barrel
  probe, a build declaring five keys emitted a `react/jsx-runtime` share entry
  as well (the JSX transform's import), so the effective set was six.

A second measurement showed why the emitted **chunk** list is not the effective
set either: the probe produced `loadShare` chunks only for `@mui/material` and
`react/jsx-runtime`, because nothing in it imported `react-dom` or Emotion
directly. Registered share keys and emitted `loadShare` chunks are different
things — the verifier reads the manifest's `shared` array (registrations), never
the chunk list. An exact-equality assertion against a fixed five-key set therefore
fails in both directions on perfectly good builds.

So: **exact equality on the configured set, allowlisted superset on the
effective set.** The allowlist is a named constant in the verifier, not an
inline literal:

```js
// scripts/verify-federation-build.mjs
const DERIVED_SHARED_ALLOWLIST = [
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom/client',
]
```

These three are chosen deliberately, not copied wholesale from the plugin's
`COMMON_SHARED_SUBPATHS`. That table also lists `react/compiler-runtime`,
`react-dom/server`, `react-dom/server.browser` and the Solid entries. Of those,
`react/compiler-runtime` is the one a future React-compiler upgrade could
legitimately introduce — add it then, deliberately; the server and Solid entries
have no business in a browser remote at all. Every addition is an edit with a
reason.

**Where the verifier reads each set from — decided here, not deferred.** Rev. 8
left this to Phase 4, but Phase 3 builds the verifier, so it has to be settled
first. The shape below works with the current plugin:

1. **One definition site.** Each app's `vite.config.ts` exports a
   `CONFIGURED_SHARED` object holding the **full records** —
   `{ singleton, import, requiredVersion }` per key — replacing Rev. 8's
   version-only `HOST_VERSIONS`.
2. **Pass that same object to the plugin**: `federation({ shared: CONFIGURED_SHARED })`.
   A record that is not what federation received cannot exist, because there is
   only one object.
3. **Embed it in the manifest.** Enable `manifest` and use its
   `additionalData` hook to write `configuredShared: CONFIGURED_SHARED` into
   `mf-manifest.json`. This is what carries `import`, which the native manifest
   does not emit.
4. **Read the native `mf-manifest.json` `shared` array as the effective set.**
5. **Embed `configuredRemote` and `configuredRuntimePlugins` the same way.**
   The native manifest does **not** record a remote's `type`, so the verifier's
   `cyweb.type === 'module'`, sentinel-entry and resolver-registered assertions
   have no source without this. Same discipline: one `CYWEB_REMOTE` object and
   one `CONFIGURED_RUNTIME_PLUGINS` array, each passed to `federation()` **and**
   embedded, so a drift between them cannot exist.

   Two traps here, both of which produce a **false green**:

   - **A literal audit value is worse than none.** Rev. 10 wrote
     `configuredRuntimePlugins: ['cyweb-host-resolver']` as a hardcoded string.
     Delete the real `runtimePlugins` line and the audit field still claims the
     resolver is registered — the verifier passes on a build with no resolver at
     all, which is exactly the §6 failure it exists to catch.
   - **Pass a copy, not the array itself.** Plugin 1.16.8 pushes its own SSR
     runtime plugin onto the array it receives (`options.runtimePlugins.push(…)`).
     Sharing one mutable array between the federation call and the audit field
     would silently fold an internal entry into the recorded contract.

   **And do not trust the manifest alone.** The audit field says what the config
   intended; it cannot say what was emitted. The verifier must **also** find the
   resolver's stable identifier (`cyweb-host-resolver`) in the built browser
   bundle. A manifest assertion plus a bundle assertion is the pair that makes
   "the resolver ships" checkable.

Deriving the configured records from a *separate* constant — Rev. 8's
suggestion — would have missed exactly the drift worth catching: a `singleton`
or `import` changed on the federation call but not in the audit source. Passing
one object to both removes the possibility.

**Phase 3 fixes the artifact contract**: the manifest filename and location, the
`configuredShared` schema, and the effective-set allowlist. The verifier is
written against that contract, not discovered alongside it.

**Per app.** Five configured for the React/MUI apps; **`network-statistics` is
explicitly `{}`** (a record map, not `[]`) — an empty map in the manifest is a
fact the verifier
can enforce, whereas an omitted entry is a hole.

**Runner and location — fixed, not "a script".**
`scripts/verify-federation-build.mjs`, run by Node directly: no transpile step,
no added dependency, and it mirrors the host's `verify:federation` naming so the
two repos read the same. Exposed as `npm run verify:federation`.

### 11.1 Per app

In order — each step catches a distinct failure class:

1. `npm run typecheck` — passes.
2. `npm run build` — emits `dist/remoteEntry.js`.
3. **Run the §11.0 verifier** against `dist/`.
4. `npm run dev` — the app serves on its assigned port and
   `curl -I http://localhost:<port>/remoteEntry.js` returns 200 with
   `Access-Control-Allow-Origin: *`.
5. **With the host on :5500 and `apps.local.json` active:** the app appears in
   the App Manager, mounts, and produces its own observable — a rendered panel
   for the React apps, and for `network-statistics` (which has no UI) its
   statistics output on a network switch.
6. **MUI-based apps** (`hello-world`, `project-template`, `claude-bridge`,
   `network-workflows`): styles render correctly and the browser console shows
   no duplicate-Emotion warning — proves the two new shared singletons landed.
7. **`hello-world` specifically:** its second expose
   (`./NetworkSummaryMenuItem`) renders inside the host's React tree. It calls
   hooks in the host tree, so it is the sharpest available check that React is a
   true singleton across the boundary.
8. **`network-statistics`:** the non-React app still logs statistics on network
   switch. It needs no `react()` plugin — confirm it builds without one.

### 11.2 Runtime host resolution (§6) — verify separately

The point of §6 is that one artifact works against *several* hosts, so a single
successful load proves nothing. Check every branch:

9. **Global honored — no special build needed.** Since §5.5 compiles the
    sentinel into every production build, the **shipped artifact already proves
    this**: load a production build in a running host. If it mounts, the
    descriptor was used; if the plugin never ran, the sentinel entry fails.
    Rev. 4 proposed a bespoke unreachable-URL build for this — unnecessary once
    the sentinel exists, and a variant build is one more thing to keep in sync.
    The host stays on 5500 throughout (its Playwright setup pins that port).
10. **Fallback honored.** With the descriptor absent (older host, or standalone),
    behavior matches §6.4's chosen policy — a clear error, not a silent attempt
    at the developer's loopback.
11a. **(Phase 2 — host repo; it tests a host helper, not an app.)** Descriptor
    construction survives a based deployment. The host's
    `urlBaseName` is `/` today, so an end-to-end run proves nothing about the
    `base` handling in §6.3. **Extract the URL construction from `bootstrap.tsx`
    into a pure helper** — `buildHostRemoteEntryUrl(base, href, filename)` — and
    have bootstrap and the test call the same function; a test that reimplements
    the expression tests itself. Then assert `('/cytoscape/', 'https://x/y/z')`
    → `https://x/cytoscape/remoteEntry.js`, plus the `'/'` case. Cheap, and it
    covers the configuration production could switch to at any time.
11. **Host descriptor is well-formed — run the §8 descriptor contract**, in
    full, unmodified. Do not restate a subset here: a 200 proves nothing on an
    SPA (any unknown path returns `index.html`), and each partial restatement of
    this list has lost a different item. §8 is the single definition; this step
    is "execute it".

An **automated** version of step 9 belongs in the host's E2E suite. The existing
fixture (`cytoscape-web/test/fixtures/remote-app/`) only proves host → remote
(`container.get('./AppConfig')`); it never imports `cyweb/*`, so the entire
remote → host direction — the direction §6 changes — is untested. Extend the
fixture to consume a `cyweb/*` API and assert the call succeeds. Four details
decide whether the test can actually fail:

- **Use a runtime import, not `import type`.** A type-only import is erased at
  build time and exercises nothing. The fixture must call the API and assert an
  observable result (rendered DOM, a returned value).
- **The fixture needs ambient `cyweb/*` declarations — and it *is* type-checked
  today.** The host's root `tsconfig.json` has no `include`, only an `exclude`
  that does not list `test/`, so `tsc --noEmit` already covers the fixture.
  (Rev. 8 said nothing checked it; wrong.) Adding a `cyweb/*` import therefore
  breaks `lint:tsc` unless declarations resolve.

  **`/// <reference types="@cytoscape-web/api-types" />` does not resolve on a
  fresh checkout.** The package's `types` field points at `dist/index.d.ts`, and
  its tracked `index.d.ts` references `./dist/mf-declarations.d.ts` — `dist/` is
  **gitignored**. In clean CI, nothing there exists until
  `npm run build:api-types` runs.

  **Decision: a fixture-local declaration**, not the package. Referencing the
  package's *tracked source* declaration instead of the built one is the obvious
  alternative, but it loads the same ambient `declare module 'cyweb/*'` blocks a
  second time wherever `dist/` also exists — a duplicate-global hazard that only
  appears on developer machines. The fixture is a test double; give it exactly
  the surface it uses:

  ```ts
  // cytoscape-web/test/fixtures/remote-app/cyweb.d.ts
  declare module 'cyweb/WorkspaceApi' {
    export function useWorkspaceApi(): {
      getWorkspaceInfo: () =>
        | { readonly success: true; readonly data: { readonly workspaceId: string } }
        | { readonly success: false; readonly error: unknown }
    }
  }
  ```

  **Match the real API, not an approximation.** `ApiResult` is a discriminated
  union (`ApiSuccess<T> | ApiFailure`), not `success: boolean` with an optional
  `data`, and `WorkspaceInfo`'s field is **`workspaceId`**, not `id`. A shim
  that gets either wrong still compiles — the fixture then renders `undefined`,
  the E2E asserts on an empty string, and it passes. Assert the `workspaceId`
  **value** in the DOM, not merely that an element exists.

  Self-contained, no build ordering, and it keeps the fixture honest: it
  declares only what it actually calls. If the package declarations are used
  anywhere instead, then `build:api-types` must run before `lint`/`typecheck`
  in **both** CI and the local scripts — a CI-only fix leaves developers with a
  failure CI does not reproduce.

**The fixture is not currently wired for this, and Phase 2 owns the wiring.**
`cytoscape-web/test/fixtures/remote-app/vite.config.ts` declares only `exposes`
and `shared` — there is no `remotes.cyweb` and no `runtimePlugins`. Phase 2 must
add, inside the host repo:

- `remotes: { cyweb: { type: 'module', name: 'cyweb', entry: <sentinel>, … } }`
- a **fixture-local copy of the sentinel and resolver** mirroring §6.4, using
  the *same sentinel string* as the examples — a fixture that resolves the host
  differently proves nothing about the contract the apps ship
- **`runtimePlugins: [<abs path to that resolver>]`** — copying the resolver
  file without registering it leaves it inert, and the fixture would then
  "pass" while testing nothing. This is the step Rev. 8 omitted.
- the ambient declarations above

This means the runtime-plugin pattern is first exercised in the **host** repo,
in Phase 2, before any example uses it. That is deliberate: it validates the
mechanism against the real loader while the examples are still untouched. Phase
4's job is then narrower than earlier revisions implied — it confirms the
examples-side copy behaves identically and settles the remaining build-side
unknowns, rather than discovering `runtimePlugins` for the first time.
- **The wrong-entry variant belongs in the fixture's own config.** Give it an
  unreachable `entry` so a plugin that never runs cannot load anything. The
  **host stays on 5500** — its Playwright setup pins that port with
  `strictPort`; "non-default port" here means the fixture's port, if anything.
- **Descriptor-absent cannot be produced by deleting the global.** §6.3 defines
  `__CYWEB_HOST__` as non-configurable and frozen, so `delete window.__CYWEB_HOST__`
  is a no-op — Rev. 3's step 10 was untestable as written. Cover that case with
  a **second fixture page that never publishes the descriptor**, or in the
  real-runtime unit test (§6.4), not by mutating a live host page.

### 11.3 Repo-level

12. **`project-template` installs standalone** — copy it outside the monorepo,
    then `npm install && npm run typecheck && npm test && npm run build` (§7.3).
    `npm test` belongs in the list: the runtime plugin ships **inside** the
    template, so a copy whose test suite cannot run is a copy whose §6 behavior
    is unverified. This is the template's advertised purpose and nothing else
    tests it.
13. **Shared packages are the host's, and are not shipped.** With §5.7's
    `import: false` this is checkable at both ends, and both are required:
    - **Build:** `dist/` contains no React / ReactDOM / MUI / Emotion bundle.
      The 195 kB `loadShare__react_mf_2_dom` chunk measured in §5.7 must be
      absent. Record transferred bytes for an app load before and after — this
      is the number that justifies the §5.7 decision.
    - **Runtime:** the singletons in use are the host's. §11.1 step 7 (a remote
      component calling hooks inside the host's tree) is the React proof; add an
      equivalent for Emotion — a remote MUI component picking up the host's
      theme, which only works through a shared Emotion cache.

    If Phase 4 measurement forces a return to Option A, this step inverts: the
    build assertion is dropped, the runtime assertions stay, and the fallback
    transfer cost is recorded as an accepted budget. It must not silently become
    a no-op.
14. **Production smoke test** after a Pages deploy. Transport first: fetch the
    deployed `remoteEntry.js` and one hashed chunk cross-origin, checking CORS
    headers and the JS MIME type. (The origin does **not** change — Rev. 2 said
    otherwise; what changes is the artifact layout and the move to
    content-hashed filenames, which is what makes a stale-file or MIME problem
    newly possible.) **Then prove it loads**: in the *production host*, register
    the deployed remote through the real loader and assert `init`/`get` resolve
    and the app produces its own observable. Transport checks alone do not
    support a "deployed artifacts load" exit criterion — they would pass on a
    remote whose §6 resolution is broken.

    **`?installApp=` cannot be used, and Rev. 9's "or register directly" was
    not a plan.** Two host-side facts rule it out:

    - The intent takes a **single-entry manifest URL**, not a `remoteEntry.js`
      URL (`runInstallIntents.ts`).
    - Even with such a manifest, `installApp` checks the entry against
      `appInstallAllowedOrigins`, which in production is
      `["https://apps.cytoscape.org", "https://apps-stage.cytoscape.org"]`.
      **`https://cytoscape.org` is not on it**, so the Pages-published examples
      are rejected by design.

    Using it would mean publishing a single-entry manifest *and* widening the
    host's install allowlist — a trust-boundary change, for a test. Don't.

    **Use catalog interception instead**, which changes nothing about the host:

    1. Playwright intercepts the production host's `/apps.json` and fulfils it
       with the real catalog **minus any entry with the app's id, plus** the
       test entry. Appending is not enough: `parseManifest` deduplicates by id
       **keeping the first occurrence**, so an appended entry for an already-
       listed app (`hello`, `networkStatistics`, …) is dropped with a warning
       and the test silently exercises the *production* remote.

       The injected entry's `url` must be the **exact cache-busted
       `remoteEntry.js` URL whose SHA-256 was verified** — not the bare URL.
       Verifying a hash on `?v=<n>` and then loading the unsuffixed URL uses a
       different cache key, so a stale remote can still be what actually loads.
    2. Activate it through the App Manager UI, so the real host loader mounts
       the real deployed remote.
    3. Assert the app's `smokeObservable` (below), **and** assert from the
       response log that the bundle actually served is the one just uploaded.
       The entry and its chunks need **different** assertions:

       - **`remoteEntry.js`** — the response URL equals the cache-busted URL
         exactly, and its body hash matches the SHA-256 map.
       - **Its chunks** — same origin, path under `/<publishPath>/assets/`, and
         **path + body hash both present in the SHA-256 map**.

       They differ because **a relative ESM import does not inherit the parent
       URL's query**: `remoteEntry.js?v=<sha>` importing `./assets/chunk-x.js`
       resolves to `…/assets/chunk-x.js`, with no `?v=`. Requiring the query on
       chunks is therefore unimplementable, and a prefix match on the URL is
       false-green — it passes on any file under that directory, including a
       stale one. Hashing the chunk bodies against the map is what actually
       closes it.

    Interception scope differs by stage, and conflating them defeats the point:

    - **Pre-upload (staged):** intercept requests to the Pages URL and fulfil
      them from the local `docs/` build. Proves the artifact about to be
      published loads, before it replaces a working one.
    - **Post-deploy:** intercept **only** `/apps.json`. The remote itself must
      be fetched from the real CDN, or the test is not testing the deployment.

    **What counts as an observable, per app:** put it in the manifest as
    `smokeObservable`, and make it expressive enough for apps whose output is
    not a static element — a selector, but also "open the Apps menu", "switch
    networks", "wait for a console event" (`network-statistics` logs; it renders
    nothing). A selector-only field would force bespoke scripts back in.

    **Confirm you tested what you uploaded.** Record each published file's
    SHA-256 before upload; in the post-deploy smoke, fetch with a cache-busting
    query and retry until the served hash matches. CDN propagation otherwise
    makes a green smoke run against the *previous* build indistinguishable from
    a real pass.

    **Runner and wiring**, so this is a job and not an aspiration:

    - `scripts/smoke-pages.mjs --mode staged|deployed`, exposed as
      `npm run smoke:staged` and `npm run smoke:production`.
    - **App selection: `published === true && bundler === 'vite'`.** Not
      "every published app" — the host registers remotes with `type: 'module'`
      (`ExternalComponent.tsx`), so a still-Webpack app's `var`-library
      `remoteEntry.js` fails to load **by construction** (§2). Running the smoke
      over it during Phases 4–6 would report the migration's central premise as
      a smoke failure. The predicate makes the runner correct at every phase
      without a flag.
    - `smoke:staged` runs in the build job **before** `upload-pages-artifact`,
      serving `docs/` locally; `smoke:production` runs in a job after `deploy`.
    - The SHA-256 map is written by the build job and passed to the deploy job
      as a workflow artifact — the two jobs do not share a filesystem.
    - Per-app and overall timeouts, and **bounded** retry for hash propagation
      (a fixed attempt count, not "until it matches"), so a never-propagating
      deploy fails rather than hanging the workflow.

## 12. Phased execution

**The governing rule: everything Webpack-breaking is per app, and Webpack is
removed last.** Rev. 1 stripped the Webpack toolchain up front, which breaks
every build for the whole migration. Rev. 2 fixed that but still switched all
tsconfigs to `noEmit` and enabled the verifier repo-wide in one phase — and both
of those break unmigrated apps just as thoroughly:

- **`noEmit: true` breaks `ts-loader`.** It relies on the compiler producing
  output; with `noEmit` it fails with `TypeScript emitted no output for <file>`.
  A repo-wide tsconfig switch takes down every app still on Webpack.
- **The Vite verifier fails on a Webpack bundle by construction** — asserting an
  ESM `remoteEntry.js` against a `var`-library one is the §2 regression check
  working exactly as designed.

So the rule is: **`tsconfig` changes and the per-app gates move app by app, in
the same commit that flips that app to Vite.** The CI workflow itself is written
once in Phase 3 with a fixed job set; what moves is the manifest's `bundler`
field, which those jobs read (§8). Nobody edits a required-checks list.

| Phase | Scope                                                                                                              | Exit criterion                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1 ✅  | **Decide, then act on the decisions.** Settle the canonical URL and the built/published sets (§8); then delete `patterns/` (§7.5) and bump `@cytoscape-web/api-types` **with a lockfile update** (§7.1) | **Done 8/1/2026.** Built = 5 workspaces, published = 4 (`claude-bridge` excluded), URL confirmed, `patterns/` deleted, api-types at `1.0.0-beta.3`; `npm ci` clean and all five Webpack builds pass |
| 2 ✅  | **Host repo.** Typed, frozen `window.__CYWEB_HOST__` (§6.3) + regression test; extract the URL construction as a pure helper (§11.2); declare `@module-federation/runtime` directly; add `verify:federation` to the host CI's **existing build job, right after `npm run build`** (a separate job has no `dist/`); extend the E2E fixture to consume `cyweb/*` from a remote (§11.2); **deploy to production** | **Declared complete 8/1/2026.** §11 step 11a passes; the §8 contract passes on localhost (10/10, by hand). The production-deploy criterion was **waived** — unavailable in the team's workflow — which promotes Phase 3's preflight to the only release gate (§8). Remote→host E2E is **carried, not waived**: the host commit is local-only, so CI has not run it yet |
| 3 ✅  | **Scaffolding only — nothing that touches an unmigrated app.** Add the §7.1 deps *without removing any* (incl. Vitest and `@playwright/test`); `apps.manifest.json` + `scripts/manifest.mjs` with its validations (§8); `scripts/verify-federation-build.mjs` (§11.0) with its shared-audit contract fixed; `check:imports` (inert until an app's `bundler` flips); rewrite `copy-dist` around the manifest and point `deploy-pages.yml` at it (§8); `scripts/preflight-host.mjs` + Chromium install in the workflow (§8); add `"typecheck": "tsc --noEmit -p tsconfig.json"` to all five apps against their **existing** tsconfigs; PR CI workflow with the fixed §8 job table; Node 24 in workflow + `engines` + `.nvmrc` | **Done 8/1/2026.** `npm ci` clean; all five still build with Webpack; `typecheck` passes for all five; `copy-dist` reproduces the workflow's `docs/` (the nesting bug and the stray `claude-bridge` both gone). PR CI is written but has not run — it triggers on PRs to `main` |
| 4 ✅  | **`project-template` pilot.** Migrate it *including* its three tsconfigs (§7.4), root-barrel MUI imports (§5.8), self-contained deps (§7.3), `apps.local.json` entry (§9), and deleting **its** `webpack.config.js`; §11 steps 1–6 and 9–12 (11a is Phase 2's) and the **build** half of step 13 (step 6 applies: the template is a MUI app); publish to Pages and run step 14, plus the §5.7/§5.8 measurements and the §8 SSR decisions | **Done 8/4/2026** except the Pages step. Loads in a running host from a production build carrying only the sentinel (§11 step 9 — the end-to-end proof of §6); panel renders with the host's MUI theme; installs and builds standalone outside the monorepo; §5.7 settled at 8.7×; §8 A and B settled from real output. **Step 14 on the production host is deferred with the Phase 2 waiver** — production has no descriptor, so the deploy preflight would (correctly) refuse |
| 5 ✅  | **`hello-world`.** Migrate; fix `__webpack_public_path__` (§7.6); §11 steps 6–7 and the runtime half of step 13     | **Done 8/4/2026.** Shared React + Emotion verified across the boundary: the remote's MUI `MenuItem` renders in the host's own tree and its hooks run, the panel computes `sx` against the host theme, no invalid-hook-call. §7.6's replacement verified at runtime — the header's chunk URL was fetched and returned 200 |
| 6     | `network-statistics` (non-React shape, §7.3), `network-workflows` (fix the hardcoded `mode`), `claude-bridge`; CI list now covers all five | All load; all five apps mandatory in CI                     |
| 7     | **Remove the Webpack toolchain.** Delete `webpack*`, `ts-loader`, `clean-webpack-plugin` and the old scripts; reconcile the root `peerDependencies` (§7.1); documentation (§10) | No Webpack references in **live sources, configs, scripts or user-facing docs**. This spec and the other design/history documents keep theirs — they explain why the migration happened |
| 8     | Production smoke test (§11 step 14); shared-package checks (§11 step 13)                                            | **First** assert every `published: true` app has `bundler === 'vite'` — after Phase 7 the two sets coincide, and a mismatch means an app was published unmigrated. **Then** every published app loads in the production host and produces its manifest `smokeObservable`; host singletons used |

Notes on the ordering:

- **Phase 1 before anything** because `patterns/` determined whether this is a
  five- or six-app migration, and the canonical URL determines what the
  published artifacts must say. Both were cheap to decide and expensive to
  discover mid-flight. Settled: five apps, `https://cytoscape.org/cytoscape-web-app-examples/`.
- **Phase 2 (host) before any app.** §5.5 now ships a sentinel rather than a
  localhost fallback in production builds, so a migrated app **requires** the
  descriptor — the ordering is a hard dependency, not just a convenience. The
  host-side E2E built here also means the pilot lands against a test that can
  actually fail.
- **Phase 3 adds `typecheck` against the *existing* tsconfigs.** `npm run
  typecheck --workspaces` fails today simply because no app defines the script.
  Adding it in Phase 3 with the current (emit-capable) tsconfigs gives CI
  something real to run while every app is still on Webpack; the `noEmit` split
  arrives per app in Phases 4–6.
- **Phase 3 fixes `copy-dist`, not Phase 7.** Vite artifacts start appearing in
  Phase 4, and the nesting bug (§8) would corrupt `docs/` from that point on.
  Fixing it before the first Vite build is the only ordering that keeps `npm run
  deploy` usable throughout.
- **Phase 4 is deliberately one app.** The `runtimePlugins` mechanism itself is
  already proven by then — Phase 2 wires it into the host's E2E fixture (§11.2)
  — so Phase 4 confirms the examples-side copy is **equivalent** and settles what
  is genuinely repo-specific: the absolute-path form under this repo's layout
  (§6.4), whether `esnext` is really needed for a remote (§5.4), what §5.7/§5.8
  cost in bytes, and the §8 SSR decisions.
- **Per-app `webpack.config.js` deletion happens in Phases 4–6**, with the app
  that no longer needs it. **Phase 7 removes the shared toolchain** — the
  dependencies and root scripts that all remaining apps were still using. Until
  Phase 7, every unmigrated app keeps building exactly as it does today.

## 13. Risks and open questions

| Risk                                                                                                     | Mitigation                                                                                                     |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `type: 'module'` omitted on the `cyweb` remote → silent no-exports failure                                | Prominent comment in the template (§5.5); troubleshooting entry (§10); the §11.0 verifier asserts it            |
| Type checking silently dropped when `ts-loader` goes away                                                 | `typecheck` script per app + **new** PR CI (§7.4, §8) — note this repo has no PR CI at all today                |
| A deployed third-party app still expects the old `var` contract                                           | Per the host's *remote-app-loading-modernization* doc, **no third-party apps are deployed yet** — this is the window to change it |
| Production output becomes minified where it was not (§3)                                                  | Accept deliberately; note it in the migration PR. `build.minify: false` is available per-app if debugging needs it |
| `@module-federation/vite` version skew between host and examples                                          | Pin `1.16.8`; pin `@module-federation/runtime` to `2.5.1` — §6.4 depends on that version's `formatOptions` behavior |
| **A Vite-built app is published before the production host publishes `__CYWEB_HOST__`** — it ships a sentinel, not a fallback, so it simply cannot load | **Weakened 8/1/2026.** The Phase 2 exit criterion (descriptor deployed to production) was waived — not available in the team's workflow — so the *only* remaining mitigation is Phase 3's Pages preflight, which must target the host `apps.json` names and must fail the deploy rather than warn (§8). "Hold the deploy" alone is unenforceable; the workflow publishes on push to `main`. **Verify the preflight goes red against a descriptor-less host before Phase 4 publishes anything** |
| **§5.8:** MUI/Emotion silently duplicated because subpath imports miss the share key | Root-barrel imports with the **exact** `@mui/material` key (§5.8) — the trailing-slash key was measured and rejected: the host only provides subpaths it imports, and 9 of the apps' 20 are not among them. Lint bans `@mui/material/`; the §11.0 build gate asserts on payload, since React works either way and nothing else catches it |
| Absolute build-machine paths (username, directory layout) published inside the browser `remoteEntry.js` | §8 Decision A: accept, or strip in a post-build step. **Excluding the SSR files does not fix this** — the strings live in the browser entry |
| ~64 kB of unreachable SSR JavaScript published per app                                                     | §8 Decision B: exclude from what `deploy` copies, after verifying the browser entry still loads                            |
| **Migration leaves the repo unbuildable mid-flight**                                                      | Webpack is removed in Phase 7 only; both coexist from Phase 3–6. `noEmit`, the verifier, and the CI list move **per app**, never repo-wide (§12) |
| **Webpack-specific code survives the config swap** (`__webpack_public_path__` and friends)                 | §7.6: explicit removal plus a grep gate per app. Note `typecheck` and `build` both pass on this defect          |
| **§6:** the runtime plugin writes the wrong array and silently no-ops                                     | The Rev. 1 defect. §6.4 writes **both** `userOptions.remotes` and `options.remotes`; unit test + §11 step 9     |
| **§6:** an app is deployed before the host publishes `__CYWEB_HOST__` and falls back to a developer default | Implemented, not just stated: §5.5 emits a sentinel for `command !== 'serve'` and §6.4 throws on it. Phase 2 before Phase 4 is now a hard dependency |
| **§6:** `runtimePlugins` path fails to resolve from the generated virtual module                          | Absolute path via `normalizePath(fileURLToPath(...))` (§6.4) — the plugin interpolates it into an `import` statement, so a Windows backslash path breaks it; Phase 4 settles it for all apps |
| **§6:** the runtime plugin runs but the entry it writes is wrong (host `base` misconfigured)              | §11 step 11 checks the global is a fetchable absolute URL; §6.3 derives it from `import.meta.env.BASE_URL` rather than restating it |
| **§6:** one artifact now meets host versions it was not built against                                     | Out of scope by decision — see §6.6                                                                            |
| Shared fallbacks silently ship ~200 kB+ of React/MUI on every app load                                     | §5.7 chooses `import: false` on measured evidence; §11 step 13 asserts absence from `dist/` **and** host-instance use at runtime |
| Version skew between host and app goes undetected at runtime                                               | **Not solved by `requiredVersion`** — the plugin takes the first provider with no semver check (§5.7). Explicit ranges are manifest metadata only; real enforcement needs the §6.6 check |
| Typecheck breaks (TS2307 `webpack`) once Webpack is uninstalled — MF SDK types `import webpack`             | §7.4: `skipLibCheck` on the **node and test** configs; `src/` never imports MF runtime types (local structural type, §6.4); the app config keeps `skipLibCheck: false` so api-types is still checked |
| **`noEmit`/verifier applied repo-wide breaks every unmigrated app**                                        | The Phase 3 split (§12): scaffolding only, nothing that touches an app still on Webpack                        |
| Stale hashed assets served indefinitely from `docs/`                                                       | §8: `copy-dist` must delete the target before copying, as the workflow already does                            |

**Open question — should the examples repo consume `FEDERATION_SHARED_SINGLETONS`
programmatically?** Today the list is duplicated by hand in each example, and §2
shows the duplication already drifted. The host publishes
`@cytoscape-web/api-types`; exporting the singleton list from that package would
make the drift impossible. Deliberately **deferred**: it adds a build-order
coupling between the repos, and §5.6's copy-pasteability argument applies here
too. Revisit if the list drifts again.
