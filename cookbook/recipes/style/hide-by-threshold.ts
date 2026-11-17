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
 *   `show()`, which shows again only what the recipe hid.
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
 * - **Use one call per property.** `setBypass` takes every id at once. If
 *   the edges fail, the recipe shows the nodes again, so nothing is left
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

  const hiddenNodes = apis.visualStyle.getBypasses(networkId, 'nodeVisibility')
  if (!hiddenNodes.success) return hiddenNodes
  const hiddenEdges = apis.visualStyle.getBypasses(networkId, 'edgeVisibility')
  if (!hiddenEdges.success) return hiddenEdges

  const below = new Set<IdType>()
  for (const row of table.data.rows) {
    const value = row[column]
    const fails =
      typeof value === 'number'
        ? value < threshold
        : options.hideMissing === true
    if (fails) below.add(String(row.id))
  }
  const nodeIds = [...below].filter((id) => !(id in hiddenNodes.data.bypasses))

  const edges = apis.element.getEdges(networkId)
  if (!edges.success) return edges
  const edgeIds = edges.data.edges
    .filter((e) => below.has(e.sourceId) || below.has(e.targetId))
    .map((e) => e.id)
    .filter((id) => !(id in hiddenEdges.data.bypasses))

  const show = (): ApiResult => {
    if (nodeIds.length > 0) {
      const shown = apis.visualStyle.deleteBypass(
        networkId,
        'nodeVisibility',
        nodeIds,
      )
      if (!shown.success) return shown
    }
    if (edgeIds.length > 0) {
      const shown = apis.visualStyle.deleteBypass(
        networkId,
        'edgeVisibility',
        edgeIds,
      )
      if (!shown.success) return shown
    }
    return { success: true, data: undefined }
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
      show()
      return hid
    }
  }
  return { success: true, data: { nodeIds, edgeIds, show } }
}
