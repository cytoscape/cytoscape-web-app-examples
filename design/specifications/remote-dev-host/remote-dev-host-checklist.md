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
> **Status: NOT STARTED.** Phase 0 is measurement and decisions; nothing below it
> has been built.
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

- [ ] The localhost special case becomes the opt-in decided in D-2:
      ```js
      const optedIn = cfg.allowsLocalhostAppsOn === window.location.origin
      return (hostIsLocalhost || optedIn) && urlIsLocalhost
      ```
      One origin-scoped value rather than N ports
- [ ] **Default off, by configuration and not by build.** A deployment whose
      config omits the field behaves exactly as today — that is the regression
      test, not a nicety. The same binary with a matching origin must allow
      localhost, because that is precisely what stage 2 asks of production
- [ ] `127.0.0.1` and `localhost` both covered; anything else still refused,
      including a hostname that merely contains "localhost"
- [ ] **`validateManifestUrl` gets the same opt-in** (§0.5). It is a separate
      protocol check with its own `isDev`, and leaving it out means a developer
      on dev1 still cannot type their `http://localhost:…` manifest URL after
      every other part of this project has shipped
- [ ] Unit tests for each branch, including the case that matters most: host on a
      public origin, flag OFF, localhost app URL → **refused**

### Verification (Phase 2)

- [ ] With the flag off, every existing `installGate` test passes unchanged
- [ ] With the flag on, a localhost app URL is accepted and a non-localhost,
      non-allow-listed one is still refused
- [ ] **All four** `isAllowedOrigin` call sites honour it (§0.5) — Install from
      URL, the `?installApp=` intent, programmatic install, and **workspace
      restore**, the one easiest to miss
- [ ] Restoring a saved workspace that carries a localhost app on a host with the
      flag **off** fails in a way that names the reason. Workspaces travel
      through NDEx between hosts, so this will happen to someone

---

## Phase 3: Close the catalog bypass, compatibly 【host】

_Roadmap G-6, with the acceptance constraint that names this project._

`activateApp` calls `loadRemoteApp(id, catalogEntry.url, …)` with **no origin
check**. That is the only reason dev1 + localhost works today, through Manifest
Source — and the only reason an organization's internal catalog works. Closing it
naively deletes both.

### Deliverables

- [ ] The catalog path goes through the same gate as the install paths
- [ ] It passes **because the host opted in** (Phase 2), not because the check is
      absent
- [ ] The default catalog (`/apps.json`, same origin, operator-curated) keeps
      working with no configuration

This is the one phase whose effect on **production** users is visible, and it
arrives with the release that makes production a Vite build (§0.4) rather than
with any decision about stage 2. Treat it as a behavioural change, not a
hardening detail.

### Verification (Phase 3)

- [ ] A user-set Manifest Source naming a non-allow-listed origin is **refused**,
      where today it loads
- [ ] The refusal is written up for the release notes of the deploy that carries
      it — a user who set this up months ago will otherwise read it as a break
- [ ] dev1 + localhost still works with the Phase 2 flag on — the acceptance
      constraint, verified end to end rather than asserted
- [ ] An organizational catalog on an allow-listed internal origin still works

---

## Phase 4: The app side 【examples】

The SDK already has `devHostPageUrl`, so pointing the printed install link at
dev1 is a one-line config change today. What is missing is doing it **without
editing `vite.config.ts`**, since it is a per-session choice, not a property of
the app.

### Deliverables

- [ ] **Settle §0.1's gesture risk first.** This phase prints a `?installApp=`
      deep link; if that path cannot raise the permission prompt, what the banner
      should print is the Install-from-URL instruction instead. Building the
      banner before knowing this is building the wrong banner
- [ ] `devHostPageUrl` can be set from the environment, so a developer can run
      `CYWEB_DEV_HOST=https://dev1.ndexbio.org/cytoscape npm run dev` for one
      session and leave the committed config alone
- [ ] The dev-server banner prints the link for whichever host is configured
- [ ] The banner says, once, that the browser will ask for local network
      permission the first time — the failure without it is a CORS message that
      names neither the cause nor the fix

### Verification (Phase 4)

- [ ] The env var changes the printed link and nothing else
- [ ] With it unset, behaviour is unchanged

---

## Phase 5: End-to-end verification

- [ ] **Automated**: Playwright against dev1, granting `local-network-access` for
      the host origin, installing an app served from `localhost`, asserting it
      mounts. Without the grant this fails for reasons unrelated to the code, so
      the grant is part of the test, not a workaround. Note what it therefore
      **cannot** prove: granting programmatically skips the prompt, so this test
      is green in exactly the world where a real user is never asked (§0.1)
- [ ] **Manual, in a headed browser** — the only step that can settle §0.1's open
      risk: the prompt actually appears **on the deep-link path**, the flow works
      after allowing, and the failure after *denying* is legible enough to act
      on. If no prompt appears without a click, Phase 4's banner is pointing at a
      flow that cannot work and the reorder in §0.1 is required
- [ ] `preflight:host -- https://dev1.ndexbio.org/cytoscape` still 10/10 after
      the host changes

---

## Phase 6: Documentation

- [ ] `guides/getting-started.md` §5c currently says this **cannot** be done and
      names H-1 and H-5. Replace with the supported flow, including the browser
      permission step
- [ ] State **D-3** plainly: Chrome and Edge are what this flow is verified on;
      Firefox and Safari are not claimed either way. Do not write a
      compatibility table for browsers nobody measured
- [ ] Show the prompt **as captured** (§0.1) and say to click Allow. The wording
      names neither localhost nor a dev server, so a screenshot does the work
      that prose cannot
- [ ] Say how to **undo a previous Block** — the icon at the left of the address
      bar. Per §0.6 a developer may have blocked this long ago for unrelated
      reasons, and the resulting failure is a hang with no message
- [ ] The roadmap's Theme H entries for H-1 and H-5 are marked done, and G-6's
      acceptance constraint records that it was verified rather than promised
- [ ] Say plainly what this is for. dev1 is a **shared** host: an app installed
      there is installed for whoever is using that browser profile, and a
      developer pointing it at their own `localhost` is asking their own browser
      to trust their own machine. That is a small risk and worth one sentence,
      not a warning banner
- [ ] Say that production is **not** this, yet — and say why, so the question
      stops being asked in issues. Documenting stage 2 as planned costs a
      sentence; leaving it out invites developers to try `web.cytoscape.org` and
      hit §0.4's silent no-exports failure with nothing to read

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
