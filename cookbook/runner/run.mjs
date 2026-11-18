// Runs every recipe's case inside a real Cytoscape Web, and records what
// passed.
//
//   node cookbook/runner/run.mjs                    every case
//   node cookbook/runner/run.mjs <case-id> …        only these cases
//   node cookbook/runner/run.mjs --selftest         prove the runner can fail
//
// A case id is a recipe's id, or `behavior/<name>` for a behavior case of the
// verification app. Every run starts the verification app and its rival
// (runner/app), installs both into the host with `?installApp=`, and stops
// them at the end.
//
//   --host <url>   the host to drive. Default: http://localhost:5500/
//
// A full, passing run against a supported release writes that release's
// entry in cookbook/verified.json. A run against anything else (the host's
// `development`, a pre-release build) reports the cases and writes nothing.
//
// How to start a host, and how to read a failure: ./README.md
// Design: design/specifications/cookbook/cookbook-design.md §4.6.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, posix } from 'node:path'

import { chromium } from '@playwright/test'
import { build, createServer } from 'vite'

import {
  CASE_DIRS,
  computeDigest,
  COOKBOOK_DIR,
  countCases,
  isRelease,
  listBehaviors,
  listCases,
  listRecipes,
  readApiTypes,
  readHosts,
  readRecord,
  recordPath,
} from '../../scripts/cookbook-lib.mjs'

const RUNNER_DIR = join(COOKBOOK_DIR, 'runner')
const APP_DIR = join(RUNNER_DIR, 'app')
const DEFAULT_HOST = 'http://localhost:5500/'
const SELFTEST_ID = 'selftest/must-fail'
// The disable case turns the app off, so it runs last.
const LAST_ID = 'behavior/disable'
// Must match runner/app/src/tabs.ts.
const MAIN_TAB = 'cookbook-verification'

const READY_LIMIT_MS = 60_000
// The host publishes the boot report when its editor mounts, which is after
// the API is ready. It is waited for separately, and not forever.
const BOOT_REPORT_LIMIT_MS = 30_000
// Installing: the confirmation dialog, then the app's mount().
const INSTALL_LIMIT_MS = 30_000
// One user action of a case: a click, a field, a menu to appear.
const UI_LIMIT_MS = 10_000
// How long a click may take to open a window before it counts as none.
const POPUP_LIMIT_MS = 2_000
// Link-outs in the cases point here; the runner answers it itself.
const LINK_OUT_ORIGIN = 'https://cookbook.invalid'

// ── The verification apps ───────────────────────────────────────────────────

/** The verification app and its rival, each with its id and port. */
const APPS = [APP_DIR, join(APP_DIR, 'rival')].map((dir) => {
  const { cyweb } = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const origin = `http://localhost:${cyweb.port}`
  return {
    dir,
    id: cyweb.id,
    manifest: `${origin}/cyweb-app.json`,
    remoteEntry: `${origin}/remoteEntry.js`,
  }
})

/**
 * Start each app's dev server, with the app's directory as its root. Its
 * imports resolve from the repository's node_modules.
 */
const startApps = async () => {
  const servers = []
  try {
    for (const app of APPS) {
      const server = await createServer({
        root: app.dir,
        configFile: join(app.dir, 'vite.config.ts'),
        logLevel: 'warn',
      })
      servers.push(server)
      await server.listen()
    }
  } catch (cause) {
    await Promise.all(servers.map((server) => server.close()))
    throw cause
  }
  return servers
}

// ── The bundle ──────────────────────────────────────────────────────────────

/**
 * One script holding the harness and every case. Core recipes import types
 * only, so nothing here needs React or a `cyweb/*` module at run time.
 */
