# Implementation Checklist — shared hosts for local app development

> Goal, in two stages:
>
> 1. **`https://dev1.ndexbio.org/cytoscape` (host) + `http://localhost:<port>`
>    (app) is an officially supported development environment.** A developer runs
>    only their own app, points a shared staging host at it, and gets a working
>    install — no host checkout, no host rebuild, and not through a bypass.
> 2. **The same holds for production, `https://web.cytoscape.org`.** An app
>    developer with nothing installed but their own app can develop against the
>    host their users actually run. Gated on production running the Vite build —
>    which happens when `development` is deployed as the stable release (§0.4).
>
> Stage 2 is the end state, and it is what makes the design decisions below
> non-negotiable: an opt-in that is *compiled out* of production builds, or an
> allow-list that names dev1 specifically, would reach stage 1 and permanently
> foreclose stage 2. Every phase is written so that production is a
> **configuration value that has not been flipped yet**, never a different build.
>
> dev1 tracks `development`, and `development` becomes production. So the host
> changes below **ship to production on the ordinary release path**, with only
> the flag's value separating the two stages. That is the whole design, and it
> is also the whole risk — see §0.4.
>
> **Status: Phases 0–5 complete** (2026-08-19). PR #677 is merged and dev1 is
> running it, and **the flow has been verified end to end against dev1 itself**:
> an app served from `localhost` installs into the shared host and mounts.
> Phase 6 (documentation) is done, with one item open that Phase 6 uncovered
> rather than created: the SDK release that makes `CYWEB_DEV_HOST` reachable
> from a scaffolded app. Also outstanding: Phase 3's release note, and Phase 7., on branch `feat/remote-dev-host`
> in both repositories. The host now has the opt-in, honours it at every install
> gate, and no longer loads catalog entries unchecked, and a dev server can be
> pointed at dev1 with one environment variable. **What is left is proof and
> prose**: Phase 5 runs the whole path end to end, Phase 6 writes it down.
>
> Two items are **HELD** pending a team decision about `config.dev.json`
> (Phase 1), and Phase 3's release note is still to write.
>
> **This is the first project here that changes the HOST.** Everything in the App
> SDK work was deliberately host-free; this one is not, and the split is marked
> per phase.

_Roadmap: [`../developer-onboarding/developer-onboarding-roadmap.md`](../developer-onboarding/developer-onboarding-roadmap.md) — Theme H (H-1, H-5) and the acceptance constraint under G-6._

**Format note:** follows
[`../vite-migration/vite-migration-checklist.md`](../vite-migration/vite-migration-checklist.md)
and the App SDK checklist — all phases in one file, each with its own
verification, run before the next phase starts.

**Repository note:** steps in the host repository are prefixed `cytoscape-web/`.
Everything else is relative to `cytoscape-web-app-examples/`.

---

## Phase 0: Premises — measured 2026-08-18

Three things had to be true before any of this was worth planning. All three were
checked rather than assumed, and **one of them changes the shape of the whole
project**.

### 0.1 The browser blocks this by default — and a server header cannot fix it

A page on a public origin loading a subresource from `localhost` is a
**public → loopback** request. Chrome refuses it:

```
Access to script at 'http://localhost:6544/mod.js' from origin
'https://dev1.ndexbio.org' has been blocked by CORS policy:
Permission was denied for this request to access the `loopback` address space.
```

**The request never reached the server.** `Access-Control-Allow-Private-Network:
true` on the dev server changes nothing, because nothing is sent for it to
answer. Neither does serving the app over HTTPS: the restriction is on the
address space, not the scheme.

**It is a user permission, and granting it works.** With Chrome's
`local-network-access` permission granted for the host origin, the same import
succeeds and the request arrives:

```
local-network-access permission: granted
import(): { "ok": true }
server saw: [ 'GET /mod.js' ]
```

So the flow is achievable, and it acquires a step nobody had accounted for: **the
developer grants a browser permission the first time.** That step belongs in the
documentation, and every automated check of this flow has to grant it or fail for
reasons unrelated to the code.

- [x] The default permission state on dev1 is **`prompt`**, not `denied`
      (`navigator.permissions.query({name:'local-network-access'})`, measured
      2026-08-18). Chrome intends to ask; headless has no UI to ask with, which
      is why the ungranted test failed
- [x] **No user gesture is required — the deep link is viable.** Measured in
      headed Chrome on dev1, three isolated runs, each a fresh browser, fetching
      `http://localhost:6543/cyweb-app.json`:

      | | outcome | server saw |
      | --- | --- | --- |
      | granted, no gesture | resolved in **3 ms** | the request |
      | default, no gesture | **unsettled after 5 s** | nothing |
      | default, with a click | **unsettled after 5 s** | nothing |

      Ungranted headed hangs; ungranted **headless** rejects promptly with
      "Permission was denied" (§0.1 above). The difference between them is the
      presence of UI to ask with, so hanging is the request waiting on a prompt.
      Gesture and no-gesture hang identically, so the prompt is raised **without
      transient activation**.

      Consequence: `runInstallIntents`' boot-time manifest fetch can raise the
      prompt, **Phase 4's `?installApp=` banner design stands**, and the
      dialog-before-fetch reorder is not needed.
