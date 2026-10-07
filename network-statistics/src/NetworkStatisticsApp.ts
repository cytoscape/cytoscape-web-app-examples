/**
 * NetworkStatisticsApp — a **non-React** Cytoscape Web app example.
 *
 * This app has NO React components. It uses only the mount()/unmount()
 * lifecycle and the Graph Traversal API to compute and log network
 * statistics whenever the user switches to a different network.
 *
 * Key concepts demonstrated:
 *   - CyAppWithLifecycle without any `resources` (no panels, no menus)
 *   - Event-driven architecture via window.addEventListener
 *   - `network:switched` vs `network:loaded`: switching is not loading
 *   - Graph Traversal API: getNodeIds, getEdgeIds, getConnectedEdges,
 *     getRoots, getLeaves
 *   - Pure computation separated from API calls (statistics.ts)
 *   - Proper cleanup in unmount()
 */
import type { AppContext, CyAppWithLifecycle } from 'cyweb/ApiTypes'
// Your app's identity, from the `cyweb` block and the standard fields in
// package.json. Four values, supplied by the build.
//
// NOT `import packageJson from '../package.json'`, which is what this used to
// be: that pulls the WHOLE file into the browser bundle — devDependencies,
// scripts, every private field — to read one string.
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

import {
  computeDegreeStats,
  computeDensity,
  formatStatistics,
  type NetworkStatistics,
} from './statistics'

const LOG_PREFIX = '[NetworkStatistics]'

// ── Module-level state ──────────────────────────────────────────────────────
// Store the event handler reference so unmount() can remove the exact same
// function from the event listener.
let _networkSwitchedHandler: ((e: Event) => void) | null = null
let _networkLoadedHandler: ((e: Event) => void) | null = null
let _selectionChangedHandler: ((e: Event) => void) | null = null

// The network we tried to read before its data had loaded. Its
// `network:loaded` is the cue to read again; a load for any other network is
// not ours to report.
let _awaitingNetworkId: string | null = null

// ── API interaction ─────────────────────────────────────────────────────────

/**
 * Collect network statistics by calling the Element API and computing
 * derived metrics via pure functions in statistics.ts.
 *
 * Returns null if the network data is not available — the reads fail with
 * APP1 while a network that just became current is still loading.
 */
function collectStatistics(
  networkId: string,
  apis: AppContext['apis'],
): NetworkStatistics | null {
  const nodeIdsResult = apis.element.getNodeIds(networkId)
  const edgeIdsResult = apis.element.getEdgeIds(networkId)

  if (!nodeIdsResult.success || !edgeIdsResult.success) {
    return null
  }

  const { nodeIds } = nodeIdsResult.data
  const { edgeIds } = edgeIdsResult.data
  const nodeCount = nodeIds.length
  const edgeCount = edgeIds.length

  // Compute per-node degree by counting connected edges
  const degrees: number[] = []
  let isolatedNodeCount = 0

  for (const nodeId of nodeIds) {
    const edgesResult = apis.element.getConnectedEdges(networkId, nodeId)
    if (edgesResult.success) {
      const degree = edgesResult.data.edges.length
      degrees.push(degree)
      if (degree === 0) isolatedNodeCount++
    } else {
      degrees.push(0)
    }
  }

  // Roots (no incoming edges) and leaves (no outgoing edges)
  const rootsResult = apis.element.getRoots(networkId)
  const leavesResult = apis.element.getLeaves(networkId)
  const rootCount = rootsResult.success ? rootsResult.data.nodeIds.length : 0
  const leafCount = leavesResult.success ? leavesResult.data.nodeIds.length : 0

  const density = computeDensity(nodeCount, edgeCount)
  const degreeStats = computeDegreeStats(degrees)

  return {
    nodeCount,
    edgeCount,
    density,
    avgDegree: degreeStats.avg,
    maxDegree: degreeStats.max,
    minDegree: degreeStats.min,
    rootCount,
    leafCount,
    isolatedNodeCount,
  }
}

