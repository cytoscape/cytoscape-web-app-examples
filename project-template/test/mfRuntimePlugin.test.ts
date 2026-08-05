// Tests the runtime host resolver against a REAL ModuleFederation instance.
//
// Not a hand-built args object, deliberately: the bug this guards against is
// precisely a mismatch with the runtime's internals. The plugin has to write
// `userOptions.remotes` on first init and `options.remotes` on re-init, and a
// mock would happily accept a plugin that writes neither — which is how the
// first-init case was missed in an earlier revision of the design.
//
// Verified against @module-federation/runtime 2.5.1, whose behaviour is:
//
//   construct → beforeInit sees userOptions.remotes = [declared], options.remotes = []
//   re-init   → beforeInit sees userOptions.remotes = [new],      options.remotes = [previous]
//
// Lives outside src/ so the app tsconfig (which keeps skipLibCheck: false) does
// not have to pull in the MF runtime's types — those reach `webpack`.

import { ModuleFederation } from '@module-federation/runtime'
import { afterEach, describe, expect, it } from 'vitest'

import { CYWEB_HOST_REQUIRED } from '../src/cywebHostSentinel'
import cywebHostResolver from '../src/mfRuntimePlugin'

const DEV_ENTRY = 'http://localhost:5500/remoteEntry.js'
const HOST_ENTRY = 'https://web.cytoscape.org/remoteEntry.js'

type Descriptor = { name?: unknown; remoteEntry?: unknown; apiVersion?: unknown }

const setDescriptor = (descriptor: Descriptor | undefined): void => {
  const g = globalThis as { __CYWEB_HOST__?: Descriptor }
  if (descriptor === undefined) delete g.__CYWEB_HOST__
  else g.__CYWEB_HOST__ = descriptor
}

/** Builds an instance with the resolver registered and `cyweb` declared. */
const initWith = (entry: string): ModuleFederation =>
  new ModuleFederation({
    name: 'template',
    remotes: [{ name: 'cyweb', entry, type: 'module' }],
    plugins: [cywebHostResolver()],
  })

const entryOf = (instance: ModuleFederation): string | undefined =>
  (instance.options.remotes as Array<{ name: string; entry?: string }>).find(
    (r) => r.name === 'cyweb',
  )?.entry

afterEach(() => setDescriptor(undefined))

describe('cyweb-host-resolver', () => {
  it('replaces the entry on first init (userOptions.remotes)', () => {
    // The path an app actually takes. On first init options.remotes is still
    // empty, so a plugin that wrote only that array would silently no-op and
    // the app would load from its compiled-in entry.
    setDescriptor({ name: 'cyweb', remoteEntry: HOST_ENTRY, apiVersion: '1.0' })
    expect(entryOf(initWith(CYWEB_HOST_REQUIRED))).toBe(HOST_ENTRY)
  })

  it('replaces the entry on re-init (options.remotes)', () => {
    // On re-init the already-registered set is in options.remotes, and
    // registerRemote is called with force:false — so the userOptions copy is
    // ignored and only the options one is consulted. The mirror image of the
    // case above, and the reason both arrays are written.
    setDescriptor({ name: 'cyweb', remoteEntry: HOST_ENTRY, apiVersion: '1.0' })
    const instance = initWith(CYWEB_HOST_REQUIRED)

    const second = 'https://other.example/remoteEntry.js'
    setDescriptor({ name: 'cyweb', remoteEntry: second, apiVersion: '1.0' })
    instance.initOptions({
      name: 'template',
      remotes: [{ name: 'cyweb', entry: CYWEB_HOST_REQUIRED, type: 'module' }],
    })

    expect(entryOf(instance)).toBe(second)
  })

  it('leaves a dev build alone when no descriptor is published', () => {
    // Standalone `vite dev`, or an old host. The compiled-in localhost entry is
    // a developer default and is allowed to stand — it is only ever produced by
    // `command === 'serve'`.
    setDescriptor(undefined)
    expect(entryOf(initWith(DEV_ENTRY))).toBe(DEV_ENTRY)
  })

  it.each([
    ['descriptor absent', undefined],
    ['name missing', { remoteEntry: HOST_ENTRY }],
    ['name is not cyweb', { name: 'other', remoteEntry: HOST_ENTRY }],
    ['remoteEntry empty', { name: 'cyweb', remoteEntry: '' }],
    ['remoteEntry relative', { name: 'cyweb', remoteEntry: '/remoteEntry.js' }],
    ['remoteEntry file: scheme', { name: 'cyweb', remoteEntry: 'file:///x.js' }],
    ['remoteEntry data: scheme', { name: 'cyweb', remoteEntry: 'data:text/javascript,0' }],
    ['remoteEntry not a string', { name: 'cyweb', remoteEntry: 42 }],
  ])(
    'a production build throws when the descriptor is unusable: %s',
    (_label, descriptor) => {
      // Every rejection readHostEntry implements, not just the absent case.
      // Each of these would otherwise leave the sentinel in place and fail
      // later, at use, with nothing naming the cause.
      setDescriptor(descriptor as Descriptor | undefined)
      expect(() => initWith(CYWEB_HOST_REQUIRED)).toThrow(
        /\[cyweb-host-resolver\] This app must be loaded by Cytoscape Web/,
      )
    },
  )

  it('does not touch remotes other than cyweb', () => {
    setDescriptor({ name: 'cyweb', remoteEntry: HOST_ENTRY, apiVersion: '1.0' })
    const instance = new ModuleFederation({
      name: 'template',
      remotes: [
        { name: 'cyweb', entry: CYWEB_HOST_REQUIRED, type: 'module' },
        { name: 'other', entry: 'https://elsewhere.example/remoteEntry.js', type: 'module' },
      ],
      plugins: [cywebHostResolver()],
    })

    const remotes = instance.options.remotes as Array<{ name: string; entry?: string }>
    expect(remotes.find((r) => r.name === 'other')?.entry).toBe(
      'https://elsewhere.example/remoteEntry.js',
    )
  })
})
