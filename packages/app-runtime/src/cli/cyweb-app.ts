#!/usr/bin/env node

/**
 * `cyweb-app` — tools for a Cytoscape Web app, usable from the app itself.
 *
 * `verify` reads one app directory and nothing else, which is the whole point:
 * the same checks lived in a monorepo script that loaded a manifest describing
 * five apps, and were therefore unavailable to anyone outside this repository.
 */

import { readFileSync } from 'node:fs'

import { verifyApp } from './verify.js'

const USAGE = `cyweb-app — Cytoscape Web app tools

  cyweb-app verify [options]      check a built app against the federation contract

Options
  --dist <dir>          build output to read (default: ./dist)
  --root <dir>          app directory to read package.json from (default: .)
  --expect-expose <p>   an expose the app must declare, repeatable. Without any,
                        only the mandatory ./AppConfig is asserted
  --version, -v         print the SDK version
  --help, -h            this text
`

const argv = process.argv.slice(2)

const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name)
  return i === -1 ? undefined : argv[i + 1]
}
const flagAll = (name: string): string[] =>
  argv.flatMap((a, i) => (a === name && argv[i + 1] !== undefined ? [argv[i + 1]] : []))

if (argv.includes('--version') || argv.includes('-v')) {
  const { version } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { version: string }
  process.stdout.write(`${version}\n`)
  process.exit(0)
}

if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(USAGE)
  process.exit(argv.length === 0 ? 1 : 0)
}

const [command] = argv
if (command !== 'verify') {
  process.stderr.write(`cyweb-app: unknown command "${command}"\n\n${USAGE}`)
  process.exit(1)
}

const expectExposes = flagAll('--expect-expose')
const { checks, failures, notes } = verifyApp({
  root: flag('--root') ?? process.cwd(),
  distDir: flag('--dist'),
  expectExposes: expectExposes.length > 0 ? expectExposes : undefined,
})

for (const note of notes) process.stdout.write(`  · ${note}\n`)

if (failures.length === 0) {
  process.stdout.write(`✓ all ${checks.length} checks passed\n`)
  process.exit(0)
}

process.stderr.write(`✗ ${failures.length} failed, ${checks.length} passed\n`)
for (const f of failures) process.stderr.write(`    ✗ ${f}\n`)
process.exit(1)
