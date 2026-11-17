/**
 * @recipe Select the neighbors of the selected nodes
 * @aliases first neighbors, select neighbors, expand selection, select
 *   adjacent nodes, second neighbors, neighborhood, n hops, k-hop
 *   neighborhood, grow selection
 * @apis selection.getSelection, element.getEdges, selection.additiveSelect
 * @related selection/select-by-attribute, network/subnetwork-from-selection,
 *   elements/add-edges-between-selected
 *
 * ## When to use
 *
 * The user asks to select what is connected to the current selection:
 * Cytoscape's "First Neighbors of Selected Nodes", or neighbors up to a
 * number of hops away.
 *
 * ## Preconditions
 *
 * - At least one node of `networkId` is selected.
 * - The network's data is loaded; see `events/follow-current-network`.
 *
 * ## Side effects
 *
 * - Adds every node within `hops` edges of a selected node to the selection.
 *   The nodes and edges selected before stay selected.
 * - Fires `selection:changed`. Records no undo entry.
 *
 * ## Pitfalls
 *
 * - **Hops count from the starting selection.** `hops: 2` selects the first
 *   neighbors and their neighbors. Each round starts only from the nodes the
 *   last round added.
 * - **Direction.** `'any'` (the default) follows edges both ways.
 *   `'outgoing'` follows an edge from its source to its target only, and
 *   `'incoming'` the other way.
 * - **Read the edges once.** One `getEdges` call returns every edge with its
 *   ends. One `getConnectedNodes` call per node per hop does the same work a
 *   node at a time.
 * - **On 1.1.0, changing the selection from code shows hidden elements again
 *   on the canvas.** See `style/hide-by-threshold`. 1.1.1 fixes this.
 *
 * ## Don't
 *
 * - Don't replace the selection with the neighbors alone, unless the user
 *   asks for that: `exclusiveSelect` drops the nodes they started from.
 * - Don't select the edges between the neighbors unless asked: the host's
 *   own command selects nodes only.
 *
 * ## Wiring
 *
 * Host-wide: `apis` may come from any call site. See `wiring/from-mount.ts`,
 * `wiring/from-apps-menu.ts`, `wiring/from-panel.tsx` and
 * `wiring/from-window.ts`.
 */
import type {
  ApiFailure,
  ApiResult,
  CyWebApiType,
  IdType,
} from 'cyweb/ApiTypes'

export interface NeighborOptions {
  /** How many edges away. Defaults to 1. */
  hops?: number
  /** Which way to follow edges. Defaults to `'any'`. */
  direction?: 'any' | 'outgoing' | 'incoming'
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function selectNeighbors(
  apis: Pick<CyWebApiType, 'selection' | 'element'>,
  networkId: IdType,
  options: NeighborOptions = {},
): ApiResult<{ addedNodeIds: IdType[] }> {
  const hops = options.hops ?? 1
  const direction = options.direction ?? 'any'
  if (!Number.isInteger(hops) || hops < 1) {
    return failure('RECIPE_BAD_HOPS', 'hops must be a whole number, 1 or more')
  }

  const selection = apis.selection.getSelection(networkId)
  if (!selection.success) return selection
  const start = selection.data.selectedNodes
  if (start.length === 0) {
    return failure('RECIPE_NOTHING_SELECTED', 'no node is selected')
  }

  const edges = apis.element.getEdges(networkId)
  if (!edges.success) return edges
  const next = new Map<IdType, IdType[]>()
  const link = (from: IdType, to: IdType): void => {
    const list = next.get(from)
    if (list === undefined) next.set(from, [to])
    else list.push(to)
  }
  for (const edge of edges.data.edges) {
    if (direction !== 'incoming') link(edge.sourceId, edge.targetId)
    if (direction !== 'outgoing') link(edge.targetId, edge.sourceId)
  }

  const reached = new Set<IdType>(start)
  const added: IdType[] = []
  let frontier = start
  for (let hop = 0; hop < hops && frontier.length > 0; hop += 1) {
    const found: IdType[] = []
    for (const node of frontier) {
      for (const neighbor of next.get(node) ?? []) {
        if (!reached.has(neighbor)) {
          reached.add(neighbor)
          found.push(neighbor)
        }
      }
    }
    for (const id of found) added.push(id)
    frontier = found
  }

  if (added.length > 0) {
    const selected = apis.selection.additiveSelect(networkId, added, [])
    if (!selected.success) return selected
  }
  return { success: true, data: { addedNodeIds: added } }
}
