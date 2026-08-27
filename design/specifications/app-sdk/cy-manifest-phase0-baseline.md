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

- [ ] **Not captured.** Requires submitting one unmodified current-format ZIP to
      `apps-stage.cytoscape.org` and recording the outcome, which needs a
      submitter account on that server. Phase 4's "the current Store still accepts
      the archive" verification compares against this, so it must be captured
      before Phase 4 closes — not before Phase 1 starts.
