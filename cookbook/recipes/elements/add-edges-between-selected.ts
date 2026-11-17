/**
 * @recipe Connect the selected nodes to each other
 * @aliases add edges between selected nodes, connect selected nodes, link
 *   selected nodes, make a clique, connect all pairs, fully connect
 *   selection
 * @apis selection.getSelection, element.getEdges, element.createEdges
 * @related elements/add-nodes-to-network, elements/delete-selected,
 *   selection/select-neighbors
 *
 * ## When to use
 *
 * The user has selected some nodes and asks to connect them: every pair of
 * selected nodes gets an edge, unless it already has one.
 *
 * ## Preconditions
 *
 * - At least two nodes of `networkId` are selected.
 * - The network's data is loaded; see `events/follow-current-network`.
 *
 * ## Side effects
 *
 * - Adds one edge for each pair of selected nodes that no edge connects yet,
 *   in either direction. The source is the node selected first, in the order
 *   the host reports the selection.
 * - Records **one** undo entry for all the new edges.
 * - Does not change the selection, and adds no edge when every pair is
 *   already connected.
 *
 * ## Pitfalls
 *
 * - **The number of pairs grows with the square of the selection.** 50 nodes
 *   make up to 1,225 edges. The recipe refuses more than `maxEdges` (100 by
 *   default) before creating anything, and stops counting as soon as the
 *   limit is passed: listing every pair of a large selection first would
 *   freeze the page.
 * - **Use the batch call.** `createEdges` validates every edge first, creates
 *   all or none, and records one undo entry. A loop over `createEdge` records
 *   one per edge and can stop halfway. A failure here therefore leaves
 *   nothing behind.
 * - **Existing edges are read once**, with `getEdges`, not with one
 *   `getConnectedEdges` call per node.
 * - **`autoSelect` defaults to true** in the host. Left at the default, the
 *   new edges would replace the selection. The recipe passes `false`.
 *
 * ## Don't
 *
 * - Don't connect the selected nodes in a chain when the user asked for them
 *   to be connected to each other, or the reverse.
 * - Don't add an edge where one already exists, unless the user asks for
 *   parallel edges.
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

export interface ConnectOptions {
  /** Refuse to create more edges than this. Defaults to 100. */
  maxEdges?: number
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

const pairKey = (a: IdType, b: IdType): string =>
  a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`

export function addEdgesBetweenSelected(
  apis: Pick<CyWebApiType, 'selection' | 'element'>,
  networkId: IdType,
  options: ConnectOptions = {},
): ApiResult<{ edgeIds: IdType[] }> {
  const selection = apis.selection.getSelection(networkId)
  if (!selection.success) return selection
  const nodes = selection.data.selectedNodes
  if (nodes.length < 2) {
    return failure('RECIPE_TOO_FEW_NODES', 'select at least two nodes')
  }

  const existing = apis.element.getEdges(networkId)
  if (!existing.success) return existing
  const connected = new Set(
    existing.data.edges.map((e) => pairKey(e.sourceId, e.targetId)),
  )

  // Stop as soon as the limit is passed: 10,000 selected nodes would make
  // 50 million pairs before a check at the end could refuse them.
  const maxEdges = options.maxEdges ?? 100
  const pairs: Array<[IdType, IdType]> = []
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      if (connected.has(pairKey(nodes[i], nodes[j]))) continue
      pairs.push([nodes[i], nodes[j]])
      if (pairs.length > maxEdges) {
        return failure(
          'RECIPE_TOO_MANY_EDGES',
          `more than ${maxEdges} edges would be created`,
        )
      }
    }
  }
  if (pairs.length === 0) return { success: true, data: { edgeIds: [] } }

  const created = apis.element.createEdges(
    networkId,
    pairs.map(([sourceNodeId, targetNodeId]) => ({
      sourceNodeId,
      targetNodeId,
    })),
    { autoSelect: false },
  )
  if (!created.success) return created
  return {
    success: true,
    data: { edgeIds: created.data.edges.map((e) => e.edgeId) },
  }
}
