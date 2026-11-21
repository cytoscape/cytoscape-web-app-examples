// Every rejection readAppMeta implements.
//
// These matter more than they look. This validation runs before anything else
// a new app does, so its messages are the first thing a developer — or an agent
// — reads from this toolchain. A build that dies on "Cannot read properties of
// undefined" because the cyweb block is missing teaches nothing.

import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { readAppMeta } from '../src/vite/appMeta.js'

const VALID = {
  name: '@example/my-app',
  version: '0.1.0',
  description: 'Colors nodes by degree',
  cyweb: { id: 'myApp', displayName: 'Degree Colorizer', port: 6000 },
}

/** Writes a package.json into a throwaway directory and returns the root. */
const rootWith = (pkg: unknown): string => {
  const dir = mkdtempSync(join(tmpdir(), 'cyweb-meta-'))
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg))
  return dir
}

describe('readAppMeta', () => {
  it('reads identity from the cyweb block and the standard fields', () => {
    expect(readAppMeta(rootWith(VALID))).toEqual({
      id: 'myApp',
      displayName: 'Degree Colorizer',
      port: 6000,
      version: '0.1.0',
      description: 'Colors nodes by degree',
    })
  })

  it('treats a missing description as empty rather than failing', () => {
    const { description: _dropped, ...noDescription } = VALID
    expect(readAppMeta(rootWith(noDescription)).description).toBe('')
  })

  it('names the file, and the likely cause, when package.json is unreadable', () => {
    // The realistic failure is defineCyWebApp being called from somewhere other
    // than the app's own vite.config.ts, and the message has to say so — the
    // path alone looks like a corrupt checkout.
    expect(() => readAppMeta(join(tmpdir(), 'cyweb-does-not-exist'))).toThrow(
      /import\.meta\.url/,
    )
  })

  it('rejects a package.json with no cyweb block, and shows the block to add', () => {
    const { cyweb: _dropped, ...noBlock } = VALID
    expect(() => readAppMeta(rootWith(noBlock))).toThrow(/"cyweb": \{ "id"/)
  })

  it.each([
    ['a hyphen', 'my-app'],
    ['a leading digit', '1app'],
    ['a dot', 'my.app'],
    ['empty', ''],
    ['not a string', 42],
  ])('rejects an id that is not a JS identifier: %s', (_label, id) => {
    // The host applies the same regex in parseManifest.ts. An id that passed
    // here and failed there would be dropped at install with a warning nobody
    // sees.
    expect(() =>
      readAppMeta(rootWith({ ...VALID, cyweb: { ...VALID.cyweb, id } })),
    ).toThrow(/cyweb\.id must be a valid JavaScript identifier/)
  })

  it('rejects the host\'s own name', () => {
    expect(() =>
      readAppMeta(rootWith({ ...VALID, cyweb: { ...VALID.cyweb, id: 'cyweb' } })),
    ).toThrow(/reserved/)
  })

  it.each([
    ['a string', '6000'],
    ['out of range', 70000],
    ['zero', 0],
    ['fractional', 6000.5],
  ])('rejects a port that is not a usable integer: %s', (_label, port) => {
    expect(() =>
      readAppMeta(rootWith({ ...VALID, cyweb: { ...VALID.cyweb, port } })),
    ).toThrow(/cyweb\.port must be an integer/)
  })

  it.each([
    ['missing', undefined],
    ['not canonical', '1.0'],
    ['leading v', 'v1.0.0'],
    ['a range', '^1.0.0'],
  ])('rejects a version that is not canonical SemVer: %s', (_label, version) => {
    // The App Store artifact is named after it, and the host reads it.
    expect(() => readAppMeta(rootWith({ ...VALID, version }))).toThrow(
      /canonical SemVer/,
    )
  })

  it('accepts a prerelease and a build tag', () => {
    expect(readAppMeta(rootWith({ ...VALID, version: '1.0.0-beta.3' })).version).toBe(
      '1.0.0-beta.3',
    )
    expect(readAppMeta(rootWith({ ...VALID, version: '1.0.0+build.1' })).version).toBe(
      '1.0.0+build.1',
    )
  })
})
