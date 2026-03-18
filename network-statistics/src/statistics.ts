/**
 * Pure computation functions for network statistics.
 *
 * These functions take pre-fetched data (node/edge counts, degree lists)
 * and return derived statistics. They do NOT call any Cytoscape Web API
 * directly — the caller is responsible for fetching the data.
 */

export interface NetworkStatistics {
  nodeCount: number
  edgeCount: number
  density: number
  avgDegree: number
  maxDegree: number
  minDegree: number
  rootCount: number
  leafCount: number
  isolatedNodeCount: number
}

/**
 * Compute graph density for a simple directed graph.
 * density = edgeCount / (nodeCount * (nodeCount - 1))
 * Returns 0 for graphs with fewer than 2 nodes.
 */
export function computeDensity(
  nodeCount: number,
  edgeCount: number,
): number {
  if (nodeCount < 2) return 0
  return edgeCount / (nodeCount * (nodeCount - 1))
}

/**
 * Compute basic degree statistics from an array of per-node degree values.
 */
export function computeDegreeStats(degrees: number[]): {
  avg: number
  max: number
  min: number
} {
  if (degrees.length === 0) return { avg: 0, max: 0, min: 0 }
  const sum = degrees.reduce((a, b) => a + b, 0)
  return {
    avg: sum / degrees.length,
    max: Math.max(...degrees),
    min: Math.min(...degrees),
  }
}

/**
 * Format a NetworkStatistics object into a human-readable table string
 * suitable for console output.
 */
export function formatStatistics(
  networkName: string,
  stats: NetworkStatistics,
): string {
  const label = 'Network Statistics'
  const rows: [string, string][] = [
    ['Nodes', String(stats.nodeCount)],
    ['Edges', String(stats.edgeCount)],
    ['Density', stats.density.toFixed(6)],
    ['Avg Degree', stats.avgDegree.toFixed(2)],
    ['Max Degree', String(stats.maxDegree)],
    ['Min Degree', String(stats.minDegree)],
    ['Root Nodes', String(stats.rootCount)],
    ['Leaf Nodes', String(stats.leafCount)],
    ['Isolated Nodes', String(stats.isolatedNodeCount)],
  ]

  const titleText = `${label}: ${networkName}`
  const colL = Math.max(...rows.map(([l]) => l.length))
  const minColR = Math.max(...rows.map(([, v]) => v.length))
  // Row: "| {label} | {value} |"  →  colL + colR + 5
  const inner = Math.max(colL + minColR + 5, titleText.length + 4)
  const colR = inner - colL - 5

  // Use ASCII box characters for consistent width in browser consoles.
  const hr = '-'.repeat(inner)
  const lines = [
    `+${hr}+`,
    `|  ${titleText.padEnd(inner - 2)}|`,
    `+${'-'.repeat(colL + 2)}+${'-'.repeat(colR + 2)}+`,
    ...rows.map(
      ([l, v]) =>
        `| ${l.padEnd(colL)} | ${v.padStart(colR)} |`,
    ),
    `+${'-'.repeat(colL + 2)}+${'-'.repeat(colR + 2)}+`,
  ]
  return lines.join('\n')
}
