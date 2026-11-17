/**
 * @recipe Hide nodes below a threshold
 * @aliases filter nodes, hide nodes, hide low values, show only nodes above,
 *   remove from view, cutoff filter, hide edges of hidden nodes, show again
 * @apis table.getTable, element.getEdges, visualStyle.getBypasses,
 *   visualStyle.setBypass, visualStyle.deleteBypass
 * @related style/emphasize-by-threshold, selection/select-by-attribute,
 *   elements/delete-selected
 *
 * ## When to use
 *
 * The user asks to see only the nodes at or above a value, without deleting
 * the others: "hide everything with a score below 0.5".
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - `column` is a node column of type `double`, `long` or `integer`.
 *
 * ## Side effects
 *
 * - Sets a `nodeVisibility` bypass of `'none'` on every node below the
 *   threshold, and an `edgeVisibility` one on every edge that touches such a
 *   node, as the host's own Hide Selected does on 1.1.1.
 * - Leaves elements that were already hidden as they were, and returns
 *   `show()`, which shows again only what the recipe hid; a second call does
 *   nothing. An element with an
 *   `'element'` bypass (shown on purpose, by an import, the style editor or
 *   an app) is hidden too, and `show()` puts its `'element'` back.
 * - Records **no** undo entry. Bypasses are saved with the network until
 *   removed.
 *
 * ## Pitfalls
 *
 * - **Missing values.** A node with no value is kept by default; pass
 *   `hideMissing: true` to hide it too.
 * - **Non-numeric values.** A text column is refused.
 * - **An empty column** hides nothing, or everything with `hideMissing`.
 *   **All values equal** hides all or none.
 * - **Hiding is a bypass, so it does not follow the data.** A node whose
 *   value rises later stays hidden: call `show()` and run the recipe again.
 * - **The host can show the nodes again.** The FILTER tab, in its show mode,
 *   replaces every visibility bypass of the network on both releases, and
 *   on 1.1.1 Select ▸ Show All removes them all. Both undo the recipe's
 *   hiding.
 * - **On 1.1.0 a selection change can show hidden elements on the canvas**,
 *   while the style still says they are hidden. The host's renderer showed
 *   every element whenever the selection changed from outside the canvas,
 *   for example by the selection API. 1.1.1 fixes this (`0f8b7f42`). The
 *   case sees both behaviors.
 * - **A visibility bypass is not always "hidden".** Its value is `'none'` or
 *   `'element'`. Only `'none'` hides; skipping every element that has a
 *   bypass would leave the `'element'` ones on screen, with success
 *   reported.
 * - **Use one call per property.** `setBypass` takes every id at once. If
 *   the edges fail, the recipe restores the nodes, so nothing is left
 *   half-hidden.
 *
 * ## Don't
 *
 * - Don't delete the nodes to hide them: the user cannot get them back
 *   without undo.
 * - Don't hide nodes and leave their edges: a hidden node's edges would
 *   point at nothing.
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

export interface Hidden {
  nodeIds: IdType[]
  edgeIds: IdType[]
  /** Show again what this call hid, and nothing else. */
  show: () => ApiResult
}

const NUMERIC_TYPES = ['double', 'long', 'integer']

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function hideByThreshold(
  apis: Pick<CyWebApiType, 'table' | 'element' | 'visualStyle'>,
  networkId: IdType,
  column: string,
  threshold: number,
  options: { hideMissing?: boolean } = {},
): ApiResult<Hidden> {
  if (!Number.isFinite(threshold)) {
    return failure('RECIPE_BAD_THRESHOLD', 'threshold must be a number')
  }
  const table = apis.table.getTable(networkId, 'node', { columns: [column] })
  if (!table.success) return table
  const info = table.data.columns.find((c) => c.name === column)
  if (info === undefined) {
    return failure('RECIPE_NO_COLUMN', `no node column named ${column}`)
  }
  if (!NUMERIC_TYPES.includes(info.type)) {
    return failure(
      'RECIPE_COLUMN_NOT_NUMERIC',
      `${column} is a ${info.type} column`,
    )
  }

  const nodeBypasses = apis.visualStyle.getBypasses(networkId, 'nodeVisibility')
  if (!nodeBypasses.success) return nodeBypasses
  const edgeBypasses = apis.visualStyle.getBypasses(networkId, 'edgeVisibility')
  if (!edgeBypasses.success) return edgeBypasses
  const before = {
    nodeVisibility: nodeBypasses.data.bypasses,
    edgeVisibility: edgeBypasses.data.bypasses,
  }
  // Only 'none' is hidden. An 'element' bypass shows an element on purpose:
  // it is replaced while hidden, and put back by show().
  const notHidden =
    (vpName: 'nodeVisibility' | 'edgeVisibility') => (id: IdType) =>
      before[vpName][id] !== 'none'

  const below = new Set<IdType>()
  for (const row of table.data.rows) {
    const value = row[column]
    const fails =
      typeof value === 'number'
        ? value < threshold
        : options.hideMissing === true
    if (fails) below.add(String(row.id))
  }
  const nodeIds = [...below].filter(notHidden('nodeVisibility'))

  const edges = apis.element.getEdges(networkId)
  if (!edges.success) return edges
  const edgeIds = edges.data.edges
    .filter((e) => below.has(e.sourceId) || below.has(e.targetId))
    .map((e) => e.id)
    .filter(notHidden('edgeVisibility'))

  // What each property still has to put back. Emptied once restored, so a
  // second show() never touches a bypass set after the first.
  const pending = { nodeVisibility: nodeIds, edgeVisibility: edgeIds }
  /** Put back what the pending ids had: no bypass, or their own one. */
  const restore = (vpName: 'nodeVisibility' | 'edgeVisibility'): ApiResult => {
    const ids = pending[vpName]
    const unset = ids.filter((id) => !(id in before[vpName]))
    if (unset.length > 0) {
      const shown = apis.visualStyle.deleteBypass(networkId, vpName, unset)
      if (!shown.success) return shown
    }
    const visible = ids.filter((id) => id in before[vpName])
    if (visible.length > 0) {
      const shown = apis.visualStyle.setBypass(
        networkId,
        vpName,
        visible,
        'element',
      )
      if (!shown.success) return shown
    }
    pending[vpName] = []
    return { success: true, data: undefined }
  }
  const show = (): ApiResult => {
    const nodes = restore('nodeVisibility')
    if (!nodes.success) return nodes
    return restore('edgeVisibility')
  }

  if (nodeIds.length > 0) {
    const hid = apis.visualStyle.setBypass(
      networkId,
      'nodeVisibility',
      nodeIds,
      'none',
    )
    if (!hid.success) return hid
  }
  if (edgeIds.length > 0) {
    const hid = apis.visualStyle.setBypass(
      networkId,
      'edgeVisibility',
      edgeIds,
      'none',
    )
    if (!hid.success) {
      restore('nodeVisibility')
      return hid
    }
  }
  return { success: true, data: { nodeIds, edgeIds, show } }
}
