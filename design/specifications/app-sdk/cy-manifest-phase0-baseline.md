# Phase 0 Baseline — `cy-manifest.json`

> Captured 2026-08-27 at `6bd1e50` + working tree, on Linux (WSL2), Node per
> `.nvmrc`. Produced by `npm run build` followed by `npm run verify:federation`.
>
> Phase 3 (verifier relocation) must reproduce the check counts below exactly,
> and Phase 4 (classifier) must reproduce the member classification below with
> nothing newly denied and nothing newly admitted.
>
> _Checklist: [cy-manifest-checklist.md](cy-manifest-checklist.md) Phase 0 —
> "Deliverables — baseline". Design: [cy-manifest.md](cy-manifest.md) §6.3._

## 1. `cyweb-app verify` check counts

| App | Checks | Absolute build-machine paths in `remoteEntry.js` |
| --- | ---: | ---: |
| hello-world | 29 | 10 |
| network-statistics | 18 | 7 |
| network-workflows | 28 | 10 |
| project-template | 28 | 10 |
| claude-bridge | 28 | 10 |

`network-statistics` is lower because it shares nothing, so the per-package share
assertions have nothing to assert. These counts are **higher than the App SDK
Phase 0 baseline** (27/16/26/26/26) — checks were added since. The numbers in
this table, not those, are what Phase 3 compares against.

Every app embeds absolute paths in `remoteEntry.js` on a correct build. That is
the note §6.3 escalates to a packaging warning: it is expected from the MF SSR
loader, and it is exactly why a developer-uploaded ZIP is worth warning about.

## 2. Extension census across all five `dist/`

```
     91 .js
     15 .json
      5 .html
```

No non-regular files (`find ! -type f ! -type d` is empty in all five).

## 3. Member classification under the §6.3 rules

Applying the design's ordered classifier to today's output:

| Class | Rule | Members |
| --- | --- | --- |
| Denied — SSR entry | exact root `remoteEntry.ssr.js` | 5 (one per app) |
| Denied — SSR loader | prefix `assets/ssrEntryLoader-` | 5 |
| Denied — module runner | prefix `assets/module-runner-` | 5 |
| Denied — SSR exposes | prefix `assets/virtual_mf-exposes-ssr` | 5 |
| Denied — Federation metadata | exact `mf-manifest.json`, `mf-stats.json` | 10 |
| Denied — Vite metadata | prefix `.vite/` | 5 (`.vite/manifest.json`) |
| Denied — HTML | suffix `.html` | 5 (`index.html`) |
| Allowed — entry | exact root `remoteEntry.js` | 5 |
| Allowed — assets | closed extension list | the remaining `assets/**.js` |
| Unmatched | fatal | **0** |

**The hashed SSR names confirm R§20.3.1.** The real members are
`assets/ssrEntryLoader-QNOvZero.js`, `assets/module-runner-DOwQZiHU.js`, and
`assets/virtual_mf-exposes-ssr___mfe_internal__hello__remoteEntry_js-Dhm2SjpK.js`
— an exact-name deny would have readmitted every one of them through the `.js`
allow. The prefix forms in §6.3 match today's output exactly.

## 4. Finding: the examples cannot supply the asset-class fixtures

**Today's five apps emit only `.js`, `.json`, and `.html`.** Of the closed
allowlist, only `.js` is exercised; `.css`, `.wasm`, `.svg`, the five raster
formats, and the four font formats appear **nowhere**. Every `.json` in the tree
(`mf-manifest.json`, `mf-stats.json`, `.vite/manifest.json`) is **denied**, so
even the `.json` entry in the assets allowlist currently admits nothing.

Two consequences for Phase 4:

- the "one fixture per supported asset class" tests must be **synthetic** — built
  from a purpose-made `dist/` fixture, not harvested from an example build. This
  is what the checklist means by "closed by decision, not inventory"; the
  inventory now confirms it empirically rather than by argument;
- the allowlist is **wider than anything the repository produces**. That is the
  intended direction — an unmatched extension is fatal, so widening later is
  additive and safe — but it means no example build can ever prove the allow half
  of the classifier. Only the deny half is covered by real output.

## 5. Current-Store submission baseline

