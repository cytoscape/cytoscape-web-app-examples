# The cookbook runner

`run.mjs` runs every recipe's case inside a real Cytoscape Web, in a fresh
browser, and records what passed in [`../verified.json`](../verified.json).

It runs on your machine, not in CI. CI checks only that the record matches the
sources.

## Start a host

The cookbook supports Cytoscape Web 1.1.0 and later, and a complete record
needs a run on two releases: the floor and the latest. They are listed, with
their tag commits, in [`hosts.json`](hosts.json).

Use a clean checkout of each tag. Two worktrees of one clone are enough:

```bash
git clone https://github.com/cytoscape/cytoscape-web.git
cd cytoscape-web
git worktree add --detach ../cytoscape-web-v1.1.0 v1.1.0
git worktree add --detach ../cytoscape-web-v1.1.1 v1.1.1
```

Then, in one worktree at a time (both use port 5500):

```bash
npm ci
npx vite --host        # http://localhost:5500
```

- **Node 24.22.1 or later.** 1.1.1 requires it and both tags set
  `engine-strict`. If your Node is pinned lower, for example by a `mise.toml`:
  `mise exec node@24.22.1 -- npm ci`, and the same prefix for `npx vite`.
- **`npx vite --host`, not `npm run dev`.** The script also opens a browser
  window.
- **Start from a clean checkout.** A dev server serves uncommitted changes
  too, and the commit the runner records does not show them.
- The example apps' dev servers may be running or not. It makes no
  difference: see "What the runner does to the page".

## Run the cases

From the repository root, after `npm ci`:

```bash
node cookbook/runner/run.mjs                              # every case
node cookbook/runner/run.mjs style/color-nodes-by-numeric-column
node cookbook/runner/run.mjs --selftest                   # must report a failure
node cookbook/runner/run.mjs --host https://dev1.ndexbio.org/cytoscape/
```

The first run needs the browser: `npx playwright install chromium`.

```
Cookbook cases — Cytoscape Web 1.1.0 (6619411b) at http://localhost:5500/

  ✓ elements/add-nodes-to-network
  ✓ events/follow-current-network
  ✓ style/color-nodes-by-numeric-column

✓ 3 cases passed
  recorded in cookbook/verified.json: Cytoscape Web 1.1.0 (floor). The record now names: 1.1.0
```

## Refresh the record

After changing anything under `recipes/`, `wiring/` or `runner/`, or
`cookbook/tsconfig.json`:

1. Start the 1.1.0 host, and run `node cookbook/runner/run.mjs`.
2. Stop it, start the 1.1.1 host, and run it again.
3. `node scripts/cookbook-index.mjs --check` must pass.
4. Commit `verified.json` with the change.

The first run after a change drops the entries made from the old sources, so
the record names one release until the second run.

## The record

| Field | Meaning |
|---|---|
| `apiTypes.version`, `.source` | The `@cytoscape-web/api-types` the type check resolved. `registry` only when the installed package has the integrity `package-lock.json` pins; anything else, a local tarball of the same version included, is `local` |
| `digest` | A hash of `recipes/`, `wiring/`, `runner/` and `cookbook/tsconfig.json`, Markdown excluded |
| `hosts[]` | One entry per release: its version, the commit the host reported, the number of cases, and when |

**An entry is written only when:**

- every case ran and passed, and nothing was left behind;
- the host's commit is the tag commit of a release in `hosts.json`. The
  version is not enough: the host's `development`, and pre-release builds such
  as dev1's, report the version of the release that follows them. Against
  such a host the cases run, and nothing is recorded.

`node scripts/cookbook-index.mjs --check` fails when the digest or the
api-types version no longer matches, when a release in `hosts.json` has no
entry, or when the record or the installed api-types is not the registry
package. CI runs it. After developing against a local tarball, run `npm ci`
before the runner.

## What the runner does to the page

- **It serves an empty app catalog.** From 1.1.1 on, the host turns on every
  app of its catalog, and a dev server's catalog lists this repository's four
  apps. The runner answers the catalog request with `[]`, and fails if the
  host never made that request or fetched any `remoteEntry.js` but its own
  (the URL it publishes in `window.__CYWEB_HOST__.remoteEntry`). It
  matches the catalog's exact path: a 1.1.1 dev server also imports
  `/src/assets/apps.json` as a module, and answering that keeps the host from
  starting.
- **It aborts analytics requests.** A local host sends Google Analytics page
  views, and 1.1.0 does not wait for consent.
- **It turns on the host's debug switch** (`localStorage`), because the boot
  report, where the host's commit is, exists only then. It waits for the
  report separately from `whenReady()`, with a time limit.
- **It closes the welcome dialog and the cookie banner** of a fresh profile by
  their own buttons.
- **It changes no host file.**

Each case builds its own network and deletes it at the end, pass or fail. The
runner compares the workspace's networks before and after, and fails on any
left behind.

## Read a failure

```
  ✗ style/color-nodes-by-numeric-column  (the lowest value is blue)
```

The text in parentheses is the check that did not hold, in the case's own
words: find it in `cases/<name>.ts`. `threw: …` means the case or the recipe
threw, which a recipe never should. A message from the runner itself (no boot
report, no catalog request, another app loaded) means the result could not be
trusted, whatever the cases did.

## The self-test

`--selftest` runs one case that must fail, and checks that the runner
reported the failure and still deleted the case's network. Without it, a
runner that passes everything would look the same as one that works.

## Limits

- **Owner-bound and component recipes do not run here.** They need an app's
  own API object, and run in the verification app (Phase 3).
- **`events/follow-current-network`, step 3.** The host delays a network's
  data only after a page reload, which a case cannot do without losing the
  injected bundle. The case dispatches `network:loaded` itself for that step.
  Steps 1, 2 and 4 use the host's own events.
- A fresh browser context starts with an empty workspace, so a run never sees
  networks from your own sessions.
