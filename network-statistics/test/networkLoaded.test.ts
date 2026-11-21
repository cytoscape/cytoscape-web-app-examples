// Switching is not loading.
//
// After a page reload the host holds only network summaries; a network's
// tables and view load the first time it becomes current, and
// `network:switched` fires BEFORE that load lands. A read made on the switch
// fails with APP1. `network:loaded` (api-types 1.0.0-beta.5) is the host
// saying "now you can read it" — these tests pin the app to that event rather
// than to a timer guessing how long a load takes.
//
// The host is faked: `apis.element` answers only for networks in `loaded`,
// and `window` is a bare EventTarget, which is all the app touches.

import type { AppContext } from 'cyweb/ApiTypes'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NetworkStatisticsApp } from '../src/NetworkStatisticsApp'

const NAMES: Record<string, string> = { n1: 'Network One', n2: 'Network Two' }

let loaded: Set<string>
let currentNetworkId: string
let info: ReturnType<typeof vi.spyOn>

const notFound = (networkId: string) => ({
  success: false as const,
  error: { code: 'APP1', message: `Network ${networkId} not found` },
})

const ok = <T>(data: T) => ({ success: true as const, data })

const fakeContext = (): AppContext => {
  const read =
    <T>(data: T) =>
    (networkId: string) =>
      loaded.has(networkId) ? ok(data) : notFound(networkId)

  return {
    appId: 'networkStatistics',
    apis: {
      element: {
        getNodeIds: read({ nodeIds: ['a', 'b'] }),
        getEdgeIds: read({ edgeIds: ['e1'] }),
        getConnectedEdges: read({ edges: [{ id: 'e1' }] }),
        getRoots: read({ nodeIds: ['a'] }),
        getLeaves: read({ nodeIds: ['b'] }),
      },
      workspace: {
        getCurrentNetworkId: () => ok({ networkId: currentNetworkId }),
        getNetworkSummary: (networkId: string) =>
          ok({ name: NAMES[networkId] ?? networkId }),
      },
    },
  } as unknown as AppContext
}

const fire = (type: string, networkId: string): void => {
  window.dispatchEvent(new CustomEvent(type, { detail: { networkId } }))
}

/** The networks whose statistics were logged, in order. */
const logged = (): string[] =>
  info.mock.calls
    .map((args: unknown[]) => String(args[1]))
    .flatMap((text: string) =>
      Object.entries(NAMES)
        .filter(([, name]) => text.includes(`Network Statistics: ${name}`))
        .map(([networkId]) => networkId),
    )

beforeEach(() => {
  vi.stubGlobal('window', new EventTarget())
  info = vi.spyOn(console, 'info').mockImplementation(() => {})
  loaded = new Set()
  currentNetworkId = ''
})

afterEach(() => {
  NetworkStatisticsApp.unmount?.()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('network-statistics and network:loaded', () => {
  it('logs the current network on mount when its data is already loaded', () => {
    loaded.add('n1')
    currentNetworkId = 'n1'

    NetworkStatisticsApp.mount?.(fakeContext())

    expect(logged()).toEqual(['n1'])
  })

  it('logs a network switched to before its data loaded once network:loaded fires', () => {
    NetworkStatisticsApp.mount?.(fakeContext())

    fire('network:switched', 'n1')
    expect(logged()).toEqual([])

    loaded.add('n1')
    fire('network:loaded', 'n1')

    // Synchronously, on the event — no timer involved.
    expect(logged()).toEqual(['n1'])
  })

  it('logs a current network that was still loading at mount once it loads', () => {
    currentNetworkId = 'n1'

    NetworkStatisticsApp.mount?.(fakeContext())
    expect(logged()).toEqual([])

    loaded.add('n1')
    fire('network:loaded', 'n1')

    expect(logged()).toEqual(['n1'])
  })

  it('ignores network:loaded for a network the user already left', () => {
    NetworkStatisticsApp.mount?.(fakeContext())

    fire('network:switched', 'n1') // not loaded yet
    loaded.add('n2')
    fire('network:switched', 'n2') // loaded: logged on the switch

    loaded.add('n1')
    fire('network:loaded', 'n1') // n1 is no longer the one on screen

    expect(logged()).toEqual(['n2'])
  })

  it('does not log twice when network:loaded follows a switch that could already read', () => {
    NetworkStatisticsApp.mount?.(fakeContext())

    // A brand-new network: its data can be readable on the switch, and
    // network:loaded still fires for it once.
    loaded.add('n1')
    fire('network:switched', 'n1')
    fire('network:loaded', 'n1')

    expect(logged()).toEqual(['n1'])
  })

  it('stops listening on unmount', () => {
    NetworkStatisticsApp.mount?.(fakeContext())
    fire('network:switched', 'n1') // not loaded yet
    NetworkStatisticsApp.unmount?.()

    loaded.add('n1')
    fire('network:loaded', 'n1')
    fire('network:switched', 'n1')

    expect(logged()).toEqual([])
  })
})