One archive built exactly as §4's third-party path produces it — scaffolded
outside the repository, `package.json` given `author`/`license`/`repository`/
`homepage`/`keywords`, `npm run build:zip` — was submitted by hand to
`apps-stage.cytoscape.org` on 2026-08-28 and published.

| | |
| --- | --- |
| Submitted | `submissionTest-1.0.0.zip`, 31,682 bytes, 15 members |
| | `sha256:0b7cbf8e894130f09c0686aed1b799c59ccd4665f031a5b385078e7cd7c9240c` |
| `cyweb.id` in the bundle | `submissionTest` |
| Display name typed into the form | `Cytoscape Web Submission Test` |
| Listing | `https://apps-stage.cytoscape.org/apps/cytoscapewebsubmissiontest` |
| Artifact root | `https://apps-stage.cytoscape.org/web/cytoscapewebsubmissiontest/1.0.0/` |

### 5.1 The identity mismatch, reproduced

**Store-derived id: `cytoscapewebsubmissiontest`. Bundle `CyApp.id`:
`submissionTest`.** The derivation rule is exactly the predicted one — strip
non-word characters from the display name, lowercase — and the two can never
agree, because a JavaScript identifier cannot survive it.

The published per-app manifest is a one-element `AppCatalogEntry[]`:

```json
[{"id": "cytoscapewebsubmissiontest", "name": "Cytoscape Web Submission Test",
  "version": "1.0.0",
  "url": "https://apps-stage.cytoscape.org/web/cytoscapewebsubmissiontest/1.0.0/remoteEntry.js",
  "author": "Keiichiro Ono", "description": "…", "license": "MIT",
  "tags": ["submission-test", "reference"]}]
```

Feeding that entry to the host reaches `loadRemoteApp(id, url, …)` with
`id = "cytoscapewebsubmissiontest"`, loads `./AppConfig`, and hits:

```ts
if (remoteApp.id !== id) {          // "submissionTest" !== "cytoscapewebsubmissiontest"
  logApp.warn(`[loadRemoteApp]: Remote app id mismatch. Expected "${id}", received "${remoteApp.id}" …`)
  return undefined
}
```

The app does not load. There is no error surfaced to the user — one console
warning, and `undefined`. **This is a published artifact demonstrating the
failure, not an argument that it could happen.**

### 5.2 What the Store already does right

Worth stating, because the §11 requirements should not read as a list of
complaints:

- **the publication layout is already `/web/{id}/{version}/`** — the immutable
  versioned shape §11.10 asks for, with `manifest.json` and `remoteEntry.js`
  beside each other;
- **the per-app manifest is already a one-element array** that today's host
  parser accepts, with `author`, `description`, `license`, and `tags` carried
  through;
- **the archive is republished byte-for-byte** — the served `remoteEntry.js`
  hashes identically to the locally built one;
- **`Access-Control-Allow-Origin: *` is present** on the manifest, the entry,
  and a transitive chunk (`assets/src-*.js`), so cross-origin ESM loading works.

### 5.3 Gaps measured on the published artifact

| Observation | Against |
| --- | --- |
| `Content-Type: application/javascript` on JS | §11.10 asks for `text/javascript; charset=utf-8` — functional today, but unstated |
| **No `X-Content-Type-Options: nosniff`** | §11.10 |
| **No `Cross-Origin-Resource-Policy`** | §11.10 asks for an explicit `cross-origin` |
| `Cache-Control: no-cache, no-store, must-revalidate` **on versioned artifacts** | §11.10/§11.13 assumed long-lived immutable caching. The current policy makes revocation trivial and every load a refetch — a deliberate-looking trade the Store team should confirm rather than have us assume |
| **`index.html` is published** (200 on the version root) | §6.3 excludes it from the archive precisely so developer HTML does not land on a Store origin. Today it does |
| `mf-manifest.json` → 404 | correct: the archive never carried it |
| No `type`, `compatibleHostVersions`, `repository`, `homepage`, or `icon` in the entry | the form does not collect them; §11.5 defines the projection |

### 5.4 Manual entry, measured

`author`, `description`, `license`, and `tags` reached the catalog **only
because they were typed into the form**. Every one of them was already in the
submitted project's `package.json` and none of them was in the archive — which
is the whole of issue #8 in one submission.
