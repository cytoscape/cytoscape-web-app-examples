/**
 * @recipe Add a computed column: node degree
 * @aliases add a column, computed column, calculate degree, node degree,
 *   number of connections, count neighbors, derived attribute, write
 *   results to the table
 * @apis element.getNodeIds, element.getEdges, table.getColumns,
 *   table.createColumn, table.setValues, table.deleteColumn
 * @related data/read-column-values-safely, style/size-nodes-by-degree,
 *   data/join-table-by-key
 *
 * ## When to use
 *
 * The user asks for a value computed from the network to be added to the
 * node table, here each node's degree, so that it can be sorted, filtered or
 * mapped to a style. Replace the computation to write anything else.
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - No node column has the chosen name in another type, or in another
 *   spelling of the same letters.
 *
 * ## Side effects
 *
 * - Creates an `integer` column named `column` (default `degree`) when there
 *   is none, and writes every node's value in one batch.
 * - Writing the values records **one** undo entry. Creating the column
 *   records none: after an undo the column stays, holding its previous
 *   values (`0` for a new one).
 * - If writing fails, the recipe deletes the column it created. Deleting a
 *   column records an undo entry of its own.
 *
 * ## Pitfalls
 *
 * - **Read the topology once.** `getEdges` returns every edge with its ends.
 *   One `getConnectedEdges` call per node does the same work node by node.
 * - **A self-loop counts twice**, as in Cytoscape Desktop.
 * - **Use the batch call.** One `setValues` validates every value first and
 *   writes all or nothing. A loop of `setValue` records one undo entry per
 *   node and can stop halfway.
 * - **Column names and case.** 1.1.0 compares column names exactly and would
 *   create `degree` next to an existing `Degree`; 1.1.1 compares them
 *   ignoring case and refuses it with `AC6`. The recipe checks itself and
 *   refuses such a name on both, before changing anything.
 * - **Running it again updates the column** when it is `integer` or `long`.
 *   A column of that name in another type is refused.
 * - **The column is a snapshot.** It does not follow later edits to the
 *   network: run the recipe again after adding or deleting edges.
 *
 * ## Don't
 *
 * - Don't create the column with a type the values do not have: a degree is
 *   a whole number, and `setValues` refuses `2.5` in an `integer` column.
 * - Don't name the column `id`: the host refuses it.
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

export interface ComputedColumn {
  column: string
  /** Whether the recipe created the column, or updated an existing one. */
  created: boolean
  min: number
  max: number
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function addDegreeColumn(
  apis: Pick<CyWebApiType, 'element' | 'table'>,
  networkId: IdType,
  column = 'degree',
): ApiResult<ComputedColumn> {
  const nodes = apis.element.getNodeIds(networkId)
  if (!nodes.success) return nodes
  const edges = apis.element.getEdges(networkId)
  if (!edges.success) return edges

  // Compute first: nothing is written until the values exist.
  const degree = new Map<IdType, number>()
  for (const id of nodes.data.nodeIds) degree.set(id, 0)
  for (const edge of edges.data.edges) {
    degree.set(edge.sourceId, (degree.get(edge.sourceId) ?? 0) + 1)
    degree.set(edge.targetId, (degree.get(edge.targetId) ?? 0) + 1)
  }

  const columns = apis.table.getColumns(networkId, 'node')
  if (!columns.success) return columns
  const same = columns.data.columns.find(
    (c) => c.name.toLowerCase() === column.toLowerCase(),
  )
  if (same !== undefined && same.name !== column) {
    return failure(
      'RECIPE_NAME_CLASH',
      `a column named ${same.name} exists; choose a name that differs by ` +
        `more than case`,
    )
  }
  if (same !== undefined && same.type !== 'integer' && same.type !== 'long') {
    return failure(
      'RECIPE_COLUMN_TYPE',
      `${column} exists as a ${same.type} column`,
    )
  }

  const created = same === undefined
  if (created) {
    const made = apis.table.createColumn(networkId, 'node', column, 'integer', 0)
    if (!made.success) return made
  }

  const edits: CellEdit[] = []
  let min = Infinity
  let max = -Infinity
  for (const [id, value] of degree) {
    edits.push({ id, column, value })
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  const written = apis.table.setValues(networkId, 'node', edits)
  if (!written.success) {
    if (created) apis.table.deleteColumn(networkId, 'node', column)
    return written
  }

  return {
    success: true,
    data: { column, created, min: edits.length ? min : 0, max: edits.length ? max : 0 },
  }
}
