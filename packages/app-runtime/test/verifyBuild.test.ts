// The verifier core, and what happens when the artifact it reads is corrupt.
//
// The core takes identity as INPUT and performs no package reads, so the
// packaging plugin can run it with the snapshot it already holds. It reads the
// build output — including the audit fields the build embeds in
// mf-manifest.json — because verifying the configuration against itself is the
// one thing a payload verifier must not do.

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  parseAppMeta,
  readPackageSnapshot,
  sharedExpectations,
} from '../src/vite/appMeta.js'
import { verifyApp } from '../src/cli/verify.js'
import { verifyBuild } from '../src/verify/verifyBuild.js'

const PKG = {
  name: '@example/my-app',
  version: '1.0.0',
  cyweb: { id: 'myApp', displayName: 'My App', port: 6431 },
}

/** An app root with a build output whose mf-manifest.json is whatever you say. */
const rootWithManifest = (manifestBody: string): string => {
  const dir = mkdtempSync(join(tmpdir(), 'cyweb-verify-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify(PKG))
  mkdirSync(join(dir, 'dist'))
  mkdirSync(join(dir, 'dist', 'assets'), { recursive: true })
  writeFileSync(
    join(dir, 'dist', 'remoteEntry.js'),
    'export { x as init, y as get }\n',
  )
  writeFileSync(join(dir, 'dist', 'mf-manifest.json'), manifestBody)
  return dir
}

describe('a corrupt build artifact is a result, not an exception', () => {
  it.each([
    ['invalid JSON', '{ not json'],
    ['null', 'null'],
    ['an array', '[]'],
    ['a string', '"nope"'],
  ])('reports %s as a failure instead of throwing', (_label, body) => {
    // An uncaught SyntaxError would reach the CLI as a stack trace naming a JSON
    // offset, which tells a developer nothing about which file is wrong.
    const result = verifyApp({ root: rootWithManifest(body) })
    expect(result.failures.length).toBeGreaterThan(0)
    expect(result.failures.join('\n')).toMatch(
      /mf-manifest\.json is not (valid JSON|a JSON object)/,
    )
  })

  it('reports a well-formed manifest that is missing its audit fields', () => {
    const result = verifyApp({
      root: rootWithManifest(JSON.stringify({ name: 'myApp' })),
    })
    expect(result.failures.join('\n')).toContain('additionalData is not wired')
  })
})

describe('the core takes identity as input', () => {
  it('reads no package.json of its own', () => {
    // The proof is that it works with a distDir whose sibling has no
    // package.json at all: identity came from the caller.
    const dir = mkdtempSync(join(tmpdir(), 'cyweb-core-'))
    mkdirSync(join(dir, 'out'))
    writeFileSync(
      join(dir, 'out', 'remoteEntry.js'),
      'export { x as init, y as get }\n',
    )
    writeFileSync(
      join(dir, 'out', 'mf-manifest.json'),
      JSON.stringify({ name: 'myApp' }),
    )

    const result = verifyBuild({
      appMeta: {
        id: 'myApp',
        displayName: 'My App',
        port: 6431,
        version: '1.0.0',
        description: '',
      },
      expectedShared: {},
      distDir: join(dir, 'out'),
    })
    expect(result.checks.join('\n')).toContain('container name is "myApp"')
  })

  it('is what the CLI wrapper calls, with one snapshot', () => {
    const root = rootWithManifest(JSON.stringify({ name: 'myApp' }))
    const snapshot = readPackageSnapshot(root)
    const direct = verifyBuild({
      appMeta: parseAppMeta(snapshot),
      expectedShared: sharedExpectations(snapshot),
      distDir: join(root, 'dist'),
    })
    expect(verifyApp({ root })).toEqual(direct)
  })

  it('does not import from the CLI layer', () => {
    // A build plugin that imported the verifier used to drag src/cli/ into a
    // Vite config. The dependency now runs the other way.
    const core = readFileSync(
      join(import.meta.dirname, '../src/verify/verifyBuild.ts'),
      'utf8',
    )
    expect(core).not.toMatch(/from '\.\.\/cli\//)
  })
})

describe('the CLI surfaces a corrupt artifact without a stack trace', () => {
  it('exits 1, says which file, and prints nothing to stdout', () => {
    const root = rootWithManifest('{ not json')
    const cli = join(import.meta.dirname, '..', 'dist', 'cli', 'cyweb-app.js')

    let status = 0
    let stdout = ''
    let stderr = ''
    try {
      stdout = execFileSync('node', [cli, 'verify', '--root', root], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      const failure = error as {
        status: number
        stdout: string
        stderr: string
      }
      status = failure.status
      stdout = failure.stdout
      stderr = failure.stderr
    }

    expect(status).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain('mf-manifest.json is not valid JSON')
    expect(stderr).not.toMatch(/\n\s+at /)
    expect(stderr.length).toBeLessThan(2000)
  }, 30_000)
})

describe('a corrupt collection is a result too', () => {
  // `typeof x === "object"` was not enough for the promise this file makes:
  // `{ "exposes": {} }` reached `.map` and threw a TypeError out of a function
  // whose contract is to RETURN failures. The packager calls the core without
  // the CLI wrapper's catch, so it surfaced as a build crash naming nothing.
  it.each([['exposes'], ['shared'], ['remotes']])(
    'reports a non-array %s instead of throwing',
    (field) => {
      const root = rootWithManifest(
        JSON.stringify({ name: 'myApp', [field]: {} }),
      )
      const result = verifyApp({ root })
      expect(result.failures.join('\n')).toContain(`"${field}" is not an array`)
    },
  )

  it('survives entries that are not objects', () => {
    const root = rootWithManifest(
      JSON.stringify({
        name: 'myApp',
        exposes: [null, 42],
        shared: ['x'],
        remotes: [null],
      }),
    )
    expect(() => verifyApp({ root })).not.toThrow()
  })
})

describe('a FIFO in the build output does not hang the verifier', () => {
  it('skips anything that is not a regular file', () => {
    // readFileSync on a FIFO blocks until a writer appears. The verifier reads
    // every .js file in the output, so `assets/pipe.js` would hang the build
    // forever instead of reaching the packager's rejection.
    const root = rootWithManifest(JSON.stringify({ name: 'myApp' }))
    try {
      execFileSync('mkfifo', [join(root, 'dist', 'assets-pipe.js')])
    } catch {
      return // no mkfifo on this platform
    }
    const started = Date.now()
    const result = verifyApp({ root })
    expect(Date.now() - started).toBeLessThan(5000)
    expect(result.failures.length).toBeGreaterThan(0)
  }, 15_000)
})
