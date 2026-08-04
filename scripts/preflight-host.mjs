// THE host descriptor contract, executed against a running Cytoscape Web.
//
// A migrated app compiles in a SENTINEL rather than a localhost fallback
// (section 5.5), so it cannot load at all against a host that does not publish
// `window.__CYWEB_HOST__`. This script is what stops such an app being
// published in the first place.
//
// ─── Read this before weakening anything below ────────────────────────────────
// Phase 2's exit criterion — "the descriptor is live in production" — was
// WAIVED on 8/1/2026, that deployment not being available in the team's
// workflow. Section 8 had described this preflight as "cheap insurance" on top
// of that gate. With the gate gone it is the ONLY thing preventing an app being
// published against a host that cannot load it. Three properties follow, and
// none of them is optional:
//
//   1. It runs against the host the published apps will actually NAME — that is
//      whatever apps.json points `cyweb` at, not a convenient dev deployment.
//   2. It EXITS NON-ZERO. deploy-pages.yml publishes on push to main with no
//      human step, so a warning is a log line nobody reads.
//   3. It has been SEEN GOING RED. `--selftest` below exists for that: a gate
//      that has never failed is not known to work, and this one has nothing
//      behind it.
//
// The assertions mirror exactly what a remote's resolver enforces
// (section 6.4 `readHostEntry`), plus the immutability the host promises and a
// real ES-module load of the entry it names. Do not restate a subset elsewhere.
//
// Usage:
//   npm run preflight:host -- https://web.cytoscape.org
//   npm run preflight:host -- --selftest     assert the gate fails on a
//                                            descriptor-less host

import { chromium } from '@playwright/test'

// index.tsx dynamically imports ./boot/bootstrap, so the descriptor does not
// exist at `load` or `domcontentloaded` — it has to be waited for.
const DESCRIPTOR_TIMEOUT_MS = 30_000
const NAVIGATION_TIMEOUT_MS = 60_000

/** A host that will never publish the descriptor. Used only by --selftest. */
const SELFTEST_URL = 'https://example.com'

/**
 * @returns {Promise<{checks: Array<{label: string, pass: boolean, detail: string}>}>}
 */
const runContract = async (url) => {
  const checks = []
  const ok = (label, pass, detail = '') => checks.push({ label, pass, detail })

  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(url, {
      timeout: NAVIGATION_TIMEOUT_MS,
      waitUntil: 'domcontentloaded',
    })

    try {
      // waitForFunction(pageFunction, arg, options) — options is the THIRD
      // parameter. Passing { timeout } second makes it the page-function `arg`
      // and silently leaves the timeout at its default.
      await page.waitForFunction(
        () => window.__CYWEB_HOST__ !== undefined,
        undefined,
        { timeout: DESCRIPTOR_TIMEOUT_MS },
      )
    } catch {
      ok(
        'window.__CYWEB_HOST__ is published',
        false,
        `not present after ${DESCRIPTOR_TIMEOUT_MS}ms — this host predates the descriptor`,
      )
      return { checks }
    }
    ok('window.__CYWEB_HOST__ is published', true)

    const probe = await page.evaluate(() => {
      const value = window.__CYWEB_HOST__
      const prop = Object.getOwnPropertyDescriptor(window, '__CYWEB_HOST__')
      return {
        name: value?.name,
        remoteEntry: value?.remoteEntry,
        apiVersion: value?.apiVersion,
        frozen: Object.isFrozen(value),
        writable: prop?.writable,
        configurable: prop?.configurable,
      }
    })

    ok('name === "cyweb"', probe.name === 'cyweb', String(probe.name))

    // Absolute http(s) only. A relative value would resolve against the
    // REMOTE's origin, and a non-HTTP scheme is not fetchable at all.
    let entryUrl
    try {
      entryUrl = new URL(probe.remoteEntry)
    } catch {
      /* reported below */
    }
    ok(
      'remoteEntry is an absolute http(s) URL',
      entryUrl !== undefined && ['http:', 'https:'].includes(entryUrl.protocol),
      String(probe.remoteEntry),
    )

    ok(
      'apiVersion is a non-empty string',
      typeof probe.apiVersion === 'string' && probe.apiVersion !== '',
      String(probe.apiVersion),
    )

    // Immutability is part of the contract, not an implementation detail: once
    // a remote has loaded, the MF runtime caches its Module against the
    // remoteInfo it was created with, so a mutable descriptor would promise an
    // update path that cannot work.
    ok('descriptor is frozen', probe.frozen === true)
    ok('property is non-writable', probe.writable === false)
    ok('property is non-configurable', probe.configurable === false)

    if (entryUrl !== undefined) {
      const response = await page.request.get(entryUrl.href)
      ok(
        'remoteEntry responds 200',
        response.status() === 200,
        String(response.status()),
      )
      const contentType = response.headers()['content-type'] ?? ''
      ok(
        'remoteEntry is served as JavaScript',
        /javascript|ecmascript/i.test(contentType),
        contentType,
      )

      // A 200 proves nothing on an SPA — any unknown path returns index.html.
      // Importing it and finding init/get is what distinguishes a real
      // container from an HTML page served with a reassuring status.
      const shape = await page.evaluate(async (href) => {
        try {
          const ns = await import(/* @vite-ignore */ href)
          return { init: typeof ns.init, get: typeof ns.get, error: null }
        } catch (cause) {
          return { init: null, get: null, error: String(cause) }
        }
      }, entryUrl.href)

      ok(
        'remoteEntry exports init() and get()',
        shape.init === 'function' && shape.get === 'function',
        shape.error ?? `init=${shape.init} get=${shape.get}`,
      )
    }

    return { checks }
  } finally {
    await browser.close()
  }
}

const report = (url, checks) => {
  console.log(`\nHost descriptor contract — ${url}\n`)
  for (const c of checks) {
    const mark = c.pass ? '✓' : '✗'
    const detail = c.detail === '' ? '' : `  (${c.detail})`
    console.log(`  ${mark} ${c.label}${detail}`)
  }
  const failed = checks.filter((c) => !c.pass).length
  console.log(
    failed === 0
      ? `\n✓ contract passed — ${checks.length} checks\n`
      : `\n✗ contract FAILED — ${failed} of ${checks.length} checks\n`,
  )
  return failed === 0
}

const main = async () => {
  const args = process.argv.slice(2)

  if (args.includes('--selftest')) {
    // Prove the gate can fail. Without this the deploy step is a check nobody
    // has ever seen reject anything.
    console.log(
      `Self-test: expecting the contract to FAIL against ${SELFTEST_URL}`,
    )
    const { checks } = await runContract(SELFTEST_URL)
    const passed = report(SELFTEST_URL, checks)
    if (passed) {
      console.error(
        '✗ self-test FAILED: the contract passed against a host that publishes no ' +
          'descriptor. The preflight is not gating anything.',
      )
      process.exit(1)
    }
    console.log(
      '✓ self-test passed: the gate rejects a descriptor-less host.\n',
    )
    process.exit(0)
  }

  const url = args.find((a) => !a.startsWith('-'))
  if (url === undefined) {
    console.error(`Usage:
  npm run preflight:host -- <host-url>
  npm run preflight:host -- --selftest`)
    process.exit(2)
  }

  const { checks } = await runContract(url)
  process.exit(report(url, checks) ? 0 : 1)
}

main().catch((cause) => {
  console.error(`✗ preflight-host: ${cause?.stack ?? cause}`)
  process.exit(1)
})
