// Runs every recipe's case inside a real Cytoscape Web, and records what
// passed.
//
//   node cookbook/runner/run.mjs                    every case
//   node cookbook/runner/run.mjs <recipe-id> …      only these cases
//   node cookbook/runner/run.mjs --selftest         prove the runner can fail
//
//   --host <url>   the host to drive. Default: http://localhost:5500/
//
// A full, passing run against a supported release writes that release's
// entry in cookbook/verified.json. A run against anything else (the host's
// `development`, a pre-release build) reports the cases and writes nothing.
//
// How to start a host, and how to read a failure: ./README.md
// Design: design/specifications/cookbook/cookbook-design.md §4.6.

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { chromium } from '@playwright/test'
import { build } from 'vite'

import {
  computeDigest,
  COOKBOOK_DIR,
  isRelease,
  listCases,
  listRecipes,
  readApiTypes,
  readHosts,
  readRecord,
  recordPath,
} from '../../scripts/cookbook-lib.mjs'

const RUNNER_DIR = join(COOKBOOK_DIR, 'runner')
const DEFAULT_HOST = 'http://localhost:5500/'
const SELFTEST_ID = 'selftest/must-fail'

const READY_LIMIT_MS = 60_000
// The host publishes the boot report when its editor mounts, which is after
// the API is ready. It is waited for separately, and not forever.
const BOOT_REPORT_LIMIT_MS = 30_000

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
    ...caseFiles.map((file) => join(RUNNER_DIR, 'cases', file)),
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
 * Open the host in a fresh browser context and return once it can run cases.
 * Throws when the host is not in a state a result could be trusted from.
 */
const openHost = async (browser, hostUrl) => {
  const context = await browser.newContext()
  const page = await context.newPage()

  // No other app may run during a case. From 1.1.1 on, the host turns on
  // every app of its catalog, and a dev server's catalog lists this
  // repository's four apps. The route matches the catalog's own path and
  // nothing else: a 1.1.1 dev server also imports /src/assets/apps.json as a
  // module, and answering that with JSON keeps the host from starting.
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

  // The empty catalog is a means. This is the end it serves: no app's entry
  // is fetched from anywhere but the host itself.
  const hostOrigin = new URL(hostUrl).origin
  const otherApps = new Set()
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.endsWith('/remoteEntry.js') && url.origin !== hostOrigin) {
      otherApps.add(url.href)
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
  })

  await page.goto(hostUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => globalThis.CyWebApi?.whenReady, null, {
    timeout: READY_LIMIT_MS,
  })
  await page.evaluate(() => globalThis.CyWebApi.whenReady())

  // A fresh profile opens a welcome dialog and a cookie banner. Escape closes
  // neither; their own buttons do.
  for (const name of [/explore on my own/i, /^decline$/i]) {
    const button = page.getByRole('button', { name }).first()
    if (await button.isVisible().catch(() => false)) await button.click()
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
  return { context, page, hostBuild, otherApps }
}

const networkIds = (page) =>
  page.evaluate(() => {
    const result = globalThis.CyWebApi.workspace.getNetworkIds()
    return result.success ? result.data.networkIds : []
  })

// ── The record ──────────────────────────────────────────────────────────────

const writeEntry = (host, hostBuild, caseCount) => {
  const digest = computeDigest()
  const apiTypes = readApiTypes()
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

  const caseFiles = listCases()
  const recipeIds = listRecipes()
    .filter((recipe) => !recipe.isComponent)
    .map((recipe) => recipe.id)
  const ids = selftest
    ? [SELFTEST_ID]
    : requested.length > 0
      ? requested
      : recipeIds
  const unknown = ids.filter((id) => id !== SELFTEST_ID && !recipeIds.includes(id))
  if (unknown.length > 0) {
    throw new Error(`no such recipe: ${unknown.join(', ')}`)
  }

  const bundle = await buildBundle(caseFiles)
  const browser = await chromium.launch()
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
      throw new Error(`the bundle has no case for: ${missing.join(', ')}`)
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
    if (opened.otherApps.size > 0) {
      throw new Error(
        `the host loaded other apps during the run, so a result may depend ` +
          `on them: ${[...opened.otherApps].join(', ')}`,
      )
    }
  } finally {
    await browser.close()
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
    const hosts = writeEntry(host, hostBuild, caseFiles.length)
    console.log(
      `  recorded in cookbook/verified.json: Cytoscape Web ${host.version} ` +
        `(${host.role}). The record now names: ` +
        `${hosts.map((h) => h.version).join(', ')}\n`,
    )
  }
}

main().catch((cause) => {
  console.error(`\n✗ cookbook runner: ${cause?.message ?? cause}\n`)
  process.exit(1)
})
