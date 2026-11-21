# The cookbook runner

`run.mjs` runs every recipe's case inside a real Cytoscape Web, in a fresh
browser, and records what passed in [`../verified.json`](../verified.json).

Two kinds of case run in one page:

- **Host-wide recipes' cases** (`cases/`) are bundled by the runner and
  injected into the page. They get the anonymous `window.CyWebApi`.
- **Owner-bound and component recipes' cases** (`app/cases/`), and the
  **behavior cases** (`app/behaviors/`), are part of the *verification app*
  (`app/`), an unpublished app the runner starts and installs into the host
  on every run. They pass the app's own API object, `harness.apis`, to their
  recipes, and render with React.

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
- **Ports 6310 and 6311 must be free.** The runner starts the verification
  app and its rival there, and stops them at the end.

## Run the cases

From the repository root, after `npm ci`:

```bash
node cookbook/runner/run.mjs                              # every case
node cookbook/runner/run.mjs style/color-nodes-by-numeric-column
node cookbook/runner/run.mjs ui/link-out-from-node behavior/disable
node cookbook/runner/run.mjs --selftest                   # must report a failure
node cookbook/runner/run.mjs --host https://dev1.ndexbio.org/cytoscape/
```

The first run needs the browser: `npx playwright install chromium`. The
verification app is built from `@cytoscape-web/app-runtime`, so build it once
too: `npm run build:sdk`.

A case id is a recipe's id, or `behavior/<name>`. Cases run in the order of
the index, behaviors after recipes, and `behavior/disable` last: it turns the
verification app off.

Against a deployed host (`--host`), the verification apps are still served
from `localhost`. A host installs apps from `localhost` only when its
configuration opts in for its own origin (`allowsLocalhostAppsOn`); otherwise
the run stops at the install step.

The federation plugin warns, for each app, that `@emotion/styled` "is not
installed locally". The package has a default export only, which the plugin
takes for a missing package. The run is not affected.

```
Cookbook cases — Cytoscape Web 1.1.0 (6619411b) at http://localhost:5500/

  ✓ data/add-computed-column
  …
  ✓ ui/persist-results-per-network
  ✓ behavior/duplicate-tab-id
  ✓ behavior/disable

✓ 27 cases passed
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
| `hosts[]` | One entry per release: its version, the commit the host reported, the number of cases (every recipe's, and the behavior cases), and when |

**An entry is written only when:**

- every case ran and passed, and nothing was left behind;
- the sources and the installed api-types are the same at the end of the run
  as when the bundle was built. Edit nothing while the runner runs;
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
- **It installs the verification app and its rival**, with one
  `?installApp=` link naming both, and confirms the host's install dialog.
  Confirming also turns them on. They are the only apps in the page, and the
  check above sets their `remoteEntry.js` aside like the host's own.
- **It waits until the verification app is active**: until its `mount()` has
  published its cases, and its own tab, opened by id, shows its panel. On
  1.1.0 the right pane's first tab is the host's Sub Network Viewer, so the
  tab is chosen by id, which is right on 1.1.1 too.
- **It marks the welcome dialog as seen** (`localStorage`, `cyweb.onboarding`)
  and closes the cookie banner by its own button. The welcome dialog opens
  when the host is ready, which can be after the install, over whatever a case
  is clicking.
- **It changes no host file.**

Each case builds its own network and deletes it at the end, pass or fail. The
runner compares the workspace's networks before and after, and fails on any
left behind.

## The verification app

`app/` is an app like the examples, with its own `package.json` and `cyweb`
block, and it is neither a workspace nor in `apps.manifest.json`: it is never
built or published. Its imports resolve from the repository's `node_modules`.

- **`src/index.ts`** registers two right-panel tabs and an Apps menu entry
  (the one `ui/menu-action-with-dialog` opens its dialog from). Its `mount()`
  stores `context.apis` in `harness.apis` and publishes the cases on
  `window.__cookbookApp`. It runs no case, and waits for nothing.
- **`src/harness.ts`** holds `harness.apis`. The generator checks that
  `mount()` is the only place that writes it.
- **`rival/`** is a second app with one tab, whose id (`results`) the
  verification app also uses, and which comes first in the strip. It exists
  for `behavior/duplicate-tab-id` and `ui/open-own-panel-after-action`.
- **Behavior cases** check what no recipe can: `duplicate-tab-id` (the app's
  own `panel.open` selects its own tab, the anonymous one the rival's) and
  `disable` (after the app's switch in Apps ▸ Manage Apps... is turned off,
  what it registered is gone, what `window.CyWebApi` registered is not, and
  its `appData` is kept).

**Cases that use the host's UI** do it through `ctx.ui` (see `harness.ts`),
which the runner performs with Playwright: real clicks, typing and
right-clicks. Two things learned doing so, on 1.1.0:

- A right-click that comes with the pointer straight from outside the canvas,
  from a dialog's button or back from another window, opened no context
  menu. `rightClickNode` moves the pointer over the node first, as a hand
  would.
- After a link-out window closes, the host page is brought to the front
  again before anything else is clicked.

## Read a failure

```
  ✗ style/color-nodes-by-numeric-column  (the lowest value is blue)
```

The text in parentheses is the check that did not hold, in the case's own
words: find it in `cases/<name>.ts` or `app/cases/<name>.ts`. `threw: …` means
the case or the recipe threw, which a recipe never should; for a UI action it
names what was not found. A message from the runner itself (no boot report,
no catalog request, another app loaded, no install dialog) means the result
could not be trusted, whatever the cases did.

To see what was on the page when a UI action failed, run with
`COOKBOOK_SCREENSHOTS=<directory>`: the runner keeps a screenshot of each
failure there and prints its path.

## The self-test

`--selftest` runs one case that must fail, and checks that the runner
reported the failure and still deleted the case's network. Without it, a
runner that passes everything would look the same as one that works.

## Limits

- **The disable case leaves the app off.** It runs last; turning the app on
  again is not checked.
- **`events/follow-current-network`, step 3.** The host delays a network's
  data only after a page reload, which a case cannot do without losing the
  injected bundle. The case dispatches `network:loaded` itself for that step.
  Steps 1, 2 and 4 use the host's own events.
- A fresh browser context starts with an empty workspace, so a run never sees
  networks from your own sessions.