- [x] **The prompt's wording, captured on dev1 2026-08-18:**

      ```
      dev1.ndexbio.org wants to                         [×]

      🖥  Access other apps and services on this device

                                       [ Block ]  [ Allow ]
      ```

      **It never says "localhost", "port", "server", or "network".** The wording
      is written for the threat it exists to stop — a website reaching printers
      and routers — so nothing in it connects to "I am running a dev server and
      the host is about to fetch from it". A developer who has not been told what
      to expect has every reason to click **Block**.

      That inverts the documentation job. Phase 6 is not "mention that a prompt
      appears"; it is **show this exact prompt and say Allow**, because the
      correct action looks like the unsafe one.

      Note the `[×]`: dismissing is not Block, but Chrome escalates repeated
      dismissals toward a block, and a dismissed prompt leaves the fetch hanging
      rather than failing — the developer sees nothing happen at all.

- [x] **The prompt collides with two other first-visit dialogs**, seen in the
      same capture. On a fresh profile dev1 shows, simultaneously:

      | | where | source |
      | --- | --- | --- |
      | LNA permission prompt | top-left, browser chrome | Chrome |
      | Onboarding tour modal | centre, modal | the host app |
      | Cookie consent banner | bottom | the host app |

      The permission prompt is the smallest, the least familiar, and the only one
      that is not part of the page. It is also the only one that matters to the
      install. A developer working through the modal first may dismiss the prompt
      without reading it.

      Phase 6 must say to answer the permission prompt **first**. Whether Phase 4
      should also delay the deep-link fetch until the tour is dismissed is a real
      question, but the measurement above shows it is not *required* — the prompt
      is raised and answerable while the modal is up
- [x] Supported browser set decided — **D-3**, Chrome and Edge only. Firefox and
      Safari implement local network access differently or not at all, and
      Safari has a second, independent reason to fail (see D-3)

### 0.2 The host side of dev1 is already ready

- [x] `npm run preflight:host -- https://dev1.ndexbio.org/cytoscape` → **10/10**.
      Descriptor published, frozen, non-writable, non-configurable;
      `remoteEntry` is `https://dev1.ndexbio.org/cytoscape/remoteEntry.js` with
      the `/cytoscape/` base present exactly once; served as
      `application/javascript` over HTTPS by Apache
- [x] Share scope carries all seven keys — the five singletons plus
      `react-dom/client` and `react/jsx-runtime`

Nothing about the host's runtime is missing. What is missing is permission and
configuration.

### 0.3 There is no per-deployment configuration mechanism at all

- [x] `config.json` is a **build-time import** in ten or more modules
      (`cytoscape-web/src/App.tsx:17` and others), so every value in it is frozen
      into the bundle
- [x] `cytoscape-web/src/assets/config.dev.json` exists and is **referenced
      nowhere** — `grep -rn "config.dev" src/ vite.config.ts package.json`
      returns nothing. It is a hand-maintained file that nothing selects
- [x] `https://dev1.ndexbio.org/cytoscape/config.json` is not served, confirming
      the build-time story from the outside

**This is why H-1 is not optional here.** Turning a flag on in `config.json`
turns it on for **production**, which is precisely what must not happen *yet*.
dev1 needs to differ from production, and today there is no supported way for it
to. It stays necessary after stage 2, because dev1 and production will still
differ in other ways.

### 0.4 Production is one release behind, on a known path — measured 2026-08-18

`web.cytoscape.org` is still a **Webpack build**:

```
prod   remoteEntry.js:  var cyweb;
                        (self["webpackChunkcytoscape_web"] = ...).push([[1951],{
dev1   remoteEntry.js:  import{n as e,t}from"./assets/virtual_mf-REMOTE_ENTRY_ID...
                        export{t as get,e as init}
```

- [x] `preflight:host -- https://web.cytoscape.org` → **0/1**:
      `window.__CYWEB_HOST__` is not published. The descriptor arrived with the
      Vite migration, so a pre-migration deployment cannot have it
- [x] `/remoteEntry.js` is served (200, `application/javascript`) but is a
      Webpack chunk assigning a `var`, not an ES module
- [x] `index.html` loads `runtime.<hash>.js` and `vendors.<hash>.js` — Webpack
      chunk naming; a Vite build emits `assets/index-<hash>.js`

**No app built with the current SDK can load there at all today.** Every app
declares `type: 'module'` for the `cyweb` remote, which makes it `import()` the
host entry; importing a `var`-assigning Webpack chunk as ESM yields no `get` and
no `init`. That is the silent failure `CLAUDE.md` §3(1) describes, seen from the
other side — the remote appears to load and exports nothing.

**This is a scheduled state, not an open question.** dev1 tracks `development`,
and `development` is what gets deployed to production once it stabilizes. So
production becomes a Vite build on the ordinary release path, with no separate
project to wait on.

#### What the release path implies — and it is not what §0.4 first looked like

The prerequisite and the work are **carried by the same release**. Phases 1–3
land on `development`; the deploy that makes production a Vite build is the same
deploy that gives production the runtime config loader, the origin policy, and
the closed catalog bypass. Three consequences, none optional:

- [ ] **Phases 1–3 reach production whether or not stage 2 has been decided.**
      Safe-by-default has to hold *at that deploy*, not at some later date when
      someone chooses to enable it. See §0.5 — the default/override direction in
      this repository is the opposite of what that sentence first assumed, and it
      is the single most likely way stage 2 ships by accident
- [ ] **Phase 3 changes production behaviour on that deploy.** Closing the
      catalog bypass means a production user with a custom Manifest Source
      pointed at a non-allow-listed origin stops being able to load it. That is
      the intended fix, and it is still a user-visible change arriving with a
      release nobody flagged as behavioural. It belongs in the release notes
- [x] ~~Phase 1 adds a file the production deploy must serve.~~ **Retired by
      D-1.** This warning assumed a runtime-loaded `config.json`; the scope
      decided in Phase 0 keeps the build-time import and adds one origin-scoped
      field, so the production deploy gains no new required file. Recorded rather
      than deleted because it becomes true again the day full H-1 is picked up

