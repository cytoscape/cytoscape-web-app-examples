// Packs the package ONCE per test run, before any test file starts, and hands
// the tarball to every test that checks the artifact as it ships.
//
// Two test files used to pack it themselves. `npm pack` runs prepack, which
// rebuilds dist/ in place, and Vitest runs test files in parallel — so the two
// rebuilds could overlap, one rewriting dist/ while the other was packing it.
// CI failed that way on 2026-10-07: npm pack exited 1 inside
// manifestCommand.test.ts while cyManifest.test.ts was packing too, and a
// re-run passed. One pack, finished before the first test file runs, leaves
// nothing to race, and saves a build.
//
// Each test extracts the tarball into a directory of its own, so nothing a test
// does to its copy can reach another test.

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { TestProject } from 'vitest/node'

import { packTarball } from './fixtures/packTarball.js'

export default function setup(project: TestProject): () => void {
  const packageRoot = join(import.meta.dirname, '..')
  const dir = mkdtempSync(join(tmpdir(), 'cyweb-runtime-pack-'))
  project.provide('runtimeTarball', join(dir, packTarball(packageRoot, dir)))
  return () => rmSync(dir, { recursive: true, force: true })
}

declare module 'vitest' {
  export interface ProvidedContext {
    /** Absolute path of this package's tarball, packed once for the run. */
    runtimeTarball: string
  }
}