const buildBundle = async (caseFiles) => {
  // The entry is generated, not a file: it only lists what to bundle. Library
  // mode resolves `entry` against `root`, so the plugin answers for the
  // resolved path.
  const entryId = join(COOKBOOK_DIR, 'cookbook-runner-entry.js')
  const modules = [
    join(RUNNER_DIR, 'selftest-case.ts'),
    ...caseFiles.map((path) => join(COOKBOOK_DIR, ...path.split('/'))),
  ]
  const entry = [
    `import { installRunner } from ${JSON.stringify(join(RUNNER_DIR, 'harness.ts'))}`,
    ...modules.map((path, i) => `import case${i} from ${JSON.stringify(path)}`),
    `installRunner([${modules.map((_, i) => `case${i}`).join(', ')}])`,
  ].join('\n')

  const result = await build({
    configFile: false,
    root: COOKBOOK_DIR,
    logLevel: 'error',
    plugins: [
      {
        name: 'cookbook-runner-entry',
        resolveId: (id) => (id === entryId ? `\0${entryId}` : null),
        load: (id) => (id === `\0${entryId}` ? entry : null),
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: {
        entry: entryId,
        formats: ['iife'],
        name: 'CookbookRunnerBundle',
        fileName: 'cookbook-runner',
      },
    },
  })
  const output = (Array.isArray(result) ? result[0] : result).output
  return output.find((chunk) => chunk.type === 'chunk').code
}

// ── The page ────────────────────────────────────────────────────────────────

/**
 * What a case asks the user to do (`CaseUi` in harness.ts), done with real
 * mouse and keyboard events. A throw rejects the case's promise in the page.
 */
const uiActions = (context, page) => {
  const target = (selector) => page.locator(selector).first()
  return {
    click: (selector) => target(selector).click({ timeout: UI_LIMIT_MS }),
    fill: (selector, text) => target(selector).fill(text, { timeout: UI_LIMIT_MS }),
    press: (key) => page.keyboard.press(key),
    visible: (selector) => target(selector).isVisible(),
    waitFor: (selector, state) =>
      target(selector).waitFor({ state, timeout: UI_LIMIT_MS }),
    rightClickNode: async (nodeId) => {
      // Where the renderer draws the node now. Both releases publish their
      // Cytoscape.js instance on window.debug.cy while debug is on.
      const point = await page.evaluate((id) => {
        const cy = globalThis.debug?.cy
        const node = cy?.getElementById(id)
        if (node === undefined || node.length === 0) return null
        const { x, y } = node.renderedPosition()
        const box = cy.container().getBoundingClientRect()
        return {
          x: box.left + x,
          y: box.top + y,
          inside: x >= 0 && y >= 0 && x <= box.width && y <= box.height,
        }
      }, nodeId)
      if (point === null) throw new Error(`node ${nodeId} is not drawn`)
      if (!point.inside) throw new Error(`node ${nodeId} is outside the canvas`)
      // Over the node first, as a hand would be. A right-click that arrives
      // with the pointer straight from outside the canvas (from a dialog's
      // button, or back from another window) opened no menu on 1.1.0.
      await page.mouse.move(point.x, point.y)
      await page.waitForTimeout(200)
      await page.mouse.click(point.x, point.y, { button: 'right' })
    },
    clickForPopup: async (selector) => {
      const popup = context
        .waitForEvent('page', { timeout: POPUP_LIMIT_MS })
        .catch(() => null)
      await target(selector).click({ timeout: UI_LIMIT_MS })
      const opened = await popup
      if (opened === null) return null
      await opened
        .waitForURL((url) => url.href !== 'about:blank', { timeout: UI_LIMIT_MS })
        .catch(() => undefined)
      const url = opened.url()
      await opened.close()
      // Until it is in front again, the host page renders nothing new, and a
      // right-click on its canvas opens no menu.
      await page.bringToFront()
      return url
    },
    setAppEnabled: async (appId, enabled) => {
      // The toolbar's Apps is not a button: find it by its text.
      await page.getByText('Apps', { exact: true }).first().click()
      await page.getByText('Manage Apps...', { exact: true }).click()
      await page
        .locator(`[data-testid="app-toggle-${appId}"] input`)
        .setChecked(enabled, { timeout: UI_LIMIT_MS })
      await page.getByTestId('app-settings-dialog-close-button').click()
    },
  }
}

/**
 * Open the host in a fresh browser context, install the verification apps,
 * and return once it can run cases. Throws when the host is not in a state a
 * result could be trusted from.
 */
const openHost = async (browser, hostUrl) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  // A case's link-out opens a window here. Nothing leaves the machine.
  await context.route(`${LINK_OUT_ORIGIN}/**`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>cookbook link-out</p>' }),
  )
  const ui = uiActions(context, page)
  // COOKBOOK_SCREENSHOTS=<dir> keeps a picture of the page whenever a UI
  // action fails: the quickest way to see what was in the way.
  const shots = process.env.COOKBOOK_SCREENSHOTS
  let shot = 0
  await page.exposeFunction('__cookbookUi', async (action, ...args) => {
    if (!Object.hasOwn(ui, action)) throw new Error(`no UI action ${action}`)
    try {
      return await ui[action](...args)
    } catch (cause) {
      if (shots !== undefined) {
        shot += 1
        const path = join(shots, `ui-${shot}-${action}.png`)
        await page.screenshot({ path }).catch(() => undefined)
        console.log(`  (screenshot of the failed ${action}: ${path})`)
      }
      throw cause
    }
  })

  // No other app may run during a case: only the verification apps, installed
  // below. From 1.1.1 on, the host turns on every app of its catalog, and a
  // dev server's catalog lists this repository's four apps. The route matches
  // the catalog's own path and nothing else: a 1.1.1 dev server also imports
  // /src/assets/apps.json as a module, and answering that with JSON keeps the
  // host from starting.
  const base = new URL(hostUrl).pathname.replace(/[^/]*$/, '')
  const catalogPaths = new Set(['/apps.json', `${base}apps.json`])
  let catalogRequests = 0
  await page.route(
    (url) => catalogPaths.has(url.pathname),
    (route) => {
      catalogRequests += 1
      return route.fulfill({ contentType: 'application/json', body: '[]' })
    },
  )

  // The empty catalog is a means. This is the end it serves: the only
  // remoteEntry.js the page fetches is the host's own. Every entry is
  // collected, whatever its origin: an app can be served from the host's own
  // origin. The host's entry is known only once it has published its
  // descriptor, so it is set aside at the end, by its exact URL.
  const entries = new Set()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.endsWith('/remoteEntry.js')) {
      url.search = ''
      url.hash = ''
      entries.add(url.href)
    }
  })

  // A run sends nothing to analytics. 1.1.0 does not wait for consent.
  await page.route(
    /google-analytics\.com|googletagmanager\.com|google\.com\/g\/collect/,
    (route) => route.abort(),
  )

  // The boot report exists only while the host's debug switch is on. A dev
  // server turns it on by default; a deployed host does not.
  await page.addInitScript(() => {
    localStorage.setItem('cyweb-debug-enabled', 'true')
    // The welcome dialog opens when the host signals it is ready, which can
    // be after the install is confirmed, over whatever a case is clicking.
    // Both releases keep "seen" under this key, in this shape.
    localStorage.setItem(
      'cyweb.onboarding',
      JSON.stringify({ hasSeenWelcome: true, completedTours: [], dismissedHints: [] }),
    )
  })

  // One link installs both apps; confirming it also turns them on.
  const installUrl = new URL(hostUrl)
  for (const app of APPS) installUrl.searchParams.append('installApp', app.manifest)
  await page.goto(installUrl.href, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.CyWebApi?.whenReady, null, {
    timeout: READY_LIMIT_MS,
  })
  await page.evaluate(() => globalThis.CyWebApi.whenReady())

  // Three dialogs open over each other, in no fixed order: the install
  // confirmation, and on a fresh profile a welcome dialog and a cookie
  // banner. Escape closes none of them; their own buttons do. Each round
  // clicks whichever one is on top, until the install is confirmed and the
  // other two are gone.
  const confirm = page.getByTestId('app-install-confirmation-dialog-confirm')
  const others = [/explore on my own/i, /^decline$/i].map((name) =>
    page.getByRole('button', { name }).first(),
  )
  const shown = (button) => button.isVisible().catch(() => false)
  const click = (button) =>
    button.click({ timeout: 1_000 }).then(
      () => true,
      () => false,
    )
  let confirmed = false
  for (const deadline = Date.now() + INSTALL_LIMIT_MS; ; ) {
    if (!confirmed && (await shown(confirm))) confirmed = await click(confirm)
    for (const button of others) {
      if (await shown(button)) await click(button)
    }
    const open = await Promise.all(others.map(shown))
    if (confirmed && !open.includes(true)) break
    if (Date.now() > deadline) {
      throw new Error(
        confirmed
          ? 'the welcome dialog or the cookie banner would not close'
          : `the host showed no install dialog for ` +
              `${APPS.map((a) => a.manifest).join(' and ')} within ` +
              `${INSTALL_LIMIT_MS} ms. Are the apps' dev servers reachable?`,
      )
    }
    await page.waitForTimeout(250)
  }

  await page
    .waitForFunction(() => globalThis.debug?.boot?.report?.build, null, {
      timeout: BOOT_REPORT_LIMIT_MS,
    })
    .catch(() => {
      throw new Error(
        `the host published no boot report within ${BOOT_REPORT_LIMIT_MS} ms, ` +
          `so its commit cannot be read`,
      )
    })
  const hostBuild = await page.evaluate(() => {
    const { version, commit } = globalThis.debug.boot.report.build
    return { version, commit }
  })
  if (hostBuild.commit === 'unknown' || hostBuild.version === 'unknown') {
    throw new Error(
      `the host does not know its own build (version ${hostBuild.version}, ` +
        `commit ${hostBuild.commit}): start it from a git checkout`,
    )
  }
  if (catalogRequests === 0) {
    throw new Error(
      `the host never requested its app catalog at ${[...catalogPaths].join(' or ')}, ` +
        `so other apps may be running. The catalog's path has changed: ` +
        `update the route in cookbook/runner/run.mjs`,
    )
  }
  // Both supported releases publish it (src/app-api/federation/hostDescriptor.ts).
  const hostEntry = await page.evaluate(
    () => globalThis.__CYWEB_HOST__?.remoteEntry,
  )
  if (typeof hostEntry !== 'string') {
    throw new Error(
      'the host published no window.__CYWEB_HOST__.remoteEntry, so its own ' +
        'entry cannot be told from an app\'s',
    )
  }
  // The app is active once its panel renders: mount() has returned, and the
  // host shows the panels of active apps only. The tab is selected by id:
  // on 1.1.0 the Sub Network Viewer tab is first and selected.
  await page
    .waitForFunction(() => globalThis.__cookbookApp !== undefined, null, {
      timeout: INSTALL_LIMIT_MS,
    })
    .catch(() => {
      throw new Error(
        `the verification app did not mount within ${INSTALL_LIMIT_MS} ms`,
      )
    })
  const opened = await page.evaluate(
    (tab) => globalThis.CyWebApi.panel.open('right', tab),
    MAIN_TAB,
  )
  if (!opened.success) {
    throw new Error(`the verification app's tab is not shown: ${opened.error.message}`)
  }
  await page
    .getByTestId('cookbook-verification-panel')
    .waitFor({ timeout: INSTALL_LIMIT_MS })

  const ownEntries = new Set([hostEntry, ...APPS.map((app) => app.remoteEntry)])
  const otherApps = () => [...entries].filter((href) => !ownEntries.has(href))
  const notLoaded = APPS.filter((app) => !entries.has(app.remoteEntry))
  if (notLoaded.length > 0) {
    throw new Error(
      `the host did not load ${notLoaded.map((app) => app.remoteEntry).join(', ')}`,
    )
  }
  return { context, page, hostBuild, otherApps }
}