Once that deploy has happened, stage 2 really is one configuration value — which
is exactly why the reasoning in Phase 7 has to be settled before it, not after.

### 0.5 The host's configuration story, measured 2026-08-18

Read before scoping Phase 1 — three of these invert assumptions made above.

**The committed `config.json` is dev1's config, and production is the override.**
`src/assets/config.json` ships `"ndexBaseUrl": "dev1.ndexbio.org"` and a
`dev1.ndexbio.org/auth2` Keycloak URL. `README.md` §"Build for production" says
the checked-in file "is configured for the NDEx development server ... and **must
not** be used as-is for production builds", then gives a table of **five** fields
a human edits before `npm run build`.

- [x] `appInstallAllowedOrigins` is **not in that table**

That is the accident path, and it is the natural mistake rather than a careless
one: the committed config is the dev config, so `allowsLocalhostApps: true`
belongs there by every local convention — and the production procedure would not
mention it. **Whatever Phase 1 builds, the production-facing default cannot come
from the file dev1 also uses.**

- [x] **There is no deploy pipeline.** Production configuration is a human
      editing a JSON file before a build. No workflow in `.github/workflows/`
      deploys anything; `ci.yml` is the only one
- [x] **`config.dev.json` has already drifted**, which is what a dead file does:
      it carries `debugOptions.disableAutoReload` and a different
      `errorReportEndpoint`, neither of which `config.json` has. Neither key is
      read anywhere in the source, so the drift has never had an effect —
      **removal is on hold** pending a team decision (see Phase 1)

**Phase 1 is far smaller than H-1 for this goal — if we want it to be.**
`appInstallAllowedOrigins` is not read by direct import anywhere. It reaches all
four gates through `AppConfigContext`, whose only provider is
`src/boot/bootstrap.tsx:102`, supplied with the parsed `config.json` itself.
(Corrected during Phase 1: this section first named `src/App.tsx:17`, which
imports the config only for `urlBaseName` and provides nothing.) The other nine
`config.json` importers read unrelated fields:

- [x] `boot/keycloak.ts` and `boot/bootstrap.tsx` run **before React mounts** —
      runtime loading puts an `await` in the boot path, which has its own
      contract in `STARTUP_SPECIFICATION.md`
- [x] `vite.config.ts:19` imports it at **build time** and cannot be runtime at
      all, so "config.json is runtime-loaded" is already not literally achievable

**There are four `isAllowedOrigin` call sites, not three**, and the fourth
matters:

| Site | Path |
| --- | --- |
| `AppSettingsDialog.tsx:112` | Install from URL |
| `runInstallIntents.ts:98` | `?installApp=` deep link |
| `useAppManager.ts:296` | programmatic install |
| `useLoadWorkspace.ts:133` | **workspace restore** |

Workspaces persist to NDEx and are portable between hosts. So an app installed on
dev1 from `localhost` and saved will be **refused when that workspace is restored
on a host without the flag** — correct behaviour, and a support question nobody
will connect to this project unless it is written down now.

**A fifth localhost check exists, and Phases 1–3 as written do not fix it.**
`validateManifestUrl` (`AppSettingsDialog.tsx:54`) rejects any non-HTTPS URL
unless **the host** is on localhost — origin is never considered, only protocol:

```js
if (parsed.protocol === 'https:') return undefined
if (isDev && parsed.protocol === 'http:') return undefined
return 'URL must use HTTPS protocol'
```

On dev1 `isDev` is false, so a developer **cannot even type**
`http://localhost:6000/cyweb-app.json` as a Manifest Source. This also explains
what the G-6 bypass actually is: not the URL field, but the **manifest file
upload**, which skips URL validation entirely and reaches `activateApp`, which
checks no origin. Phase 2 must carry this fifth check or the Manifest Source path
stays broken on dev1 after all the other work lands.

- [x] **CORS needs no work.** The SDK dev server already sends
      `Access-Control-Allow-Origin: *` on both the manifest
      (`devInstall.ts:67`) and the bundle (`vite/index.ts:269`)

### 0.6 The prompt already fires on dev1 today — and the host already explains it

Found while capturing §0.1's wording: the prompt appeared on a run that made
**no localhost request of its own** — the page was merely opened and left alone.

- [x] `src/features/FeatureAvailability/useFeatureAvailabilityPolling.ts` fetches
      `http://127.0.0.1:1234/v1/version` **every 5 seconds from load**,
      unconditionally and with no user gesture, to detect whether Cytoscape
      Desktop is running

Three consequences, and the first two are the useful ones:

- [x] **This project does not introduce the prompt.** Every dev1 visitor already
      meets it at load. Phase 6 is documenting an existing condition, not warning
      about a new one — and it independently confirms §0.1: a boot-time fetch
      with no gesture does raise the prompt
- [x] **A stale Block is a silent, per-origin trap.** The permission is granted or
      denied per origin, not per port. A developer who clicked **Block** on this
      prompt — months ago, for a reason unrelated to app development — has
      blocked every future localhost request from `https://dev1.ndexbio.org`,
      including the app install. The install then **hangs** rather than failing
      (§0.1), so nothing points at the cause. Phase 6 must say how to reset it:
      the icon at the left of the address bar
- [x] **The host already has the dialog this needs.**
      `src/features/CytoscapeDesktopPermissionDialog.tsx` explains the prompt in
      plain language and tells the user to click **Allow**;
      `useCytoscapeDesktopPermissionNotice.ts` shows it once, remembers, and
      defers the action until confirmed. Phase 4/6 should **reuse this pattern
      rather than invent a second explanation** of the same browser prompt

