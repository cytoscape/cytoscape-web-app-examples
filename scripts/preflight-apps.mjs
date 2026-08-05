// THE published-app contract: every app this repo publishes must actually load
// inside a running Cytoscape Web.
//
// ─── Why this exists, specifically ────────────────────────────────────────────
// On 8/5/2026 all published apps were broken in production and every existing
// check was green. GitHub Pages serves this repo with `build_type: legacy`,
// which runs the tree through Jekyll, and Jekyll drops every path segment
// beginning with `_`. Vite's Module Federation plugin names five chunks per app
// `_virtual_mf-*` — including the shared-scope import map that remoteEntry.js
// imports FIRST. So `remoteEntry.js` answered 200, `verify:federation` passed
// (it reads dist/, not the site), `preflight:host` passed (it checks the host,
// not the apps), and every app 404'd on its first transitive import.
//
// Nothing else in this repository looks at the two together. That gap is this
// script's entire reason to exist, and it dictates three properties:
//
//   1. It runs IN A REAL HOST PAGE, via a real dynamic `import()`. Fetching
//      remoteEntry.js and parsing it would have passed on 8/5. Only a browser
//      that follows the transitive imports sees a missing chunk.
//   2. It runs against the DEPLOYED site, not dist/ and not a local static
//      server. A plain static server serves `_virtual_mf-*` happily; the bug
//      lived exclusively in the serving layer, so a local check cannot find it.
//   3. It EXITS NON-ZERO, and `--selftest` proves it can — reproducing the
//      8/5 failure shape (a remoteEntry whose chunk 404s) against a synthetic
//      host, so the gate is known to work without needing a broken deployment.
//
// The manifest is the source of truth for WHAT should be loadable: every
// `published` app, every module in its `exposes`, and `federationName` as the
// id the loaded CyApp must report. That makes this a cross-check of the
// manifest against the artifacts as served, not just a smoke test.
//
// Usage:
//   npm run preflight:apps -- <hostUrl> <appsBaseUrl>
//   npm run preflight:apps -- https://dev1.ndexbio.org/cytoscape \
//                             https://cytoscape.org/cytoscape-web-app-examples
//   npm run preflight:apps -- --selftest

import { chromium } from '@playwright/test'

import { publishedApps } from './manifest.mjs'

const DESCRIPTOR_TIMEOUT_MS = 30_000
const NAVIGATION_TIMEOUT_MS = 60_000

/** Synthetic origin for --selftest. Never actually reached over the network. */
const SELFTEST_HOST = 'https://selftest.invalid/host/'
const SELFTEST_APPS = 'https://selftest.invalid/apps'

const joinUrl = (base, path) => `${base.replace(/\/+$/, '')}/${path}`

/**
 * Loads one app the way the host does — `import()` → `init()` → `get()` — from
 * inside the host page, so the descriptor, the origin, CORS and every
 * transitive chunk fetch are the real ones.
 *
 * Runs entirely in the page: the dynamic import has to be evaluated by the
 * browser in that document's context for any of the above to mean anything.
 */
const loadApp = (page, { url, exposes, federationName }) =>
  page.evaluate(
    async ({ url, exposes, federationName }) => {
      const problems = []

      // Status and MIME first. A 404 or a text/html error page produces a
      // baffling parse error from `import()` alone.
      let contentType = ''
      try {
        const res = await fetch(url)
        contentType = res.headers.get('content-type') ?? ''
        if (!res.ok) {
          return { ok: false, stage: 'fetch', detail: `HTTP ${res.status}` }
        }
        if (!/javascript|ecmascript/i.test(contentType)) {
          return {
            ok: false,
            stage: 'mime',
            detail: `served as "${contentType}", not JavaScript`,
          }
        }
      } catch (cause) {
        // Cross-origin failures land here rather than as a status code.
        return { ok: false, stage: 'fetch', detail: String(cause?.message) }
      }

      let mod
      try {
        mod = await import(/* @vite-ignore */ url)
      } catch (cause) {
        // THE 8/5 case: remoteEntry.js itself is fine, a chunk it imports is
        // not. The message names the missing module, so pass it through whole.
        return { ok: false, stage: 'import', detail: String(cause?.message) }
      }

      if (typeof mod.init !== 'function' || typeof mod.get !== 'function') {
        return {
          ok: false,
          stage: 'shape',
          detail: `not a Module Federation entry — exports: ${Object.keys(mod).join(', ') || '(none)'}`,
        }
      }

      // Init against the HOST's live share scope where it is reachable, so
      // `shared` resolves to the host's singletons exactly as it does in use.
      // An empty scope would let an app that bundles its own React pass.
      const scope = globalThis.__FEDERATION__?.__SHARE__?.cyweb ?? {}
      try {
        await mod.init(scope)
      } catch (cause) {
        return { ok: false, stage: 'init', detail: String(cause?.message) }
      }

      // Every module the manifest says this app exposes.
      const loaded = []
      for (const name of exposes) {
        try {
          const factory = await mod.get(name)
          if (typeof factory !== 'function') {
            problems.push(`${name}: get() returned ${typeof factory}`)
            continue
          }
          loaded.push({ name, module: await factory() })
        } catch (cause) {
          problems.push(`${name}: ${cause?.message}`)
        }
      }

      const appConfig = loaded.find((x) => x.name === './AppConfig')?.module
      const cyApp = appConfig?.default ?? appConfig
      if (cyApp === undefined) {
        problems.push('./AppConfig did not yield a CyApp')
      } else if (cyApp.id !== federationName) {
        // The manifest and the artifact disagreeing means apps.json entries
        // built from the manifest would address the wrong app.
        problems.push(
          `id mismatch: manifest federationName "${federationName}" vs CyApp.id "${cyApp.id}"`,
        )
      }

      return {
        ok: problems.length === 0,
        stage: 'exposes',
        problems,
        contentType,
        id: cyApp?.id,
        version: cyApp?.version,
        apiVersion: cyApp?.apiVersion,
        resources: (cyApp?.resources ?? []).map((r) => `${r.slot}:${r.id}`),
        exposesLoaded: loaded.length,
      }
    },
    { url, exposes, federationName },
  )

