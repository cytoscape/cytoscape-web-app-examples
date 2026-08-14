#!/usr/bin/env node

/**
 * `cyweb-app` — the standalone verifier for a Cytoscape Web app.
 *
 * Declared from the start so the command name is stable, but `verify` itself
 * arrives in Phase 4. Until then this dispatches nothing and says so, rather
 * than existing as a silent no-op that looks like it ran.
 */

import { readFileSync } from 'node:fs'

const [, , command] = process.argv

if (command === '--version' || command === '-v') {
  const { version } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { version: string }
  process.stdout.write(`${version}\n`)
  process.exit(0)
}

process.stderr.write(
  `cyweb-app: "verify" is not implemented yet — it lands in Phase 4 of the App\n` +
    `SDK work. Until then, run "npm run verify:federation" from the repository\n` +
    `root, which covers every app in this monorepo.\n`,
)
process.exit(1)