One pre-existing gap, noted but **not ours to fix**: the notice hook is wired
only to explicit actions (`OpenInCytoscapeButton`, `OpenNetworkInCytoscapeMenuItem`,
`NetworkPropertyPanel`), while the polling asks at load. So the developer meets
the prompt before any explanation exists. Worth raising separately; do not let it
expand this project.

### Decisions — taken 2026-08-18

- [x] **D-1. Phase 1 is scoped to the app-install policy, not to `config.json`.**
      Full H-1 stays on the roadmap; it is not this project. The policy reaches
      all four gates through `AppConfigContext` from the single importer
      `src/App.tsx:17` (§0.5), so stage 1 needs that one path and nothing in the
      pre-React boot sequence
- [x] **D-2. The opt-in carries the origin it applies to, and is honoured only on
      a match.** Not a boolean:

      ```jsonc
      // src/assets/config.json — the committed file, which IS dev1's (§0.5)
      { "allowsLocalhostAppsOn": "https://dev1.ndexbio.org" }
      ```
      ```ts
      const enabled = cfg.allowsLocalhostAppsOn === window.location.origin
      ```

      **This is the whole answer to §0.5's accident path.** Copied to production
      unchanged — the documented procedure edits five fields and would not touch
      this one — the value no longer matches `window.location.origin` and the
      flag is inert. Safety stops depending on a human remembering a table row.
      It also answers the boolean-vs-pattern question: no wildcard is needed on
      the *app* side, because the app is always localhost; the thing that varies
      is the host, and naming it exactly is what makes the config self-cancelling
- [x] **D-3. Chrome and Edge only, stated in the docs.** Firefox and Safari are
      not measured and will not be claimed either way. Safari has separate reason
      to fail — it has not historically treated `http://localhost` as a
      trustworthy origin, so mixed content blocks it before LNA is reached.
      Phase 5's automated verification is Chromium-only
- [ ] **When does production's value flip?** Deferred to Phase 7, as it should
      be — and D-2 changes what flipping *means*: production does not remove a
      `true`, it adds its own origin. There is no state in which the committed
      file alone enables production

---

## Phase 1: Per-deployment configuration 【host】

_Roadmap H-1._

### Deliverables

Scope is **D-1**: the app-install policy only. Full H-1 stays on the roadmap.
This phase must not become the `config.json` migration.

- [x] `allowsLocalhostAppsOn?: string` added to `AppConfig`
      (`src/AppConfigContext.ts`). **No provider change was needed**:
      `bootstrap.tsx:102` passes the parsed `config.json` straight through, so a
      new field in that file arrives at every consumer
- [x] Its default is **absent**, which means off — `defaultAppConfig` does not
      declare it, and a deployment that says nothing behaves exactly as today
- [x] `src/assets/config.json` sets it to `https://dev1.ndexbio.org`, correct
      **because the committed file is dev1's** (§0.5) and safe under D-2
- [x] `isLocalhostAppOptIn()` added to `installGate.ts` — validates and compares,
      returning **off** for absent, empty, non-string, unparsable and
      opaque-origin values, warning through `logApp` for the ones that indicate a
      mistake. **No input means "any origin"**, which is the property that
      matters: this is the one field where a typo could widen the gate
- [ ] **HELD — `config.dev.json` not deleted.** 2026-08-18: the user is checking
      with the team before it goes, because it carries a `debugOptions.
      disableAutoReload` flag that exists nowhere else. Measured: **nothing reads
      it** — the key appears in no source file, no test, no build config, and not
      in the `AppConfig` type — so copying it into `config.json` would have no
      effect today. The open question is whether it names a feature someone still
      intends to build, and that is the team's call, not this project's.
      `allowsLocalhostAppsOn` was added to the file so the two configs agree on
      the one field this project introduces: if the file is ever wired up (its
      stated purpose is "values for the NDEx development server", i.e. dev1),
      a missing field would make the dev1 opt-in vanish silently
- [ ] **HELD — `debugOptions.disableAutoReload` copied into `config.json`** at
      the user's request, so the flag survives wherever the team's decision
      lands. It is still read by nothing and is still absent from the `AppConfig`
      type, so it is inert in both files — deliberately left untyped rather than
      declared, because typing it would advertise support that does not exist.
      Resolve together with the item above

### Verification (Phase 1)

- [x] The value reaches consumers through `AppConfigContext`, asserted against
      the **real `config.json` read from disk** (`src/AppConfigContext.test.ts`)
      rather than inferred from the type — a field that type-checks but is
      missing from the shipped file would leave the feature silently off
- [x] Every malformed value falls back to off, with a log line naming the field
- [x] The host's existing suites pass unchanged — **283 files, 3483 tests**
      (1 skipped); `tsc --noEmit` and `oxlint` clean; `npm run build` succeeds
- [x] **The D-2 property is tested directly**: the committed dev1 value, read
      from `config.json`, evaluated against `https://web.cytoscape.org` returns
      **false**. This is the test standing in for the production accident, and it
      fails the moment someone converts the field to a boolean
- [x] `README.md` §"Build for production" now says this field is origin-scoped
      and needs no edit, so the next person does not "helpfully" add it to the
      table as a value to change. Its `config.dev.json` reference is left in
      place, matching the hold above

> **Not yet wired.** Phase 1 delivers the value and the predicate; **no gate
> calls `isLocalhostAppOptIn` yet**. Behaviour on every host, dev1 included, is
> byte-for-byte what it was. Phase 2 is what connects it.

---

## Phase 2: The origin policy 【host】

_Roadmap H-5._

`isAllowedOrigin` today:

