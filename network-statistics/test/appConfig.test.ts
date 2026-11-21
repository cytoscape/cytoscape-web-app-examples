// Smoke test: the app still exports a CyApp the host can load.
//
// Deliberately not a runtime-plugin test. That file used to live here in five
// near-identical copies; it now lives once in @cytoscape-web/app-runtime, where
// the code it tests lives. What is left here is the thing that is specific to
// THIS app — its identity and the shape of what it exposes.
//
// It reaches the AppConfig through src/index.ts, the exact module the host
// loads as `./AppConfig`, so a broken re-export fails here rather than in a
// browser.

import { describe, expect, it } from 'vitest'

import { readAppMeta } from '@cytoscape-web/app-runtime/vite'

const root = new URL('..', import.meta.url).pathname

describe('network-statistics', () => {
  it('declares valid app metadata', () => {
    // The cyweb block is load-bearing: the federation container name, the dev
    // server port and the install manifest all read from it.
    const meta = readAppMeta(root)
    expect(meta.id).toBe('networkStatistics')
  })

  it('exposes a CyApp whose id matches the federation container', async () => {
    const { default: app } = await import('../src/index')
    const meta = readAppMeta(root)

    // The host rejects a mismatch at load time with a warning nobody sees
    // (loadRemoteApp.ts). Catching it here costs nothing.
    expect(app.id).toBe(meta.id)
    expect(app.name).toBeTruthy()
    expect(app.version).toBe(meta.version)
  })

  it('declares no resources, and drives itself from the lifecycle hooks', async () => {
    const { default: app } = await import('../src/index')

    // The point of this example: a Cytoscape Web app does not have to render
    // anything. It listens for host events in mount() and cleans them up in
    // unmount(), which is also why it shares nothing and reports 16 verify
    // checks rather than 26.
    expect(app.resources ?? []).toHaveLength(0)
    expect(typeof app.mount).toBe('function')
    expect(typeof app.unmount).toBe('function')
  })
})
