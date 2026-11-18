/**
 * @recipe Create a new network from the selected nodes
 * @aliases subnetwork, extract selection, new network from selection,
 *   network from selected nodes, induced subgraph, sub-network, copy
 *   selection to a new network
 * @apis selection.getSelection, element.getEdges,
 *   network.createNetworkFromNodeList, visualStyle.getVisualStyle,
 *   visualStyle.applyVisualStyle, network.deleteNetwork
 * @related network/create-network-from-table,
 *   selection/select-neighbors, selection/select-by-attribute
 *
 * ## When to use
 *
 * The user has selected part of a network and wants it as a network of its
 * own: Cytoscape's "New Network From Selection".
 *
 * ## Preconditions
 *
 * - At least one node of `networkId` is selected.
 * - The network's data is loaded; see `events/follow-current-network`.
 *
 * ## Side effects
 *
 * - Adds a network to the workspace and makes it current. Its nodes and edges
 *   keep their ids, columns, values and positions.
 * - `edges: 'induced'` (the default) takes every edge between two selected
 *   nodes. `edges: 'selected'` takes only the selected edges among them.
 * - With `copyStyle` (the default), the new network gets a copy of the source
 *   network's active style: one undo entry on the new network. Without it, it
 *   has the host's default style and a label mapping from `name`.
 * - If copying the style fails, the recipe deletes the network it created.
 * - The source network is not changed.
 *
 * ## Pitfalls
 *
 * - **Style is not copied by the host.** `createNetworkFromNodeList` gives
 *   the new network a default style on both 1.1.0 and 1.1.1. The recipe
 *   copies it with `getVisualStyle` and `applyVisualStyle`.
 * - **Bypasses are not copied.** `applyVisualStyle` drops them, although the
 *   ids would match. A node highlighted in the source is not highlighted in
 *   the subnetwork.
 * - **One call, not a loop.** `createNetworkFromNodeList` copies everything
 *   in one step, and fails without creating anything if an id is unknown.
 *   The other way, `export.exportToCx2` and `createNetworkFromCx2`, takes
 *   two calls and a whole CX2 document to make the same network.
 * - **`'selected'` edges must connect selected nodes**, or the host refuses
 *   the call (`APP9`). The recipe leaves out a selected edge with an
 *   unselected end.
 * - **The new network is current, and on 1.1.0 the table browser and layout
 *   tools still act on the one shown before** until the user picks the new
 *   one in the workspace. 1.1.1 fixes this (host #927).
 *
 * ## Don't
 *
 * - Don't rebuild the subnetwork with `createNetworkFromEdgeList`: it loses
 *   every column, the ids and the positions.
 * - Don't copy the style by setting the same defaults and mappings again.
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

export interface SubnetworkOptions {
  /** Defaults to "Subnetwork of <source name>". */
  name?: string
  /** Which edges to take. Defaults to every edge between selected nodes. */
  edges?: 'induced' | 'selected'
  /** Copy the source network's active style. Defaults to true. */
  copyStyle?: boolean
}

export interface Subnetwork {
  networkId: IdType
  nodeCount: number
  edgeCount: number
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function subnetworkFromSelection(
  apis: Pick<CyWebApiType, 'selection' | 'element' | 'network' | 'visualStyle'>,
  networkId: IdType,
  options: SubnetworkOptions = {},
): ApiResult<Subnetwork> {
  const selection = apis.selection.getSelection(networkId)
  if (!selection.success) return selection
  const { selectedNodes, selectedEdges } = selection.data
  if (selectedNodes.length === 0) {
    return failure('RECIPE_NOTHING_SELECTED', 'no node is selected')
  }

  let edgeIds: IdType[] | 'all' = 'all'
  if (options.edges === 'selected') {
    const chosen = new Set(selectedNodes)
    const edges = apis.element.getEdges(networkId, selectedEdges)
    if (!edges.success) return edges
    edgeIds = edges.data.edges
      .filter((e) => chosen.has(e.sourceId) && chosen.has(e.targetId))
      .map((e) => e.id)
  }

  // Read the style first, so that a failure here creates nothing.
  const copyStyle = options.copyStyle ?? true
  const style = copyStyle ? apis.visualStyle.getVisualStyle(networkId) : null
  if (style !== null && !style.success) return style

  const created = apis.network.createNetworkFromNodeList(
    networkId,
    selectedNodes,
    edgeIds,
    { name: options.name },
  )
  if (!created.success) return created
  const subnetwork = created.data.cyNetwork.network

  if (style !== null) {
    const copied = apis.visualStyle.applyVisualStyle(
      subnetwork.id,
      style.data.visualStyle,
      { name: 'Copied style' },
    )
    if (!copied.success) {
      apis.network.deleteNetwork(subnetwork.id)
      return copied
    }
  }

  return {
    success: true,
    data: {
      networkId: subnetwork.id,
      nodeCount: subnetwork.nodes.length,
      edgeCount: subnetwork.edges.length,
    },
  }
}
