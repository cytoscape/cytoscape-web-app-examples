"use strict";
(self["webpackChunk_cytoscape_web_network_statistics"] = self["webpackChunk_cytoscape_web_network_statistics"] || []).push([[605,792],{

/***/ 605
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": () => (/* reexport */ NetworkStatisticsApp)
});

;// ./package.json
const package_namespaceObject = {"rE":"1.0.0"};
;// ./src/statistics.ts
/**
 * Pure computation functions for network statistics.
 *
 * These functions take pre-fetched data (node/edge counts, degree lists)
 * and return derived statistics. They do NOT call any Cytoscape Web API
 * directly — the caller is responsible for fetching the data.
 */
/**
 * Compute graph density for a simple directed graph.
 * density = edgeCount / (nodeCount * (nodeCount - 1))
 * Returns 0 for graphs with fewer than 2 nodes.
 */
function computeDensity(nodeCount, edgeCount) {
    if (nodeCount < 2)
        return 0;
    return edgeCount / (nodeCount * (nodeCount - 1));
}
/**
 * Compute basic degree statistics from an array of per-node degree values.
 */
function computeDegreeStats(degrees) {
    if (degrees.length === 0)
        return { avg: 0, max: 0, min: 0 };
    const sum = degrees.reduce((a, b) => a + b, 0);
    return {
        avg: sum / degrees.length,
        max: Math.max(...degrees),
        min: Math.min(...degrees),
    };
}
/**
 * Format a NetworkStatistics object into a human-readable table string
 * suitable for console output.
 */
function formatStatistics(networkName, stats) {
    const label = 'Network Statistics';
    const rows = [
        ['Nodes', String(stats.nodeCount)],
        ['Edges', String(stats.edgeCount)],
        ['Density', stats.density.toFixed(6)],
        ['Avg Degree', stats.avgDegree.toFixed(2)],
        ['Max Degree', String(stats.maxDegree)],
        ['Min Degree', String(stats.minDegree)],
        ['Root Nodes', String(stats.rootCount)],
        ['Leaf Nodes', String(stats.leafCount)],
        ['Isolated Nodes', String(stats.isolatedNodeCount)],
    ];
    const titleText = `${label}: ${networkName}`;
    const colL = Math.max(...rows.map(([l]) => l.length));
    const minColR = Math.max(...rows.map(([, v]) => v.length));
    // Row: "| {label} | {value} |"  →  colL + colR + 5
    const inner = Math.max(colL + minColR + 5, titleText.length + 4);
    const colR = inner - colL - 5;
    // Use ASCII box characters for consistent width in browser consoles.
    const hr = '-'.repeat(inner);
    const lines = [
        `+${hr}+`,
        `|  ${titleText.padEnd(inner - 2)}|`,
        `+${'-'.repeat(colL + 2)}+${'-'.repeat(colR + 2)}+`,
        ...rows.map(([l, v]) => `| ${l.padEnd(colL)} | ${v.padStart(colR)} |`),
        `+${'-'.repeat(colL + 2)}+${'-'.repeat(colR + 2)}+`,
    ];
    return lines.join('\n');
}

;// ./src/NetworkStatisticsApp.ts


const { /* version */ "rE": version } = package_namespaceObject;
const LOG_PREFIX = '[NetworkStatistics]';
// Maximum number of retries when network data is not yet loaded.
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 500;
// ── Module-level state ──────────────────────────────────────────────────────
// Store the event handler reference so unmount() can remove the exact same
// function from the event listener.
let _networkSwitchedHandler = null;
let _selectionChangedHandler = null;
let _pendingRetryTimer = null;
// ── API interaction ─────────────────────────────────────────────────────────
/**
 * Collect network statistics by calling the Element API and computing
 * derived metrics via pure functions in statistics.ts.
 *
 * Returns null if the network data is not available (e.g. still loading
 * after a network switch).
 */
function collectStatistics(networkId, apis) {
    const nodeIdsResult = apis.element.getNodeIds(networkId);
    const edgeIdsResult = apis.element.getEdgeIds(networkId);
    if (!nodeIdsResult.success || !edgeIdsResult.success) {
        return null;
    }
    const { nodeIds } = nodeIdsResult.data;
    const { edgeIds } = edgeIdsResult.data;
    const nodeCount = nodeIds.length;
    const edgeCount = edgeIds.length;
    // Compute per-node degree by counting connected edges
    const degrees = [];
    let isolatedNodeCount = 0;
    for (const nodeId of nodeIds) {
        const edgesResult = apis.element.getConnectedEdges(networkId, nodeId);
        if (edgesResult.success) {
            const degree = edgesResult.data.edges.length;
            degrees.push(degree);
            if (degree === 0)
                isolatedNodeCount++;
        }
        else {
            degrees.push(0);
        }
    }
    // Roots (no incoming edges) and leaves (no outgoing edges)
    const rootsResult = apis.element.getRoots(networkId);
    const leavesResult = apis.element.getLeaves(networkId);
    const rootCount = rootsResult.success ? rootsResult.data.nodeIds.length : 0;
    const leafCount = leavesResult.success ? leavesResult.data.nodeIds.length : 0;
    const density = computeDensity(nodeCount, edgeCount);
    const degreeStats = computeDegreeStats(degrees);
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
    };
}
/**
 * Log statistics for a given network to the browser console.
 *
 * The `network:switched` event fires as soon as the current network ID
 * changes in WorkspaceStore. At that point the network data may not yet
 * be loaded into NetworkStore (e.g. when hydrating from IndexedDB).
 * To handle this, we retry with a short delay up to MAX_RETRIES times.
 */