```js
if (allowedOrigins.includes(parsed.origin)) return true   // EXACT match, port included
const hostIsLocalhost = window.location.hostname === 'localhost' || '127.0.0.1'
const urlIsLocalhost  = parsed.hostname === 'localhost' || '127.0.0.1'
return hostIsLocalhost && urlIsLocalhost                   // BOTH must be localhost
```

**A longer allow-list cannot solve this.** `parsed.origin` carries the port, the
match is exact, and there is no wildcard — so allow-listing "localhost" means
allow-listing one port, while the scaffolder picks the first free port from 6000
and it differs per developer and per app.

### Deliverables

- [x] `isAllowedOrigin` takes the opt-in and applies D-2:
      ```ts
      return (
        (hostIsLocalhost || isLocalhostAppOptIn(allowsLocalhostAppsOn)) &&
        urlIsLocalhost
      )
      ```
      The parameter is **optional, and omitting it is off**, so a call site that
      was missed fails closed rather than open
- [x] **Default off, by configuration and not by build.** A deployment whose
      config omits the field behaves exactly as today — proven by the existing
      suite passing **unchanged**, not by inspection
- [x] `127.0.0.1` and `localhost` both covered; `localhost.evil.example.com`
      still refused
- [x] **`validateManifestUrl` got the same opt-in** (§0.5) and **moved into
      `installGate.ts`** on the way. It is a trust-boundary check like its new
      neighbours, and as a module-private function in a component file it could
      not be tested at all. Its relaxation is **narrower than the existing
      localhost-page case on purpose**: that one allows any `http:` URL, which is
      tolerable when the page is on localhost; here the page is a shared
      deployment, so the opt-in permits `http:` only for localhost addresses
- [x] Unit tests for each branch, including the case that matters most: host on a
      public origin, opt-in absent, localhost app URL → **refused**

### Verification (Phase 2)

- [x] With the opt-in off, every existing test passes unchanged — the whole
      suite went **3483 → 3505** with no edits to an existing assertion
- [x] With it on, a localhost app URL is accepted and a non-localhost,
      non-allow-listed one is still refused
- [x] **All four** `isAllowedOrigin` call sites honour it (§0.5), plus
      `validateManifestUrl` — five wirings in total:

      | Wiring | Covered by |
      | --- | --- |
      | Install from URL | `AppSettingsDialog.test.tsx` (new) |
      | Manifest Source | `AppSettingsDialog.test.tsx` (new) |
      | `?installApp=` intent | `runInstallIntents.test.ts` (new) |
      | programmatic install | `useAppManager.test.tsx` |
      | **workspace restore** | `useLoadWorkspace.test.ts` |

- [x] **Every one of the five was mutation-checked**: the third argument was
      removed at each call site and the corresponding test was confirmed to
      fail, then restored. Wiring tests are the kind that pass whether or not
      they assert anything, so "the test exists" is not evidence on its own
- [x] Restoring a saved workspace that carries a localhost app on a host without
      the opt-in imports it **inactive** and logs a reason naming the origin.
      Workspaces travel through NDEx between hosts, so this will happen to
      someone
- [x] `tsc --noEmit` and `oxlint` clean; `npm run build` succeeds;
      `remote-app-load.spec.ts` passes on Chromium (2/2)

> **Still not reachable from dev1.** Phase 2 makes the host willing; the catalog
> path that dev1 actually uses today is still the unchecked bypass Phase 3
> closes, and no dev-server banner points anywhere but a local host until
> Phase 4.

---

## Phase 3: Close the catalog bypass, compatibly 【host】

_Roadmap G-6, with the acceptance constraint that names this project._

`activateApp` calls `loadRemoteApp(id, catalogEntry.url, …)` with **no origin
check**. That is the only reason dev1 + localhost works today, through Manifest
Source — and the only reason an organization's internal catalog works. Closing it
naively deletes both.

**The naive fix is worse than the plan assumed.** Measured during Phase 3: every
app in the shipped `src/assets/apps.json` is served from `https://cytoscape.org`,
and `appInstallAllowedOrigins` names `https://apps.cytoscape.org` — a different
origin. Sending the catalog through `isAllowedOrigin` would therefore have
**disabled every app the product ships with**, not merely inconvenienced
organizations.

So the gate turns on **provenance, not origin**:

```ts
if (provenance === 'manifest' && !manifestIsUserSet) return true
return isAllowedOrigin(url, allowedOrigins, allowsLocalhostAppsOn)
```

Entries from the deployment's own default manifest are the operator's own list,
as trusted as the deployment serving them. A manifest the *user* pointed at is
not, and neither are App Store installs or restored snapshots — all of which
already passed this gate when they arrived.

### Deliverables

- [x] `isCatalogEntryAllowed` added to `installGate.ts` and applied on **both**
      paths that reach `loadRemoteApp`: `activateApp`, and the startup auto-load
      of active apps
- [x] The startup path needed the gate **separately, not incidentally**: it loads
      `catalog[id].url`, not the installed record's URL, so a user-set manifest
      declaring an existing app's id would otherwise redirect where an
      already-trusted app is fetched from
- [x] Checked before the fast re-enable path too. A module already in memory was
      loaded under whatever configuration applied then; re-mounting it would keep
      that decision alive for the life of the tab
- [x] It passes **because the deployment opted in** (Phase 2), not because the
      check is absent
- [x] The default catalog keeps working with no configuration
- [x] The refusal is reported — a message naming the app and a log line naming
      the URL — rather than a silent failure to load

This is the one phase whose effect on **production** users is visible, and it
arrives with the release that makes production a Vite build (§0.4) rather than
with any decision about stage 2. Treat it as a behavioural change, not a
hardening detail.

### Verification (Phase 3)

