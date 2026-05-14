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
 *   - Graph Traversal API: getNodeIds, getEdgeIds, getConnectedEdges,
 *     getRoots, getLeaves
 *   - Pure computation separated from API calls (statistics.ts)
 *   - Proper cleanup in unmount()
 */
import type { AppContext, CyAppWithLifecycle } from 'cyweb/ApiTypes'
import packageJson from '../package.json'

import {
  computeDegreeStats,
  computeDensity,
  formatStatistics,
  type NetworkStatistics,
} from './statistics'

const { version } = packageJson

const LOG_PREFIX = '[NetworkStatistics]'

// Maximum number of retries when network data is not yet loaded.
const MAX_RETRIES = 5
const RETRY_DELAY_MS = 500

// ── Module-level state ──────────────────────────────────────────────────────
// Store the event handler reference so unmount() can remove the exact same
// function from the event listener.
let _networkSwitchedHandler: ((e: Event) => void) | null = null
let _selectionChangedHandler: ((e: Event) => void) | null = null
let _pendingRetryTimer: ReturnType<typeof setTimeout> | null = null

// ── API interaction ─────────────────────────────────────────────────────────

/**
 * Collect network statistics by calling the Element API and computing
 * derived metrics via pure functions in statistics.ts.
 *
 * Returns null if the network data is not available (e.g. still loading
 * after a network switch).
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
 * The `network:switched` event fires as soon as the current network ID
 * changes in WorkspaceStore. At that point the network data may not yet
 * be loaded into NetworkStore (e.g. when hydrating from IndexedDB).
 * To handle this, we retry with a short delay up to MAX_RETRIES times.
 */
function logStatisticsForNetwork(
  networkId: string,
  apis: AppContext['apis'],
  attempt = 0,
): void {
  // Cancel any pending retry for a previous network switch.
  if (_pendingRetryTimer !== null) {
    clearTimeout(_pendingRetryTimer)
    _pendingRetryTimer = null
  }

  const stats = collectStatistics(networkId, apis)

  if (stats === null) {
    if (attempt < MAX_RETRIES) {
      _pendingRetryTimer = setTimeout(
        () => logStatisticsForNetwork(networkId, apis, attempt + 1),
        RETRY_DELAY_MS,
      )
    } else {
      console.warn(
        LOG_PREFIX,
        `Network data for ${networkId} not available after ${MAX_RETRIES} retries.`,
      )
    }
    return
  }

  const summaryResult = apis.workspace.getNetworkSummary(networkId)
  const networkName = summaryResult.success
    ? summaryResult.data.name
    : networkId

  console.info(LOG_PREFIX, '\n' + formatStatistics(networkName, stats))
}

// ── App definition ──────────────────────────────────────────────────────────

export const NetworkStatisticsApp: CyAppWithLifecycle = {
  id: 'networkStatistics',
  name: 'Network Statistics',
  description:
    'Logs network topology statistics (density, degree distribution, ' +
    'roots, leaves) to the browser console on every network switch. ' +
    'A non-React example using only mount/unmount lifecycle hooks.',
  version,
  apiVersion: '1.0',

  // No `resources` — this app has no UI components.

  mount(context: AppContext): void {
    const { apis } = context

    // 1. Log statistics for the current network immediately.
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

    // 3. Listen for selection changes and log a short summary.
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
      'Mounted — listening for network:switched and selection:changed events.',
    )
  },

  unmount(): void {
    if (_pendingRetryTimer !== null) {
      clearTimeout(_pendingRetryTimer)
      _pendingRetryTimer = null
    }
    if (_networkSwitchedHandler !== null) {
      window.removeEventListener('network:switched', _networkSwitchedHandler)
      _networkSwitchedHandler = null
    }
    if (_selectionChangedHandler !== null) {
      window.removeEventListener('selection:changed', _selectionChangedHandler)
      _selectionChangedHandler = null
    }
    console.info(LOG_PREFIX, 'Unmounted — all event listeners removed.')
  },
}