// A failed read is an error, not an empty workspace: an empty answer would
// hide every network a case left behind.
const networkIds = async (page) => {
  const result = await page.evaluate(() =>
    globalThis.CyWebApi.workspace.getNetworkIds(),
  )
  if (!result.success) {
    throw new Error(
      `the host could not list its networks: ${result.error.message}`,
    )
  }
  return result.data.networkIds
}

// ── The record ──────────────────────────────────────────────────────────────

/**
 * What the run is about to verify: the sources, and the api-types they are
 * checked with. Read before the bundle is built, and written as read. A run
 * whose files change before it ends records nothing: the bundle the host ran
 * was built from the earlier files.
 */
const readIdentity = () => ({ digest: computeDigest(), apiTypes: readApiTypes() })

const writeEntry = (host, hostBuild, caseCount, identity) => {
  const now = readIdentity()
  if (
    now.digest !== identity.digest ||
    now.apiTypes.version !== identity.apiTypes.version ||
    now.apiTypes.source !== identity.apiTypes.source
  ) {
    throw new Error(
      'the cookbook\'s sources or the installed api-types changed during the ' +
        'run, so the cases ran on other files than the record would name. ' +
        'Nothing was recorded: run again',
    )
  }
  const { digest, apiTypes } = identity
  const previous = readRecord()
  // An entry made from other sources, or with other types, says nothing
  // about these ones.
  const sameSources =
    previous?.digest === digest &&
    previous?.apiTypes?.version === apiTypes.version &&
    previous?.apiTypes?.source === apiTypes.source
  const hosts = (sameSources ? previous.hosts : []).filter(
    (entry) => entry.version !== host.version,
  )
  hosts.push({
    version: host.version,
    commit: hostBuild.commit,
    role: host.role,
    cases: caseCount,
    verifiedAt: new Date().toISOString(),
  })
  hosts.sort((a, b) => a.version.localeCompare(b.version))
  writeFileSync(
    recordPath(),
    `${JSON.stringify({ apiTypes, digest, hosts }, null, 2)}\n`,
  )
  return hosts
}

