// Which host a dev session is pointed at.
//
// Tested away from a running server because the decision is pure and the two
// failure modes are silent: an app that loads its code from one host while
// printing an install link for another, and an environment variable that looks
// set but changed nothing.

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DEV_HOST_PAGE_URL,
  DEV_HOST_ENV,
  resolveDevHost,
} from '../src/vite/devHost.js'

const DEV1 = 'https://dev1.ndexbio.org/cytoscape'
const noEnv = {}
const env = (value: string) => ({ [DEV_HOST_ENV]: value })

describe('resolveDevHost — without the environment variable', () => {
  // The property that matters most: an app that does not opt in must behave
  // exactly as it did before this existed.
  it('defaults to the local host', () => {
    const host = resolveDevHost({}, noEnv)
    expect(host.pageUrl).toBe(DEFAULT_DEV_HOST_PAGE_URL)
    expect(host.remoteEntryUrl).toBe('http://localhost:5500/remoteEntry.js')
    expect(host.fromEnv).toBe(false)
  })

  it('honours devHostPageUrl from the config', () => {
    const host = resolveDevHost({ devHostPageUrl: 'http://localhost:4000' }, noEnv)
    expect(host.pageUrl).toBe('http://localhost:4000/')
    expect(host.remoteEntryUrl).toBe('http://localhost:4000/remoteEntry.js')
  })

  it('honours an explicit devHostRemoteEntryUrl', () => {
    const host = resolveDevHost(
      { devHostPageUrl: DEV1, devHostRemoteEntryUrl: 'https://elsewhere/x.js' },
      noEnv,
    )
    expect(host.remoteEntryUrl).toBe('https://elsewhere/x.js')
  })
})

describe('resolveDevHost — with the environment variable', () => {
  it('redirects the session at the named host', () => {
    const host = resolveDevHost({}, env(DEV1))
    expect(host.pageUrl).toBe(`${DEV1}/`)
    expect(host.fromEnv).toBe(true)
  })

  it('overrides a host the app committed to its own config', () => {
    const host = resolveDevHost({ devHostPageUrl: 'http://localhost:5500' }, env(DEV1))
    expect(host.pageUrl).toBe(`${DEV1}/`)
  })

  // The base path is the reason page URL and entry URL are separate concepts:
  // dev1 serves the host under /cytoscape, so its entry lives inside that path.
  it('keeps the host base path in the derived entry URL', () => {
    const host = resolveDevHost({}, env(DEV1))
    expect(host.remoteEntryUrl).toBe(
      'https://dev1.ndexbio.org/cytoscape/remoteEntry.js',
    )
  })

  // A URL copied out of an address bar usually has one.
  it('tolerates a trailing slash rather than doubling it', () => {
    const host = resolveDevHost({}, env(`${DEV1}/`))
    expect(host.remoteEntryUrl).toBe(
      'https://dev1.ndexbio.org/cytoscape/remoteEntry.js',
    )
  })

  it('is treated as unset when blank', () => {
    expect(resolveDevHost({}, env('   ')).fromEnv).toBe(false)
    expect(resolveDevHost({}, env('   ')).pageUrl).toBe(DEFAULT_DEV_HOST_PAGE_URL)
  })

  // Refused rather than resolved by precedence: the two name different hosts,
  // so the app would load code from one and print a link for the other.
  it('refuses to combine with an explicit devHostRemoteEntryUrl', () => {
    expect(() =>
      resolveDevHost({ devHostRemoteEntryUrl: 'https://elsewhere/x.js' }, env(DEV1)),
    ).toThrow(/point at different hosts/)
  })

  it.each([
    ['not a url', 'dev1.ndexbio.org'],
    ['a non-http scheme', 'file:///tmp/host'],
    ['nonsense', '???'],
  ])('rejects %s rather than falling back silently', (_label, value) => {
    expect(() => resolveDevHost({}, env(value))).toThrow(/CYWEB_DEV_HOST/)
  })
})

describe('resolveDevHost — local network permission', () => {
  // Measured in Chrome: a page on a public origin loading from localhost is a
  // public-to-loopback request and is blocked until the user allows it.
  it('is needed for an off-loopback host', () => {
    expect(resolveDevHost({}, env(DEV1)).needsLocalNetworkPermission).toBe(true)
  })

  // Loopback to loopback crosses no boundary, so the browser asks nothing.
  it.each(['http://localhost:5500', 'http://127.0.0.1:5500'])(
    'is not needed for %s',
    (url) => {
      expect(
        resolveDevHost({ devHostPageUrl: url }, noEnv).needsLocalNetworkPermission,
      ).toBe(false)
    },
  )
})