function logStatisticsForNetwork(networkId, apis, attempt = 0) {
    // Cancel any pending retry for a previous network switch.
    if (_pendingRetryTimer !== null) {
        clearTimeout(_pendingRetryTimer);
        _pendingRetryTimer = null;
    }
    const stats = collectStatistics(networkId, apis);
    if (stats === null) {
        if (attempt < MAX_RETRIES) {
            _pendingRetryTimer = setTimeout(() => logStatisticsForNetwork(networkId, apis, attempt + 1), RETRY_DELAY_MS);
        }
        else {
            console.warn(LOG_PREFIX, `Network data for ${networkId} not available after ${MAX_RETRIES} retries.`);
        }
        return;
    }
    const summaryResult = apis.workspace.getNetworkSummary(networkId);
    const networkName = summaryResult.success
        ? summaryResult.data.name
        : networkId;
    console.info(LOG_PREFIX, '\n' + formatStatistics(networkName, stats));
}
// ── App definition ──────────────────────────────────────────────────────────
const NetworkStatisticsApp = {
    id: 'networkStatistics',
    name: 'Network Statistics',
    description: 'Logs network topology statistics (density, degree distribution, ' +
        'roots, leaves) to the browser console on every network switch. ' +
        'A non-React example using only mount/unmount lifecycle hooks.',
    version,
    apiVersion: '1.0',
    // No `resources` — this app has no UI components.
    mount(context) {
        const { apis } = context;
        // 1. Log statistics for the current network immediately.
        const currentResult = apis.workspace.getCurrentNetworkId();
        if (currentResult.success && currentResult.data.networkId) {
            logStatisticsForNetwork(currentResult.data.networkId, apis);
        }
        // 2. Listen for network switches and log statistics each time.
        _networkSwitchedHandler = (e) => {
            const { networkId } = e.detail;
            logStatisticsForNetwork(networkId, apis);
        };
        window.addEventListener('network:switched', _networkSwitchedHandler);
        // 3. Listen for selection changes and log a short summary.
        _selectionChangedHandler = (e) => {
            const detail = e.detail;
            const nodeCount = detail.selectedNodes.length;
            const edgeCount = detail.selectedEdges.length;
            if (nodeCount > 0 || edgeCount > 0) {
                console.info(LOG_PREFIX, `Selection: ${nodeCount} node(s), ${edgeCount} edge(s)`);
            }
        };
        window.addEventListener('selection:changed', _selectionChangedHandler);
        console.info(LOG_PREFIX, 'Mounted — listening for network:switched and selection:changed events.');
    },
    unmount() {
        if (_pendingRetryTimer !== null) {
            clearTimeout(_pendingRetryTimer);
            _pendingRetryTimer = null;
        }
        if (_networkSwitchedHandler !== null) {
            window.removeEventListener('network:switched', _networkSwitchedHandler);
            _networkSwitchedHandler = null;
        }
        if (_selectionChangedHandler !== null) {
            window.removeEventListener('selection:changed', _selectionChangedHandler);
            _selectionChangedHandler = null;
        }
        console.info(LOG_PREFIX, 'Unmounted — all event listeners removed.');
    },
};

;// ./src/index.ts



/***/ }

}]);