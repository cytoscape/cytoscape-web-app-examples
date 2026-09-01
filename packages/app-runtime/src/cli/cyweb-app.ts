#!/usr/bin/env node

/**
 * `cyweb-app` — tools for a Cytoscape Web app, usable from the app itself.
 *
 * `verify` reads one app directory and nothing else, which is the whole point:
 * the same checks lived in a monorepo script that loaded a manifest describing
 * five apps, and were therefore unavailable to anyone outside this repository.
 *
 * `manifest` prints the App Store submission manifest without building an
 * archive, which is what the Store's build-from-GitHub path needs.
 *
 * This file is deliberately thin: the grammar lives in `args.ts` and each
 * command's work lives beside it, so both can be tested without spawning a
 * process for every case. What stays here is the exit-code contract —
 * **2 for a usage error, 1 for work that failed, 0 for success** — and the rule
 * that stdout carries a command's OUTPUT and stderr carries everything else.
 */

import { readFileSync } from 'node:fs'

import { parseCommandLine, USAGE } from './args.js'
import { runManifest } from './manifest.js'
import { verifyApp } from './verify.js'

const invocation = parseCommandLine(process.argv.slice(2))

switch (invocation.kind) {
  case 'help': {
    process.stdout.write(USAGE)
    process.exit(0)
    break
  }
  case 'version': {
    const { version } = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { version: string }
    process.stdout.write(`${version}\n`)
    process.exit(0)
    break
  }
  case 'usage': {
    process.stderr.write(`cyweb-app: ${invocation.message}\n\n${USAGE}`)
    process.exit(2)
    break
  }
  case 'manifest': {
    const { stdout, stderr, exitCode } = runManifest({
      root: invocation.root,
      out: invocation.out,
      force: invocation.force,
    })
    if (stderr !== '') process.stderr.write(stderr)
    if (stdout !== '') process.stdout.write(stdout)
    process.exit(exitCode)
    break
  }
  case 'verify': {
    const { checks, failures, notes } = verifyApp({
      root: invocation.root ?? process.cwd(),
      distDir: invocation.dist,
      expectExposes: invocation.expectExposes.length > 0 ? invocation.expectExposes : undefined,
    })

    for (const note of notes) process.stdout.write(`  · ${note}\n`)

    if (failures.length === 0) {
      process.stdout.write(`✓ all ${checks.length} checks passed\n`)
      process.exit(0)
    }

    process.stderr.write(`✗ ${failures.length} failed, ${checks.length} passed\n`)
    for (const f of failures) process.stderr.write(`    ✗ ${f}\n`)
    process.exit(1)
    break
  }
}
