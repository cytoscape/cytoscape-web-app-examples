// The dev install manifest and the deep link that consumes it.
//
// Worth testing away from a running server because both are contracts with the
// HOST, not with this repository: parseSingleEntryManifest decides what shape it
// accepts, and installGate decides which origins it will load code from. Getting
// either subtly wrong produces an install that fails with a warning nobody sees.

import { describe, expect, it } from 'vitest'

import { buildInstallManifest, buildInstallUrl } from '../src/vite/devInstall.js'

const META = {
  id: 'myApp',
  displayName: 'Degree Colorizer',
  port: 6000,
  version: '0.1.0',
  description: 'Colors nodes by degree',
}

describe('buildInstallManifest', () => {
  it('is a single-entry array, which is what the host parses', () => {
    // parseSingleEntryManifest runs the standard parseManifest over it, so an
    // object rather than an array yields zero entries and a silent no-op.
    const manifest = buildInstallManifest(META, 'http://localhost:6000')
    expect(Array.isArray(manifest)).toBe(true)
    expect(manifest).toHaveLength(1)
  })

  it('carries the fields the host reads, with url pointing at remoteEntry.js', () => {
    expect(buildInstallManifest(META, 'http://localhost:6000')[0]).toEqual({
      id: 'myApp',
      name: 'Degree Colorizer',
      url: 'http://localhost:6000/remoteEntry.js',
      version: '0.1.0',
      description: 'Colors nodes by degree',
    })
  })

  it('omits description rather than sending an empty one', () => {
    const entry = buildInstallManifest({ ...META, description: '' }, 'http://localhost:6000')[0]
    expect('description' in entry).toBe(false)
  })

  it('keeps a base path when the app is served under one', () => {
    // Concatenation would produce ".../appsremoteEntry.js" or drop the segment.
    expect(
      buildInstallManifest(META, 'http://localhost:6000/apps')[0].url,
    ).toBe('http://localhost:6000/apps/remoteEntry.js')
  })
})

describe('buildInstallUrl', () => {
  it('puts the manifest URL in the installApp parameter', () => {
    const url = buildInstallUrl(
      'http://localhost:5500',
      'http://localhost:6000/cyweb-app.json',
    )
    expect(new URL(url).searchParams.get('installApp')).toBe(
      'http://localhost:6000/cyweb-app.json',
    )
  })

  it('encodes the nested URL so the host receives it whole', () => {
    // The value contains :// and a query-significant colon. Unencoded, the host
    // reads a truncated URL and fetches something that does not exist.
    const url = buildInstallUrl('http://localhost:5500', 'http://x.test/a.json?v=1')
    expect(url).toContain('installApp=http%3A%2F%2Fx.test%2Fa.json%3Fv%3D1')
  })

  it('keeps the host\'s own base path', () => {
    // dev1 serves the host from /cytoscape/. Losing that segment points the
    // link at a root that answers 404.
    const url = buildInstallUrl(
      'https://dev1.ndexbio.org/cytoscape/',
      'http://localhost:6000/cyweb-app.json',
    )
    expect(new URL(url).pathname).toBe('/cytoscape/')
  })
})