/**
 * Log statistics for a given network to the browser console.
 *
 * Switching is not loading. After a page reload the workspace holds only
 * network summaries; a network's data loads the first time it becomes
 * current, and `network:switched` fires before that load lands. When the
 * read fails here, the network is remembered and read again on its
 * `network:loaded` — no timer guessing how long a load takes.
 */
function logStatisticsForNetwork(
  networkId: string,
  apis: AppContext['apis'],
): void {
  const stats = collectStatistics(networkId, apis)

  if (stats === null) {
    // Replaces any earlier wait: only the latest network is on screen.
    _awaitingNetworkId = networkId
    return
  }
  _awaitingNetworkId = null

  const summaryResult = apis.workspace.getNetworkSummary(networkId)
  const networkName = summaryResult.success
    ? summaryResult.data.name
    : networkId

  console.info(LOG_PREFIX, '\n' + formatStatistics(networkName, stats))
}

// ── App definition ──────────────────────────────────────────────────────────

export const NetworkStatisticsApp: CyAppWithLifecycle = {
  // Identity comes from package.json — change it there, not here. `id` is the
  // Module Federation container name, the CyApp id and the registry id at once,
  // so it is one value rather than three that have to agree.
  id,
  name: displayName,
  description,
  version,
  apiVersion: '1.0',

  // No `resources` — this app has no UI components.

  mount(context: AppContext): void {
    const { apis } = context

    // 1. Log statistics for the current network immediately. If it is still
    //    loading, its `network:loaded` (step 3) picks it up.
    const currentResult = apis.workspace.getCurrentNetworkId()
    if (currentResult.success && currentResult.data.networkId) {
      logStatisticsForNetwork(currentResult.data.networkId, apis)
    }

    // 2. Listen for network switches and log statistics each time.
    _networkSwitchedHandler = (e: Event): void => {
      const { networkId } = (e as CustomEvent<{ networkId: string }>).detail
      logStatisticsForNetwork(networkId, apis)
    }
    window.addEventListener('network:switched', _networkSwitchedHandler)

    // 3. Read again once the network we could not read has loaded.
    //    `network:loaded` also fires for networks that are not on screen
    //    (created without navigating, or added by another tab), and fires
    //    once — so it is a retry cue, not a second "network changed" event.
    _networkLoadedHandler = (e: Event): void => {
      const { networkId } = (e as CustomEvent<{ networkId: string }>).detail
      if (networkId === _awaitingNetworkId) {
        logStatisticsForNetwork(networkId, apis)
      }
    }
    window.addEventListener('network:loaded', _networkLoadedHandler)

    // 4. Listen for selection changes and log a short summary.
    _selectionChangedHandler = (e: Event): void => {
      const detail = (
        e as CustomEvent<{
          networkId: string
          selectedNodes: string[]
          selectedEdges: string[]
        }>
      ).detail
      const nodeCount = detail.selectedNodes.length
      const edgeCount = detail.selectedEdges.length
      if (nodeCount > 0 || edgeCount > 0) {
        console.info(
          LOG_PREFIX,
          `Selection: ${nodeCount} node(s), ${edgeCount} edge(s)`,
        )
      }
    }
    window.addEventListener('selection:changed', _selectionChangedHandler)

    console.info(
      LOG_PREFIX,
      'Mounted — listening for network:switched, network:loaded and selection:changed events.',
    )
  },

  unmount(): void {
    _awaitingNetworkId = null
    if (_networkSwitchedHandler !== null) {
      window.removeEventListener('network:switched', _networkSwitchedHandler)
      _networkSwitchedHandler = null
    }
    if (_networkLoadedHandler !== null) {
      window.removeEventListener('network:loaded', _networkLoadedHandler)
      _networkLoadedHandler = null
    }
    if (_selectionChangedHandler !== null) {
      window.removeEventListener('selection:changed', _selectionChangedHandler)
      _selectionChangedHandler = null
    }
    console.info(LOG_PREFIX, 'Unmounted — all event listeners removed.')
  },
}
