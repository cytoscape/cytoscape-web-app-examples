/**
 * @recipe Size nodes by their degree
 * @aliases size by degree, bigger nodes for hubs, node size by connections,
 *   scale nodes, hubs larger, node size mapping, size by number of edges
 * @apis element.getNodeIds, element.getEdges, table.getColumns,
 *   table.createColumn, table.setValues, visualStyle.createContinuousMapping,
 *   visualStyle.deleteMapping
 * @related data/add-computed-column, style/color-nodes-by-numeric-column,
 *   style/color-by-category
 *
 * ## When to use
 *
 * The user asks for well-connected nodes to look bigger: the size of each
 * node grows with its number of edges.
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - Not every node has the same degree.
 *
 * ## Side effects
 *
 * - Writes each node's degree to an `integer` column (default `degree`),
 *   creating it if there is none: **one** undo entry for the values, none for
 *   the column.
 * - Replaces any mapping on node width and node height with a continuous
 *   mapping from that column. Mappings record no undo entry.
 * - If the second mapping fails, the recipe deletes the first again; the
 *   column keeps its values.
 *
 * ## Pitfalls
 *
 * - **A mapping reads a column, not the topology.** So the degree is written
 *   to the table first. The sizes follow the column, and the column does not
 *   follow later edits: run the recipe again after adding or deleting edges.
 * - **Missing values.** A node without a value gets the mapping's fallback,
 *   the default size when the mapping was made. Every node gets a value here;
 *   a node added later has none until the recipe runs again.
 * - **Non-numeric values.** A degree is always a whole number. An existing
 *   column of that name in another type is refused.
 * - **An empty network** has no degree to map: `RECIPE_NO_NODES`.
 * - **All values equal**, a ring or a grid, leaves no range to scale:
 *   `RECIPE_SINGLE_VALUE`, before anything is written. Set one default size
 *   instead (`style/set-style-defaults`).
 * - **Map width and height both.** Mapping one makes ellipses.
 * - **Column names and case** are checked as in `data/add-computed-column`:
 *   a name that differs from an existing column only by case is refused on
 *   both releases.
 * - **Find the range with a loop.** `Math.min(...values)` throws a
 *   `RangeError` past about 120,000 values.
 *
 * ## Don't
 *
 * - Don't set a width bypass on every node: it does not follow the data, and
 *   it hides any later mapping.
 * - Don't pass `attributeType: 'double'` for an `integer` column: the host
 *   refuses it (`MI2`).
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
  CellEdit,
  CyWebApiType,
  IdType,
} from 'cyweb/ApiTypes'

export interface SizeOptions {
  /** The column the degree is written to. Defaults to `degree`. */
  column?: string
  /** Size of the least connected nodes. Defaults to 20. */
  smallest?: number
  /** Size of the most connected nodes. Defaults to 80. */
  largest?: number
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function sizeNodesByDegree(
  apis: Pick<CyWebApiType, 'element' | 'table' | 'visualStyle'>,
  networkId: IdType,
  options: SizeOptions = {},
): ApiResult<{ min: number; max: number }> {
  const column = options.column ?? 'degree'
  const smallest = options.smallest ?? 20
  const largest = options.largest ?? 80

  const nodes = apis.element.getNodeIds(networkId)
  if (!nodes.success) return nodes
  const edges = apis.element.getEdges(networkId)
  if (!edges.success) return edges
  if (nodes.data.nodeIds.length === 0) {
    return failure('RECIPE_NO_NODES', 'the network has no node')
  }

  const degree = new Map<IdType, number>()
  for (const id of nodes.data.nodeIds) degree.set(id, 0)
  for (const edge of edges.data.edges) {
    degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1)
    degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1)
  }
  let min = Infinity
  let max = -Infinity
  for (const value of degree.values()) {
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (min === max) {
    return failure(
      'RECIPE_SINGLE_VALUE',
      `every node has degree ${min}; there is nothing to scale`,
    )
  }

  const columns = apis.table.getColumns(networkId, 'node')
  if (!columns.success) return columns
  const same = columns.data.columns.find(
    (c) => c.name.toLowerCase() === column.toLowerCase(),
  )
  if (same !== undefined && same.name !== column) {
    return failure('RECIPE_NAME_CLASH', `a column named ${same.name} exists`)
  }
  if (same !== undefined && same.type !== 'integer' && same.type !== 'long') {
    return failure('RECIPE_COLUMN_TYPE', `${column} is a ${same.type} column`)
  }
  if (same === undefined) {
    const made = apis.table.createColumn(networkId, 'node', column, 'integer', 0)
    if (!made.success) return made
  }
  const edits: CellEdit[] = []
  for (const [id, value] of degree) edits.push({ id, column, value })
  const written = apis.table.setValues(networkId, 'node', edits)
  if (!written.success) return written

  const sizeBy = (vpName: 'nodeWidth' | 'nodeHeight'): ApiResult =>
    apis.visualStyle.createContinuousMapping(networkId, vpName, {
      vpType: 'number',
      attribute: column,
      attributeType: same?.type ?? 'integer',
      attributeValues: [min, max],
      controlPoints: [
        { value: min, vpValue: smallest },
        { value: max, vpValue: largest },
      ],
      ltMinVpValue: smallest,
      gtMaxVpValue: largest,
    })
  const width = sizeBy('nodeWidth')
  if (!width.success) return width
  const height = sizeBy('nodeHeight')
  if (!height.success) {
    apis.visualStyle.deleteMapping(networkId, 'nodeWidth')
    return height
  }
  return { success: true, data: { min, max } }
}