- [x] A user-set Manifest Source naming a non-allow-listed origin is **refused**,
      where today it loads — verified **end to end** in
      `remote-app-load.spec.ts`, which points the host at a fixture manifest
      naming `https://blocked.invalid/remoteEntry.js` and asserts both the
      refusal message and that **no request to that origin was ever made**. The
      unresolvable TLD is deliberate: without the request assertion, "blocked"
      and "failed anyway" look identical
- [x] The e2e was mutation-checked — with the gate removed it fails, so it is
      not passing for an unrelated reason
- [x] The two pre-existing e2e cases still pass, so local plugin development
      through a custom manifest is unaffected
- [x] An organizational catalog on an allow-listed origin still works, and a
      localhost app from a user-set manifest works on an opted-in deployment —
      both covered in `installGate.test.ts`
- [x] Unit-level mutation check on the subtle failure: passing a hardcoded
      `'manifest', false` instead of the real provenance would restore the bypass
      while leaving the call in place. A test fails on exactly that
- [x] Full suite **3515 passing**; `tsc --noEmit` and `oxlint` clean; build
      succeeds; `remote-app-load.spec.ts` 3/3 on Chromium

> **Gap, stated rather than papered over.** "The default catalog keeps working"
> is verified at the unit level — the bundled `cytoscape.org` URL is accepted
> with `manifest`/not-user-set — but **not end to end**, because no e2e activates
> a bundled app; every existing spec drives the catalog through a custom manifest
> URL. Worth an e2e when one exists that can activate a default-catalog entry.

- [ ] **Release note still to write.** This is the one user-visible behaviour
      change in the project, and it arrives with the deploy that makes production
      a Vite build (§0.4) — a release nobody would otherwise flag as behavioural.
      A user who configured a custom Manifest Source months ago will experience
      it as a break unless it is named.

---

## Phase 4: The app side 【examples】

The SDK already has `devHostPageUrl`, so pointing the printed install link at
dev1 is a one-line config change today. What is missing is doing it **without
editing `vite.config.ts`**, since it is a per-session choice, not a property of
the app.

### Deliverables

- [x] §0.1's gesture risk was settled in Phase 0 — the prompt is raised without
      transient activation, so the `?installApp=` deep link this phase prints is
      the right thing to print
- [x] `resolveDevHost` (new, `src/vite/devHost.ts`) resolves the host from
      options and `CYWEB_DEV_HOST`, so a developer runs
      `CYWEB_DEV_HOST=https://dev1.ndexbio.org/cytoscape npm run dev` for one
      session and the committed config is untouched
- [x] Both the install link **and the host `remoteEntry.js` the app loads** come
      from that one resolution. Redirecting only the link would produce an app
      running against the local host while telling the developer it was on dev1
- [x] Unusable values are **refused, not ignored**: a non-`http(s)` or unparsable
      value fails the build, and so does combining the variable with an explicit
      `devHostRemoteEntryUrl` — those name different hosts, which is the silent
      mismatch this package exists to catch
- [x] The dev-server banner prints the link for whichever host is configured, and
      **names the host and `(CYWEB_DEV_HOST)`** when the variable chose it — a
      link the developer does not recognise is the first sign of a stale variable
- [x] The banner says, once, that the browser will ask for local network
      permission, quoting the prompt's actual wording (§0.1) since it mentions
      neither localhost nor dev servers. Shown **only for an off-loopback host**:
      a localhost host reaching a localhost app crosses no address-space
      boundary, so the note would be noise on the common path
- [x] Trailing slashes normalized. Without it the link is
      `https://dev1.ndexbio.org/cytoscape?installApp=…`, which dev1 answers with
      a **301** — harmless there because Apache preserves the query, but this is
      the one link a developer is told to open and not every server preserves a
      query string across a directory redirect. Measured both forms against dev1
- [x] `README.md` documents the variable, the permission prompt, how to undo a
      previous Block, and that the host must have opted in

### Verification (Phase 4)

- [x] The env var changes the printed link and the resolved host entry, and
      nothing else — confirmed by running `project-template`'s dev server both
      ways and diffing the banner
- [x] With it unset, behaviour is unchanged:
      `http://localhost:5500/?installApp=…`, no permission note
- [x] 15 unit tests in `test/devHost.test.ts`, covering the unset path first
      because "an app that does not opt in must not change" is the property most
      worth pinning
- [x] `npx vitest run` in `packages/app-runtime` — **79 passing**; `typecheck`
      clean; `npm run build` succeeds; `verify:federation` **29/18/28/28/28**,
      the same counts as before this phase

---

## Phase 5: End-to-end verification

**Done — including against dev1.** PR #677 merged 2026-08-19 19:02 UTC and dev1
was redeployed (assets stamped 20:28 UTC), which unblocked the two items this
phase had to leave open. Both are now closed below; the earlier local
reproduction is kept because it covers a case dev1 cannot.

### Verified — a real browser, a real host, a real app server

Host: the dev build served on this machine's LAN address
(`http://172.20.116.215:5500`), so `hostIsLocalhost` is **false** and the opt-in
is the only way through. App: `project-template` on `http://localhost:5555`.
Driven with Playwright.

- [x] **Positive** — `allowsLocalhostAppsOn` naming the host's own origin. The
      whole chain executed, confirmed by the requests the app server actually
      received:

      ```
      /cyweb-app.json                → manifest fetched
      [confirmation dialog shown, confirmed]
      /remoteEntry.js                → the bundle was loaded AS CODE
      …/mfRuntimePlugin.js           → the runtime resolver ran
      /src/index.ts, /src/TemplateApp.tsx, virtual:cyweb-app-meta
                                     → the app module was evaluated
      ```

      Asserting on the app server's request log rather than on a DOM marker
      turned out to matter: the app auto-activates on install, so the App
      Manager toggle this first looked for was never rendered and an entirely
      successful run reported failure.