// ── Main ────────────────────────────────────────────────────────────────────

const main = async () => {
  const args = process.argv.slice(2)
  const selftest = args.includes('--selftest')
  const hostFlag = args.indexOf('--host')
  const hostUrl = hostFlag === -1 ? DEFAULT_HOST : args[hostFlag + 1]
  const requested = args.filter(
    (arg, i) =>
      !arg.startsWith('--') && (hostFlag === -1 || i !== hostFlag + 1),
  )
  if (hostUrl === undefined || (selftest && requested.length > 0)) {
    console.error(`Usage:
  node cookbook/runner/run.mjs [--host <url>] [<recipe-id> …]
  node cookbook/runner/run.mjs [--host <url>] --selftest`)
    process.exit(2)
  }

  // The bundle holds the cases of runner/cases. The verification app holds
  // the others, and publishes them when it mounts.
  const caseFiles = listCases().filter((path) =>
    path.startsWith(`${CASE_DIRS.core}/`),
  )
  const knownIds = [
    ...listRecipes().map((recipe) => recipe.id),
    ...listBehaviors().map(
      (path) => `behavior/${posix.basename(path).replace(/\.ts$/, '')}`,
    ),
  ]
  const unknown = requested.filter((id) => !knownIds.includes(id))
  if (unknown.length > 0) {
    throw new Error(`no such case: ${unknown.join(', ')}`)
  }
  // In catalog order, behaviors after recipes, and the disable case last.
  const ids = selftest
    ? [SELFTEST_ID]
    : knownIds
        .filter((id) => requested.length === 0 || requested.includes(id))
        .sort((a, b) => (a === LAST_ID) - (b === LAST_ID))

  const identity = readIdentity()
  const bundle = await buildBundle(caseFiles)
  const servers = await startApps()
  const browser = await chromium.launch().catch(async (cause) => {
    await Promise.all(servers.map((server) => server.close()))
    throw cause
  })
  let outcomes = []
  let leftBehind = []
  let hostBuild
  try {
    const opened = await openHost(browser, hostUrl)
    hostBuild = opened.hostBuild
    const { page } = opened
    console.log(
      `\nCookbook cases — Cytoscape Web ${hostBuild.version} ` +
        `(${hostBuild.commit}) at ${hostUrl}\n`,
    )

    const before = await networkIds(page)
    await page.addScriptTag({ content: bundle })
    const bundled = await page.evaluate(() => globalThis.__cookbookRunner.ids)
    const missing = ids.filter((id) => !bundled.includes(id))
    if (missing.length > 0) {
      throw new Error(
        `neither the bundle nor the verification app has a case for: ${missing.join(', ')}`,
      )
    }

    for (const id of ids) {
      const outcome = await page.evaluate(
        ([caseId, host]) => globalThis.__cookbookRunner.run(caseId, host),
        [id, { version: hostBuild.version }],
      )
      outcomes.push(outcome)
      const detail = [outcome.message, ...outcome.cleanupErrors]
        .filter((text) => text !== '')
        .join('; ')
      console.log(
        `  ${outcome.pass ? '✓' : '✗'} ${id}${detail === '' ? '' : `  (${detail})`}`,
      )
    }

    // Nothing may be left behind, pass or fail: the next run starts from the
    // same workspace.
    const after = await networkIds(page)
    leftBehind = after.filter((id) => !before.includes(id))
    if (leftBehind.length > 0) {
      console.log(`  ✗ networks left behind: ${leftBehind.join(', ')}`)
    }
    const otherApps = opened.otherApps()
    if (otherApps.length > 0) {
      throw new Error(
        `the host loaded other apps during the run, so a result may depend ` +
          `on them: ${otherApps.join(', ')}`,
      )
    }
  } finally {
    await browser.close()
    await Promise.all(servers.map((server) => server.close()))
  }

  const failed = outcomes.filter((outcome) => !outcome.pass)

  if (selftest) {
    // The one case must fail, for its own reason, and still clean up.
    const [outcome] = outcomes
    const rejected =
      outcome.pass === false &&
      outcome.message.includes('has three nodes') &&
      outcome.cleanupErrors.length === 0 &&
      leftBehind.length === 0
    if (!rejected) {
      console.error(
        '\n✗ self-test FAILED: a case that must fail did not fail as ' +
          'expected, or left its fixture behind. The runner is not checking ' +
          'anything.\n',
      )
      process.exit(1)
    }
    console.log(
      '\n✓ self-test passed: the runner reports a failed check, and cleans ' +
        'up after it.\n',
    )
    return
  }

  if (failed.length > 0 || leftBehind.length > 0) {
    console.error(
      `\n✗ ${failed.length} of ${outcomes.length} cases FAILED` +
        (leftBehind.length > 0 ? ', and networks were left behind' : '') +
        '\n',
    )
    process.exit(1)
  }
  console.log(`\n✓ ${outcomes.length} cases passed`)

  // The record. Only a full run against a release's own commit counts.
  const host = readHosts().find((candidate) => isRelease(candidate, hostBuild))
  if (requested.length > 0) {
    console.log('  no record written: this was not a full run\n')
  } else if (host === undefined) {
    console.log(
      `  no record written: ${hostBuild.version} (${hostBuild.commit}) is ` +
        `not the tag commit of a supported release ` +
        `(${readHosts()
          .map((h) => `${h.version} ${h.commit.slice(0, 8)}`)
          .join(', ')})\n`,
    )
  } else {
    const hosts = writeEntry(host, hostBuild, countCases(), identity)
    console.log(
      `  recorded in cookbook/verified.json: Cytoscape Web ${host.version} ` +
        `(${host.role}). The record now names: ` +
        `${hosts.map((h) => h.version).join(', ')}\n`,
    )
    if (readApiTypes().source !== 'registry') {
      console.log(
        '  ✗ this record cannot be merged: the installed api-types is not ' +
          'the registry package the lockfile pins. Run npm ci and run again\n',
      )
    }
  }
}

main().catch((cause) => {
  console.error(`\n✗ cookbook runner: ${cause?.message ?? cause}\n`)
  process.exit(1)
})
