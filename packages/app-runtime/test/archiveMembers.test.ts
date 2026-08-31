// What may go into an App Store archive, and under what name.
//
// The deny classes are tested with an ALLOWED NEAR-NEIGHBOUR beside each one, so
// a later refactor cannot widen a prefix without a test noticing. That pairing
// is the point of the file: `assets/module-runner-X.js` must be denied while
// `assets/module-runner.js` is published, and only a neighbour proves the rule
// is a prefix rather than a substring.

import { describe, expect, it } from 'vitest'

import {
  ALLOWED_ASSET_EXTENSIONS,
  archiveMemberProblem,
  classifyArchiveMember,
  compareMemberNames,
} from '../src/vite/archiveMembers.js'

const kindOf = (path: string): string => classifyArchiveMember(path).kind

describe('denies run before allows', () => {
  it.each([
    ['remoteEntry.ssr.js', 'remoteEntry.js'],
    ['assets/ssrEntryLoader-QNOvZero.js', 'assets/ssrEntryLoader.js'],
    ['assets/module-runner-DOwQZiHU.js', 'assets/module-runner.js'],
    ['assets/virtual_mf-exposes-ssr__hello__remoteEntry_js-Dhm.js', 'assets/virtual_mf-exposes.js'],
    ['mf-manifest.json', 'assets/mf-manifest.json'],
    ['mf-stats.json', 'assets/mf-stats.json'],
    ['.vite/manifest.json', 'assets/vite/manifest.json'],
    ['index.html', 'assets/index.js'],
    ['assets/nested/page.html', 'assets/nested/page.js'],
    ['assets/chunk.js.map', 'assets/chunk.js'],
  ])('denies %s but publishes %s', (denied, published) => {
    expect(kindOf(denied)).toBe('deny')
    expect(kindOf(published)).toBe('publish')
  })

  it('denies hashed SSR output, which an exact-name rule would readmit', () => {
    // The build emits these with content hashes. `.js` is on the allowlist, so
    // an exact-name deny would let every one of them through.
    for (const hashed of [
      'assets/ssrEntryLoader-C26eHek6.js',
      'assets/module-runner-0dY9tRSr.js',
      'assets/virtual_mf-exposes-ssr__networkStatistics__remoteEntry_js-OUW.js',
    ]) {
      expect(kindOf(hashed), hashed).toBe('deny')
    }
  })

  it('denies HTML and source maps by suffix, anywhere in the tree', () => {
    for (const path of ['index.html', 'a.htm', 'assets/deep/nested/page.html', 'assets/x.js.map']) {
      expect(kindOf(path), path).toBe('deny')
    }
  })
})

describe('the allow half', () => {
  it('publishes the root entry, and does not invent one deeper in the tree', () => {
    expect(kindOf('remoteEntry.js')).toBe('publish')
    expect(kindOf('assets/remoteEntry.js')).toBe('publish') // an asset like any other
    expect(kindOf('nested/remoteEntry.js')).toBe('unmatched')
  })

  it.each(ALLOWED_ASSET_EXTENSIONS.map((extension) => [extension]))(
    'publishes an asset with %s',
    (extension) => {
      expect(kindOf(`assets/thing${extension}`)).toBe('publish')
    },
  )

  it('is case-sensitive, so a difference between filesystems is reported', () => {
    expect(kindOf('assets/thing.JS')).toBe('unmatched')
    expect(kindOf('assets/thing.PNG')).toBe('unmatched')
  })

  it.each([
    ['a data file nobody classified', 'assets/data.csv'],
    ['a CX2 network', 'assets/network.cx2'],
    ['an extensionless file', 'assets/LICENSE'],
    ['anything outside assets/', 'README.md'],
  ])('leaves %s unmatched, which is fatal', (_label, path) => {
    // Widening the list later is additive and safe. Shipping a class nobody has
    // thought about is not.
    expect(kindOf(path)).toBe('unmatched')
  })

  it('flags a cy-manifest.json already in the build output', () => {
    // The submission manifest is generated and injected; a second one would be
    // ambiguous about which the Store should believe.
    expect(kindOf('cy-manifest.json')).toBe('conflict')
  })
})

describe('member names are an OS-independent contract', () => {
  it.each([
    ['', 'is empty'],
    ['/etc/passwd', 'is absolute'],
    ['C:/Windows/system32', 'names a drive letter'],
    ['assets\\chunk.js', 'contains a backslash'],
    ['assets//chunk.js', 'has an empty segment'],
    ['assets/./chunk.js', 'has a "." segment'],
    ['assets/../../etc/passwd', 'has a ".." segment'],
    ['assets/\0.js', 'contains NUL'],
  ])('rejects %j', (path, reason) => {
    expect(archiveMemberProblem(path)).toContain(reason)
  })

  it('accepts an ordinary relative POSIX path', () => {
    expect(archiveMemberProblem('assets/nested/chunk-Abc123.js')).toBeUndefined()
  })
})

describe('one named comparator', () => {
  it('orders by unsigned UTF-8 bytes, not by UTF-16 code units', () => {
    // `A` (0x41) < `_` (0x5F) < `a` (0x61). adm-zip's own default is
    // `toLowerCase().localeCompare(...)`, which depends on the host's ICU data —
    // so the packager turns its sorting off and uses this instead.
    const names = ['b.js', 'A.js', '_c.js', 'a.js']
    expect([...names].sort(compareMemberNames)).toEqual(['A.js', '_c.js', 'a.js', 'b.js'])
  })

  it('orders a non-BMP name by its bytes', () => {
    // U+1F600 is 0xF0 0x9F … in UTF-8 and 0xD83D 0xDE00 in UTF-16, so the two
    // orderings disagree about where it sits relative to U+FFFD (0xEF …).
    expect(compareMemberNames('\u{1F600}.js', '\uFFFD.js')).toBeGreaterThan(0)
    expect('\u{1F600}.js' < '\uFFFD.js').toBe(true)
  })

  it('is a total order that does not depend on the input order', () => {
    const names = ['assets/z.js', 'remoteEntry.js', 'assets/A.js', 'cy-manifest.json']
    const once = [...names].sort(compareMemberNames)
    const again = [...names].reverse().sort(compareMemberNames)
    expect(once).toEqual(again)
  })
})
