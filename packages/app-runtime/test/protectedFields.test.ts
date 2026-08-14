// The escape hatch has to stay open AND the invariants have to hold.
//
// The failure this guards against is not a crash — it is a config that reads
// one way and behaves another, which is the exact defect the SDK exists to
// remove from app configs in the first place.

import { describe, expect, it } from 'vitest'

import { assertNoProtectedOverrides } from '../src/vite/protectedFields.js'

describe('assertNoProtectedOverrides', () => {
  it('allows the additions the escape hatch exists for', () => {
    expect(() =>
      assertNoProtectedOverrides({
        plugins: [],
        resolve: { alias: { '@': '/src' } },
        define: { __FLAG__: 'true' },
        build: { sourcemap: true },
        server: { host: true },
      }),
    ).not.toThrow()
  })

  it('accepts an absent config', () => {
    expect(() => assertNoProtectedOverrides(undefined)).not.toThrow()
  })

  it.each([
    ['base', { base: '/app/' }],
    ['build.target', { build: { target: 'es2020' } }],
    ['build.outDir', { build: { outDir: 'out' } }],
    ['server.port', { server: { port: 1234 } }],
    ['server.strictPort', { server: { strictPort: false } }],
    ['server.origin', { server: { origin: 'http://elsewhere' } }],
    [
      'server.headers.Access-Control-Allow-Origin',
      { server: { headers: { 'Access-Control-Allow-Origin': 'https://one.example' } } },
    ],
  ])('rejects %s and names the path', (path, config) => {
    expect(() => assertNoProtectedOverrides(config)).toThrow(new RegExp(path.replace(/\./g, '\\.')))
  })

  it('rejects an explicit undefined, because absence is the protected value', () => {
    // `base: undefined` is not the same as not writing `base`. Vite would still
    // see the key; more importantly the developer clearly meant to control it,
    // and silently agreeing with them is how the disagreement stays hidden.
    expect(() => assertNoProtectedOverrides({ base: undefined })).toThrow(/base/)
  })

  it('reports every conflict at once', () => {
    // Fixing them one build at a time, when the whole list was knowable on the
    // first run, is a bad trade for whoever is waiting on the build.
    let message = ''
    try {
      assertNoProtectedOverrides({ base: '/x/', build: { outDir: 'out' } })
    } catch (error) {
      message = (error as Error).message
    }
    expect(message).toMatch(/2 field\(s\)/)
    expect(message).toMatch(/base/)
    expect(message).toMatch(/build\.outDir/)
  })
})
