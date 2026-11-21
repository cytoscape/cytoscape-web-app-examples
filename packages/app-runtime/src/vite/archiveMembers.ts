/**
 * What may go into an App Store archive, and under what name.
 *
 * Pure and separate from the plugin, because these are the rules a reviewer
 * argues about and a test pins down — not something to read out of a build hook.
 *
 * Two things here are ordering-sensitive and were wrong in earlier drafts:
 *
 *   - **Denies run before allows.** An extension allowlist alone readmits
 *     exactly what must not ship: `mf-manifest.json` and `mf-stats.json` are
 *     `.json`, and the SSR chunks are `.js`.
 *   - **SSR output is denied by PREFIX, not by exact name.** The build emits
 *     `assets/ssrEntryLoader-QNOvZero.js` and `assets/module-runner-DOwQZiHU.js`
 *     with content hashes, so an exact-name rule would let every one of them
 *     through the `.js` allow. HTML and source maps are denied by SUFFIX for the
 *     same reason: `assets/nested/page.html` and `assets/chunk.js.map` are not
 *     at the root.
 */

/** Everything a `.js` or `.json` allow would otherwise readmit. */
const DENY: readonly { readonly rule: string; readonly test: (path: string) => boolean }[] = [
  { rule: 'the SSR entry', test: (p) => p === 'remoteEntry.ssr.js' },
  { rule: 'the SSR entry loader', test: (p) => p.startsWith('assets/ssrEntryLoader-') },
  { rule: 'the SSR module runner', test: (p) => p.startsWith('assets/module-runner-') },
  { rule: 'the SSR exposes chunk', test: (p) => p.startsWith('assets/virtual_mf-exposes-ssr') },
  { rule: 'Federation build metadata', test: (p) => p === 'mf-manifest.json' || p === 'mf-stats.json' },
  { rule: "Vite's own metadata", test: (p) => p.startsWith('.vite/') },
  {
    rule: 'HTML, which the host never loads and a Store origin should not serve',
    test: (p) => p.endsWith('.html') || p.endsWith('.htm'),
  },
  { rule: 'source maps', test: (p) => p.endsWith('.map') },
]

/**
 * The closed set of asset extensions, decided rather than inventoried.
 *
 * The five maintained examples emit only `.js`, so an inventory could not
 * establish policy for anything else. An unmatched extension is fatal, which
 * makes widening this list additive and safe — and shipping a class nobody has
 * thought about is not. Case-sensitive: `assets/x.JS` is unmatched, and being
 * told so beats a silent difference between two filesystems.
 */
export const ALLOWED_ASSET_EXTENSIONS: readonly string[] = [
  '.js',
  '.css',
  '.json',
  '.wasm',
  '.woff2',
  '.woff',
  '.ttf',
  '.otf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.avif',
  '.svg',
]

export type MemberClass =
  | { readonly kind: 'publish' }
  | { readonly kind: 'deny'; readonly rule: string }
  /** A `cy-manifest.json` already in the build output. The generated one is injected. */
  | { readonly kind: 'conflict' }
  | { readonly kind: 'unmatched' }

export const classifyArchiveMember = (path: string): MemberClass => {
  for (const { rule, test } of DENY) if (test(path)) return { kind: 'deny', rule }

  if (path === 'remoteEntry.js') return { kind: 'publish' }
  if (path === 'cy-manifest.json') return { kind: 'conflict' }

  if (path.startsWith('assets/')) {
    const dot = path.lastIndexOf('.')
    const extension = dot === -1 ? '' : path.slice(dot)
    if (ALLOWED_ASSET_EXTENSIONS.includes(extension)) return { kind: 'publish' }
  }
  return { kind: 'unmatched' }
}

/**
 * Archive member names are an OS-INDEPENDENT contract, not a by-product of the
 * machine that built them.
 *
 * Returns why the name is unusable, or `undefined`. A ZIP produced on Windows
 * and one produced on Linux from the same output must contain the same member
 * names in the same order — otherwise "byte-identical" means nothing and the
 * Store's own path checks are guessing at what it received.
 */
export const archiveMemberProblem = (path: string): string | undefined => {
  if (path === '') return 'is empty'
  if (path.includes('\\')) return 'contains a backslash — member names are POSIX paths'
  if (path.includes('\0')) return 'contains NUL'
  if (path.startsWith('/')) return 'is absolute'
  if (/^[A-Za-z]:/.test(path)) return 'names a drive letter'
  for (const segment of path.split('/')) {
    if (segment === '') return 'has an empty segment'
    if (segment === '.' || segment === '..') return `has a "${segment}" segment`
  }
  return undefined
}

/**
 * Unsigned UTF-8 byte order — one named comparator, so two platforms agree.
 *
 * JavaScript's `<` compares UTF-16 code units, which orders characters outside
 * the BMP differently from their UTF-8 bytes. Naming the rule is what lets an
 * archive built anywhere be compared against one built anywhere else.
 */
export const compareMemberNames = (a: string, b: string): number =>
  Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'))