- [x] **Negative** — the same everything, with `allowsLocalhostAppsOn` naming a
      *different* deployment. **No confirmation dialog, and `/remoteEntry.js` was
      never requested.** The manifest is still fetched, because the origin check
      runs on the entry inside it; nothing is executed
- [x] The refusal is **user-visible**, not a console line: *"Failed to install
      app from http://localhost:5555/cyweb-app.json: its URL is not from an
      allowed origin"*. Nearly recorded as silent — the toast auto-dismisses
      after 5s and the first check looked too late
- [x] `preflight:host` against the local build → **10/10**. The host changes did
      not disturb the descriptor contract

### Verified against dev1 — 2026-08-19

App: `project-template` on `http://localhost:5555`, started with
`./dev-start.sh apps project-template --against https://dev1.ndexbio.org/cytoscape`.
Host: the real dev1. Driven with Playwright; the deep link the dev server printed
is the one that was opened.

- [x] **Stage 1 is achieved.** With `local-network-access` granted for
      `https://dev1.ndexbio.org`, the whole chain ran against the deployed host:
      manifest fetched → confirmation dialog → confirmed → `/remoteEntry.js` →
      the app's own modules. **14 requests reached the dev server**, the last of
      them the app's source. A developer running only their own app now gets a
      working install on a shared host
- [x] **The browser layer really is in play here, unlike the local
      reproduction.** With the permission denied, the same deep link fails:

      ```
      http://localhost:5555/cyweb-app.json :: net::ERR_FAILED
      console: blocked by CORS policy: Permission was denied for this
               request to access the loopback address space
      ```

      This is what the LAN-address reproduction could not show, and it confirms
      §0.1's measurement applies to this exact flow rather than only to a
      synthetic one
- [x] **The prompt is raised by the install fetch itself**, not merely by the
      Cytoscape Desktop poll that §0.6 found firing at load. Verified by routing
      `127.0.0.1:1234` to an abort so the manifest fetch was the only
      public→loopback request left; the prompt still appeared, in a headed
      browser, with the same wording §0.1 captured
- [x] **The denied path is illegible, and this is the finding Phase 6 has to
      act on.** The message a developer sees is:

      > Failed to install app from http://localhost:5555/cyweb-app.json:
      > **Failed to fetch**

      It names neither the permission nor the fix. Combined with §0.6 — the
      permission is per-origin and a Block from months ago still applies — a
      developer can be permanently stuck behind a message that says nothing.
      Documenting the prompt is not enough; the docs must name **"Failed to
      fetch"** as the symptom

### Not verified, and why
- [x] **The browser permission was not exercised, despite the plan assuming it
      would be.** A private LAN address was expected to make loopback a more
      private space and trigger Local Network Access; it does not. With the
      permission **denied**, the install still succeeded — the restriction §0.1
      measured is **public → loopback**, and a private origin does not cross it.
      So this reproduction covers the *host gate* thoroughly and the *browser
      layer* not at all. Only a genuinely public origin — dev1 — can cover that,
      which §0.1 already did in isolation

      Consequence for Phase 4: `needsLocalNetworkPermission` warns for **any**
      non-loopback host, including private addresses that will not prompt.
      Deliberate — a hostname cannot be classified without resolving it, and
      over-warning costs a line of output while under-warning costs a developer
      an unexplained hang

- [x] ~~The prompt on the deep-link path, in a headed browser.~~ Closed above.

### Found while testing — worth knowing before reproducing this

- [x] **Keycloak stops the flow on an unregistered origin.** On the LAN address
      the host redirects to `dev1.ndexbio.org/auth2`, which answers **400**
      because that `redirect_uri` is not registered, and the boot never reaches
      the install intents. Pointing `keycloakConfig.url` at an unreachable
      address made the boot fall through — *"authentication timed out, continuing
      without SSO"* — and the flow proceeded. Anyone reproducing this locally
      will hit the same wall first, and the symptom (a blank redirect) names
      neither Keycloak nor the cause

---

## Phase 6: Documentation

- [x] `guides/getting-started.md` §5c no longer says this cannot be done. The
      "what you cannot do yet" note is replaced by a pointer to **§5d, Develop
      Against a Shared Host** — a new section, because checking a *deployed* app
      against a real host and developing against one are different activities
      and cramming both into §5c made neither clear
- [x] **D-3, stated more narrowly than planned.** The flow was measured on
      **Chrome**; Edge shares the engine and should behave the same but was not
      tested, and that is what the guide says. Firefox and Safari are not
      claimed either way. Writing "Chrome and Edge are verified" would have been
      the kind of small overclaim this project has spent its time avoiding
- [x] The prompt is reproduced **as captured**, in its own words, with "click
      Allow". Rendered as text rather than a screenshot: the guides carry no
      images, and the wording — which is the whole point — stays greppable and
      diffable this way
- [x] How to **undo a previous Block** is documented, including *why* a
      developer may have one: the grant is per site rather than per port, and
      §0.6's Cytoscape Desktop poll raises the same prompt at load for an
      unrelated reason
- [x] **The `Failed to fetch` symptom is named** — the Phase 5 finding, and the
      one that most needed writing down. It appears in getting-started §5d and
      as a `troubleshooting.md` **Runtime Errors** entry, which is where someone
      already stuck will look. That entry carries the console text, the reset
      instructions, and the fact that no server header can fix it
