/**
 * @recipe Add nodes to a network, and connect them
 * @aliases add nodes, create nodes, insert nodes, new nodes, add a chain of
 *   nodes, connect nodes, add edges between new nodes
 * @apis viewport.getNodePositions, element.createNodes, element.createEdges
 * @related style/color-nodes-by-numeric-column, events/follow-current-network
 *
 * ## When to use
 *
 * The user asks to add one or more nodes to an existing network, with or
 * without edges between the new nodes: "add three nodes A, B and C and connect
 * them in a chain".
 *
 * ## Preconditions
 *
 * - The network's data is loaded. A network that has just become current may
 *   not be readable yet; see `events/follow-current-network`.
 * - Each `link` is a pair of indexes into `nodes`: `[0, 1]` connects the first
 *   new node to the second.
 *
 * ## Side effects
 *
 * - Adds the nodes, each with its `name` and any other `attributes`.
 * - Adds one edge per link.
 * - Records one undo entry for all the nodes and, when there are links, a
 *   second one for all the edges. The user then undoes twice to remove
 *   everything.
 * - Does not change the selection.
 *
 * ## Pitfalls
 *
 * - **Use the batch calls.** `createNodes` validates every node before it
 *   creates any, and records one undo entry. A loop over `createNode` records
 *   one entry per node and can stop halfway.
 * - **Every node needs a position.** Nodes created at the same position sit
 *   on top of each other. This recipe puts the new nodes in a row below the
 *   existing ones.
 * - **If the edges fail, the nodes stay.** The two batches are separate
 *   calls. The recipe returns the failure and leaves the nodes in place; one
 *   undo removes them. That cannot happen for a link that names a missing
 *   node, because the links are checked before anything is created.
 * - **`autoSelect` defaults to true** in the host. Left at the default, the
 *   new nodes replace the user's selection. This recipe passes `false`.
 * - An attribute must not be named `id`. The host assigns ids; read them from
 *   the result.
 *
 * ## Don't
 *
 * - Don't invent node ids, and don't guess them from `generateNextNodeId`:
 *   use the ids that `createNodes` returns.
 * - Don't call `createNode` in a loop.
 * - Don't create edges before the nodes exist.
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
  ValueType,
} from 'cyweb/ApiTypes'

export interface NewNode {
  /** Shown as the node's label in a network created by the host. */
  name: string
  /** Other columns to fill. Must not contain `id`. */
  attributes?: Record<string, ValueType>
}

export interface AddedElements {
  /** Ids of the created nodes, in the order of `nodes`. */
  nodeIds: IdType[]
  /** Ids of the created edges, in the order of `links`. */
  edgeIds: IdType[]
}

const SPACING = 120

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function addNodesToNetwork(
  apis: Pick<CyWebApiType, 'element' | 'viewport'>,
  networkId: IdType,
  nodes: NewNode[],
  links: Array<[number, number]> = [],
): ApiResult<AddedElements> {
  if (nodes.length === 0) {
    return failure('RECIPE_NO_NODES', 'nodes must not be empty')
  }
  const isIndex = (i: number): boolean =>
    Number.isInteger(i) && i >= 0 && i < nodes.length
  const badLink = links.find(([from, to]) => !isIndex(from) || !isIndex(to))
  if (badLink !== undefined) {
    return failure(
      'RECIPE_BAD_LINK',
      `link [${badLink.join(', ')}] does not name two of the new nodes`,
    )
  }

  // Place the new nodes in a row below everything that is already there.
  const existing = apis.viewport.getNodePositions(networkId)
  if (!existing.success) return existing
  const placed = Object.values(existing.data.positions)
  const left = placed.length === 0 ? 0 : Math.min(...placed.map((p) => p[0]))
  const bottom = placed.length === 0 ? 0 : Math.max(...placed.map((p) => p[1]))

  const created = apis.element.createNodes(
    networkId,
    nodes.map((node, index) => ({
      position: [left + index * SPACING, bottom + SPACING],
      attributes: { ...node.attributes, name: node.name },
    })),
    { autoSelect: false },
  )
  if (!created.success) return created
  const nodeIds = created.data.nodes.map((n) => n.nodeId)
  if (links.length === 0) {
    return { success: true, data: { nodeIds, edgeIds: [] } }
  }

  const connected = apis.element.createEdges(
    networkId,
    links.map(([from, to]) => ({
      sourceNodeId: nodeIds[from],
      targetNodeId: nodeIds[to],
    })),
    { autoSelect: false },
  )
  // The nodes stay if this fails; see Pitfalls.
  if (!connected.success) return connected

  return {
    success: true,
    data: { nodeIds, edgeIds: connected.data.edges.map((e) => e.edgeId) },
  }
}
