// The lifecycle boundary between runtime identity and submission metadata.
//
// The split exists so that an invalid `repository` — or a display name too long
// for the App Store, or a version outside the submission profile — cannot fail
// `vite dev`. Separate types would not achieve that; separate callers do. These
// tests hold that boundary in place, and hold the snapshot to ONE read, which is
// what lets the packager claim that the identity it validates and the identity
// it writes into the archive came from the same bytes.

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

// Counts every package.json read that reaches the filesystem, whichever module
// asks for it. Hoisted because vi.mock factories run before the module graph.
const spy = vi.hoisted(() => ({ packageJsonReads: [] as string[] }))
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: (path: Parameters<typeof actual.readFileSync>[0], ...rest: unknown[]) => {
      if (String(path).endsWith('package.json')) spy.packageJsonReads.push(String(path))
      return (actual.readFileSync as (...a: unknown[]) => unknown)(path, ...rest)
    },
  }
})

const {
  parseAppMeta,
  parseSubmissionMeta,
  readAppMeta,
  readPackageSnapshot,
  sharedExpectations,
} = await import('../src/vite/appMeta.js')
const { verifyApp } = await import('../src/cli/verify.js')

const VALID = {
  name: '@example/my-app',
  version: '0.1.0',
  description: 'Colors nodes by degree',
  cyweb: { id: 'myApp', displayName: 'Degree Colorizer', port: 6000 },
}

const rootWith = (pkg: unknown): string => {
  const dir = mkdtempSync(join(tmpdir(), 'cyweb-snapshot-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  return dir
}

describe('readPackageSnapshot', () => {
  it('returns the file it read and the parsed JSON, unvalidated', () => {
    const root = rootWith({ anything: true })
    const snapshot = readPackageSnapshot(root)
    expect(snapshot.path).toBe(join(root, 'package.json'))
    expect(snapshot.raw).toEqual({ anything: true })
  })

  it('does not validate — a package with no cyweb block still snapshots', () => {
    const { cyweb: _dropped, ...noBlock } = VALID
    expect(() => readPackageSnapshot(rootWith(noBlock))).not.toThrow()
  })

  it('names the file, and the likely cause, when package.json is unreadable', () => {
    expect(() => readPackageSnapshot(join(tmpdir(), 'cyweb-does-not-exist'))).toThrow(
      /import\.meta\.url/,
    )
  })

  it.each([['a string', '"nope"'], ['an array', '[]'], ['null', 'null']])(
    'rejects a package.json that parses to %s',
    (_label, body) => {
      // Every later property access would throw a TypeError naming nothing.
      const dir = mkdtempSync(join(tmpdir(), 'cyweb-snapshot-'))
      writeFileSync(join(dir, 'package.json'), body)
      expect(() => readPackageSnapshot(dir)).toThrow(/is not a JSON object/)
    },
  )
})

describe('parseAppMeta', () => {
  it('is what readAppMeta wraps', () => {
    const root = rootWith(VALID)
    expect(parseAppMeta(readPackageSnapshot(root))).toEqual(readAppMeta(root))
  })

  it('ignores submission-only metadata entirely', () => {
    // The runtime path must not care that these are unusable. Packaging will.
    const root = rootWith({
      ...VALID,
      author: 42,
      license: [],
      repository: 'not://a repository',
      homepage: { nope: true },
      keywords: 'not an array',
    })
    expect(parseAppMeta(readPackageSnapshot(root)).id).toBe('myApp')
  })

  it('accepts an identity that the submission profile will later reject', () => {
    // 200-character version, 300-character display name: both legal here, both
    // outside the App Store profile. Failing these in the runtime reader would
    // break `vite dev` over a rule that exists for a filename and a URL path.
    const version = `1.0.0-${'a'.repeat(194)}`
    expect(version).toHaveLength(200)
    const meta = parseAppMeta(
      readPackageSnapshot(
        rootWith({
          ...VALID,
          version,
          cyweb: { ...VALID.cyweb, displayName: 'x'.repeat(300) },
          repository: 42,
        }),
      ),
    )
    expect(meta.version).toBe(version)
    expect(meta.displayName).toHaveLength(300)
  })
})

describe('parseSubmissionMeta', () => {
  it('carries every field exactly as written, wrong types included', () => {
    // A non-string description reaches a validator that can reject it. The
    // runtime reader coerces the same field to '' — correct for the browser
    // bundle, and destructive for a manifest.
    const root = rootWith({
      ...VALID,
      description: 42,
      author: { name: 'Jane Doe', email: 'jane@example.org' },
      license: 'MIT',
      repository: 'git+https://github.com/example/my-app.git',
      homepage: 'https://example.org/my-app',
      keywords: ['layout', 'analysis'],
      cyweb: { ...VALID.cyweb, compatibleHostVersions: '>=1.1.0-0' },
    })
    const snapshot = readPackageSnapshot(root)

    expect(parseSubmissionMeta(snapshot)).toEqual({
      description: 42,
      author: { name: 'Jane Doe', email: 'jane@example.org' },
      license: 'MIT',
      repository: 'git+https://github.com/example/my-app.git',
      homepage: 'https://example.org/my-app',
      keywords: ['layout', 'analysis'],
      compatibleHostVersions: '>=1.1.0-0',
    })
    expect(parseAppMeta(snapshot).description).toBe('')
  })

  it('reports every absent field as undefined rather than inventing one', () => {
    expect(parseSubmissionMeta(readPackageSnapshot(rootWith(VALID)))).toEqual({
      description: 'Colors nodes by degree',
      author: undefined,
      license: undefined,
      repository: undefined,
      homepage: undefined,
      keywords: undefined,
      compatibleHostVersions: undefined,
    })
  })

  it('survives a cyweb block that is not an object', () => {
    const snapshot = readPackageSnapshot(rootWith({ ...VALID, cyweb: 'nope' }))
    expect(parseSubmissionMeta(snapshot).compatibleHostVersions).toBeUndefined()
    expect(() => parseAppMeta(snapshot)).toThrow(/has no "cyweb" block/)
  })
})

describe('sharedExpectations', () => {
  it('expands peerDependencies the way the build does', () => {
    const root = rootWith({
      ...VALID,
      peerDependencies: { react: '18.3.1', '@mui/material': '^5.18.0' },
    })
    expect(sharedExpectations(readPackageSnapshot(root))).toEqual({
      react: { singleton: true, import: false, requiredVersion: '18.3.1' },
      '@mui/material': { singleton: true, import: false, requiredVersion: '^5.18.0' },
    })
  })

  it.each([
    ['absent', VALID],
    ['not an object', { ...VALID, peerDependencies: 'nope' }],
  ])('shares nothing when peerDependencies is %s', (_label, pkg) => {
    // The non-React case legitimately shares nothing.
    expect(sharedExpectations(readPackageSnapshot(rootWith(pkg)))).toEqual({})
  })
})

describe('one snapshot per caller', () => {
  it('verifyApp reads package.json exactly once', () => {
    // It used to read twice — once for identity, once for peers — so the two
    // could in principle disagree. The count is the guarantee.
    const root = rootWith(VALID)
    spy.packageJsonReads.length = 0
    verifyApp({ root })
    expect(spy.packageJsonReads.filter((p) => p.startsWith(root))).toHaveLength(1)
  })
})