- [x] Roadmap updated: **H-5 and G-6 marked DONE**, G-6's acceptance constraint
      recorded as *verified rather than promised*, with the two non-obvious
      things it turned on (provenance not origin; stored `AppSource` is not that
      provenance). **H-1 stays open** — and the roadmap now records that H-5 did
      **not** need it after all, because an origin-scoped opt-in removes the
      coupling that made a runtime config a prerequisite
- [x] What this is for, in one sentence rather than a warning banner: dev1 is a
      shared host, and pointing it at your own `localhost` is asking your own
      browser to trust your own machine
- [x] Production is named as **not this, yet**, with the reason — re-measured
      2026-08-19 rather than repeated from §0.4: `web.cytoscape.org` is still
      the Webpack build (assets stamped 2026-07-08), so an app built with this
      toolchain resolves no exports against it and fails silently
- [x] **README Quick Start** offers it too, since removing the host checkout is
      the barrier-to-entry improvement this whole project exists for. The stale
      banner text (`Install it into a local host:`) was corrected in both the
      README and the guide to what the dev server actually prints now
- [ ] **The docs describe an unreleased capability — a release is needed.**
      Found while checking that a scaffolded app can actually do what the README
      now says: the published `@cytoscape-web/app-runtime@0.1.0` has no
      `devHost.js`, and `create-cytoscape-app` pins `^0.1.0`. A newly scaffolded
      app therefore **ignores `CYWEB_DEV_HOST` silently** — no error, the banner
      simply still names `localhost:5500`, which is precisely the mismatch class
      this package exists to prevent.

      Both documents now state the version requirement and name the silent
      symptom, so nothing published is untrue. But the flow is only reachable
      from this repository's own apps until a release carries it, and
      `SDK_VERSION` in `packages/create-cytoscape-app/src/scaffold.ts` has to be
      bumped in the same change — `^0.1.0` would not admit a `0.2.0`.

---

## Phase 7: Production (`web.cytoscape.org`) — stage 2 【host】

The end goal. Deliberately last, and deliberately gated: dev1 exists so that this
phase is a decision backed by operating experience rather than a hope.

By the time this phase is reachable, **the code is already in production** — it
shipped with the release that made production a Vite build (§0.4). Nothing here
is an implementation task. This phase is one configuration value and the argument
for setting it.

### Prerequisites

- [ ] `development` has been deployed to production as the stable release, so
      production is a Vite build carrying Phases 1–3
- [ ] `preflight:host -- https://web.cytoscape.org` → 10/10, the same bar dev1
      already clears — the direct check that the deploy landed
- [ ] Production shipped with the opt-in **off**, confirmed against the served
      `config.json` rather than the committed one. If it shipped on, stage 2
      happened by accident and the response is to turn it off and review, not to
      ratify it
- [ ] Phases 1–6 have been running on dev1 long enough to have found what review
      did not

### The decision to actually make

Production differs from dev1 in the way that matters: **its users are not app
developers.** The flag is per-deployment and the code is already there, so
turning it on is one edit to a served file — which is exactly why the reasoning
has to be written down before, not after.

- [ ] State the threat model plainly. With the flag on, a page on
      `web.cytoscape.org` will load and execute code served from the visitor's
      own machine. Reaching a visitor requires something already listening on
      their loopback **and** a way to point the host at it — the `?installApp=`
      deep link is that way, and it is a link, which is to say it travels
- [ ] Weigh the two gates that stand in front of it. The browser's local network
      permission is a real prompt, but it is granted **per origin, once**, and it
      covers all of loopback from then on. The install UI is the second gate and
      the one whose wording is under our control
- [ ] Decide whether production's opt-in is the same boolean or something
      narrower — a per-session developer mode the user turns on explicitly, which
      expires. This is the phase where the answer stops being obvious, and Theme
      G is where it belongs
- [ ] Confirm the answer is written where an operator will find it, since the
      flag is now one line in a served file and a future operator will not
      reconstruct the reasoning from the diff

### Verification (Phase 7)

- [ ] With the flag off, production behaves exactly as it does today —
      re-verified against the real deployment, not inferred from dev1
- [ ] With it on, the dev1 flow works identically against production
- [ ] The install UI names the origin being installed from, in wording a
      non-developer can act on. This is the last gate before execution and the
      only one we write

---

## Notes for whoever picks this up

**The blocker was never where the roadmap thought it was.** Theme H framed this
as an allow-list problem, and the allow-list is genuinely part of it — but the
browser blocks the request before the host's code is consulted at all. Phase 0
measured that; had it been assumed, Phases 1–3 could have been built and the flow
would still not have worked.

**Nothing here is needed for the App SDK to be useful.** Developing against a
local host works today and is what the documentation recommends. This project
buys a shared host that developers do not have to run themselves — worth having,
not on the critical path.

**Do not collapse the two stages — and note that the code does not give you the
choice.** Stage 1 is reachable with a security posture stage 2 would not accept:
dev1's users are app developers who chose to be there, production's are not.
Building both at once means arguing the harder case with no operating evidence,
and the likely outcome serves neither — a production-grade restriction that makes
dev1 awkward to develop against, or a dev-grade opt-in reaching production.

The subtlety is that **the two stages are separated by a value, not by a
release.** Everything built here rides `development` into production. So "we will
decide about production later" is only true of the flag; the code path, the
catalog change and the config loader all arrive on the ordinary release train.
Design each of them as though production were already running it, because by the
time Phase 7 is discussed, it is.

**One thing decided in Phase 2 governs whether stage 2 stays reachable**: the
opt-in has to be a value production *has not set*, never a branch production
*cannot take*. Compiling it out is the cheap implementation and the one that ends
the project at stage 1.
