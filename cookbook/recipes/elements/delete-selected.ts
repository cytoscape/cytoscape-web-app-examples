/**
 * @recipe Delete the selected nodes and edges
 * @aliases delete selection, remove selected, delete selected nodes, remove
 *   nodes, delete edges, clear selected elements
 * @apis selection.getSelection, element.deleteNodes, element.deleteEdges
 * @related elements/add-edges-between-selected,
 *   selection/select-by-attribute, network/subnetwork-from-selection
 *
 * ## When to use
 *
 * An app deletes what the user selected, from code: a menu action, a button
 * in a panel, or as one step of a larger edit.
 *
 * The user can also choose Edit ▸ Delete Selected Nodes (or Edges), and on
 * 1.1.1 press Delete or Backspace on the canvas. This recipe does the same
 * from code, on both releases.
 *
 * ## Preconditions
 *
 * - Something in `networkId` is selected.
 *
 * ## Side effects
 *
 * - Deletes the selected nodes, every edge that touches them, and the
 *   selected edges.
 * - Records **one undo entry for the nodes and one for the edges** that
 *   remain to delete after them: the user undoes twice to restore a mixed
 *   selection.
 * - What Edit ▸ Undo restores differs by release. On 1.1.1 the nodes come
 *   back where they were. On 1.1.0 they come back without their views:
 *   `viewport.getNodePositions` lists them as missing, and the canvas draws
 *   them at (0, 0). 1.1.0's `deleteNodes` also reports every deleted node at
 *   `[0, 0]`. Both are fixed in 1.1.1 (host #857); both were seen by pressing
 *   Edit ▸ Undo on a host of each release.
 *
 * ## Pitfalls
 *
 * - **Delete the nodes first.** Deleting a node deletes its edges, so the
 *   recipe then deletes only the selected edges that are still there.
 *   Deleting those edges first would work too, but leaves one more undo
 *   entry for edges the node deletion would have removed anyway.
 * - **Use the batch calls.** `deleteNodes` and `deleteEdges` each take every
 *   id at once and record one undo entry. A loop records one per element.
 * - **If the edges fail, the nodes stay deleted.** The recipe returns the
 *   failure; one undo restores the nodes.
 * - The two calls report ids that no longer exist in `missing` instead of
 *   failing, and fail only when none exists.
 *
 * ## Don't
 *
 * - Don't delete nodes one at a time.
 * - Don't delete the selection of a network other than the one you mean:
 *   pass the current network's id, from `workspace.getCurrentNetworkId`.
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

export interface Deleted {
  nodeIds: IdType[]
  /** Every edge deleted: the selected ones and those of deleted nodes. */
  edgeIds: IdType[]
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function deleteSelected(
  apis: Pick<CyWebApiType, 'selection' | 'element'>,
  networkId: IdType,
): ApiResult<Deleted> {
  const selection = apis.selection.getSelection(networkId)
  if (!selection.success) return selection
  const { selectedNodes, selectedEdges } = selection.data
  if (selectedNodes.length === 0 && selectedEdges.length === 0) {
    return failure('RECIPE_NOTHING_SELECTED', 'nothing is selected')
  }

  const deleted: Deleted = { nodeIds: [], edgeIds: [] }
  if (selectedNodes.length > 0) {
    const nodes = apis.element.deleteNodes(networkId, selectedNodes)
    if (!nodes.success) return nodes
    deleted.nodeIds = nodes.data.deletedNodes.map((n) => n.id)
    deleted.edgeIds = nodes.data.deletedEdges.map((e) => e.id)
  }

  const gone = new Set(deleted.edgeIds)
  const remaining = selectedEdges.filter((id) => !gone.has(id))
  if (remaining.length > 0) {
    const edges = apis.element.deleteEdges(networkId, remaining)
    if (!edges.success) return edges
    // concat, not push(...ids): a spread throws on a large selection.
    deleted.edgeIds = deleted.edgeIds.concat(
      edges.data.deletedEdges.map((e) => e.id),
    )
  }

  return { success: true, data: deleted }
}