/**
 * @returns {Promise<boolean>} true when every published app loaded.
 */
const runContract = async (page, hostUrl, appsBase, apps) => {
  await page.goto(hostUrl, {
    timeout: NAVIGATION_TIMEOUT_MS,
    waitUntil: 'domcontentloaded',
  })

  try {
    await page.waitForFunction(
      () => globalThis.__CYWEB_HOST__ !== undefined,
      null,
      { timeout: DESCRIPTOR_TIMEOUT_MS },
    )
  } catch {
    console.log(`\n✗ ${hostUrl} publishes no window.__CYWEB_HOST__`)
    console.log(
      `  Run \`npm run preflight:host -- ${hostUrl}\` for the detail.`,
    )
    return false
  }

  const descriptor = await page.evaluate(() => globalThis.__CYWEB_HOST__)
  console.log(`\nPublished apps in ${appsBase}`)
  console.log(`  loaded by ${hostUrl}`)
  console.log(`  host remoteEntry ${descriptor.remoteEntry}\n`)

  let failed = 0
  for (const app of apps) {
    const url = joinUrl(joinUrl(appsBase, app.publishPath), 'remoteEntry.js')
    const result = await loadApp(page, {
      url,
      exposes: app.exposes,
      federationName: app.federationName,
    })

    if (result.ok) {
      const v = result.version === undefined ? '' : ` v${result.version}`
      console.log(
        `  ✓ ${app.publishPath}${v}  api=${result.apiVersion}  ${result.exposesLoaded}/${app.exposes.length} exposes`,
      )
      if (result.resources.length > 0) {
        console.log(`      ${result.resources.join(', ')}`)
      }
    } else {
      failed += 1
      console.log(`  ✗ ${app.publishPath}  [${result.stage}]`)
      if (result.detail !== undefined) console.log(`      ${result.detail}`)
      for (const p of result.problems ?? []) console.log(`      ${p}`)
    }
  }

  const total = apps.length
  console.log(
    failed === 0
      ? `\n✓ contract passed — ${total} app(s) loaded`
      : `\n✗ contract FAILED — ${failed} of ${total} app(s) could not load`,
  )
  return failed === 0
}

/**
 * Reproduces the 8/5 failure against a synthetic host and app, and asserts the
 * contract rejects it.
 *
 * Deliberately the SAME shape as the real bug rather than something easier to
 * fake: remoteEntry.js is valid JavaScript, served with the right MIME type,
 * answering 200 — and the chunk it imports is missing. Every cheaper check
 * passes that; only the in-browser import does not.
 */
const selftest = async (page) => {
  await page.route('**/selftest.invalid/**', (route) => {
    const url = route.request().url()
    if (url === SELFTEST_HOST) {
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><meta charset=utf-8><script>
          window.__CYWEB_HOST__ = Object.freeze({
            name: 'cyweb',
            remoteEntry: '${SELFTEST_HOST}remoteEntry.js',
            apiVersion: '1.0',
          })
        </script>`,
      })
    }
    if (url.endsWith('/remoteEntry.js')) {
      return route.fulfill({
        contentType: 'application/javascript',
        body: `import './assets/_virtual_mf-localSharedImportMap-gone.js'
               export const init = () => {}
               export const get = () => () => ({})`,
      })
    }
    // The Jekyll-shaped hole.
    return route.fulfill({ status: 404, body: 'Not Found' })
  })

  const apps = [
    {
      publishPath: 'broken',
      exposes: ['./AppConfig'],
      federationName: 'broken',
    },
  ]
  const passed = await runContract(page, SELFTEST_HOST, SELFTEST_APPS, apps)

  if (passed) {
    console.log(
      '\n✗ SELFTEST FAILED — the contract passed an app whose chunk 404s.\n' +
        '  This gate cannot detect the failure it was written for.',
    )
    return false
  }
  console.log('\n✓ selftest passed — the gate rejects an app that cannot load')
  return true
}

const main = async () => {
  const args = process.argv.slice(2)
  const isSelftest = args.includes('--selftest')
  const [hostUrl, appsBase] = args.filter((a) => !a.startsWith('--'))

  if (!isSelftest && (hostUrl === undefined || appsBase === undefined)) {
    console.error(
      'usage: npm run preflight:apps -- <hostUrl> <appsBaseUrl>\n' +
        '       npm run preflight:apps -- --selftest',
    )
    process.exit(1)
  }

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const passed = isSelftest
      ? await selftest(page)
      : await runContract(page, hostUrl, appsBase, publishedApps())
    process.exitCode = passed ? 0 : 1
  } finally {
    await browser.close()
  }
}

await main()
