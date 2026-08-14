// Runs `cyweb-app verify` over every Vite app in the manifest.
//
// The checks themselves moved into @cytoscape-web/app-runtime, where an app
// developer can reach them: they used to live here, loading a manifest that
// describes five apps, which made them unusable outside this repository — the
// repository whose whole purpose is to be copied out of.
//
// This is a LOOP over the real CLI, not a second implementation of it. The
// output a maintainer sees is the output an app developer sees, and the exit
// code being tested is the one CI will depend on.
//
// Usage:  npm run verify:federation                  all Vite apps
//         npm run verify:federation -- hello-world   one app, by workspaceDir
//                                                    (the DIRECTORY, not the
//                                                     federation name)

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { loadManifest, REPO_ROOT } from './manifest.mjs'

const CLI = resolve(
  fileURLToPath(new URL('..', import.meta.url)),
  'packages/app-runtime/dist/cli/cyweb-app.js',
)

const main = () => {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  const { apps } = loadManifest()

  // An argument naming no app is an ERROR, not an empty run. These are workspace
  // DIRECTORIES (`hello-world`), not federation names (`hello`), and this file's
  // own usage comment once got that wrong — so a CI step naming a renamed or
  // misspelled app would have reported success while verifying nothing.
  const known = new Set(apps.map((a) => a.workspaceDir))
  const unknown = only.filter((name) => !known.has(name))
  if (unknown.length > 0) {
    console.error(
      `✗ no app named ${unknown.join(', ')} in apps.manifest.json.\n` +
        `  Known workspace directories: ${[...known].join(', ')}`,
    )
    process.exit(1)
  }

  if (!existsSync(CLI)) {
    console.error(
      `✗ ${CLI} is missing — build the SDK first (npm run build:sdk).\n` +
        `  The verifier now lives in @cytoscape-web/app-runtime.`,
    )
    process.exit(1)
  }

  const inScope = (a) => only.length === 0 || only.includes(a.workspaceDir)
  const scope = apps.filter((a) => a.bundler === 'vite' && inScope(a))
  const skipped = apps.filter((a) => a.bundler !== 'vite' && inScope(a))

  for (const app of skipped) {
    console.log(`- ${app.workspaceDir}: skipped (bundler: ${app.bundler})`)
  }
  if (scope.length === 0) {
    console.log('\nNo Vite apps to verify yet.')
    process.exit(0)
  }

  let failed = 0
  for (const app of scope) {
    // The manifest knows what this app SHOULD expose, so the stricter check is
    // available here. A standalone app has nothing to compare against and gets
    // the mandatory ./AppConfig asserted instead.
    const args = ['verify', '--root', resolve(REPO_ROOT, app.workspaceDir)]
    for (const expose of app.exposes) args.push('--expect-expose', expose)

    const { status, stdout, stderr } = spawnSync(process.execPath, [CLI, ...args], {
      encoding: 'utf8',
    })

    const label = status === 0 ? `\n✓ ${app.workspaceDir}:` : `\n✗ ${app.workspaceDir}:`
    const body = (status === 0 ? stdout : stdout + stderr).trimEnd()
    console.log(`${label} ${body.replace(/^[✓✗]\s*/m, '').replace(/\n/g, '\n  ')}`)
    if (status !== 0) failed += 1
  }

  process.exit(failed === 0 ? 0 : 1)
}

main()
