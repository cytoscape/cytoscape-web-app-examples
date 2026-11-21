/**
 * @recipe Create a network from a table of edges
 * @aliases import network from table, network from rows, edge list with
 *   attributes, build a network from data, network from a spreadsheet,
 *   source target table, interaction table
 * @apis network.createNetworkFromEdgeList, table.createColumn,
 *   table.editRows, network.deleteNetwork
 * @related network/subnetwork-from-selection, data/join-table-by-key,
 *   layout/run-layout-and-wait
 *
 * ## When to use
 *
 * The user has rows that each describe one edge, a source and a target plus
 * other values such as an interaction type or a weight, and asks for a
 * network from them: Cytoscape's "Import Network From Table".
 *
 * ## Preconditions
 *
 * - Every row has a non-empty `source` and `target` value (the names of the
 *   two columns are arguments). Nodes are identified by these values.
 * - Every other column holds one type throughout: text, numbers or booleans.
 *   A row may leave a column out.
 *
 * ## Side effects
 *
 * - Adds a network to the workspace and makes it current (`network:created`,
 *   then `network:switched`). Its nodes get a `name` column holding the
 *   source and target values, shown as their labels.
 * - Creates one edge column per other column, and writes every edge's row in
 *   one batch: **one** undo entry on the new network. Creating a column
 *   records none.
 * - If writing a column fails, the recipe deletes the network it created:
 *   nothing is left behind.
 *
 * ## Pitfalls
 *
 * - **The host keeps nothing but the endpoints.** `createNetworkFromEdgeList`
 *   takes `[source, target, interaction?]`, and the edge table it creates is
 *   empty on both 1.1.0 and 1.1.1: the third element is dropped. The recipe
 *   writes every other column, `interaction` included, itself.
 * - **Edges are matched to rows by order.** The host creates the edges in the
 *   order of the edge list, and returns them in that order; the recipe pairs
 *   row `i` with edge `i`. Its case checks this on both releases.
 * - **The edges have no table rows, so `setValues` writes nothing.** On both
 *   1.1.0 and 1.1.1, `setValue` and `setValues` change only rows that
 *   exist, and report success either way; an edge-list network has a row
 *   for every node and none for its edges. `editRows` creates the rows. It
 *   also replaces a row whole, dropping values it is not given: use it only
 *   for rows written completely, as these new ones are.
 * - **One batch.** `editRows` validates every value first and writes all or
 *   nothing, with one undo entry.
 * - **A row that leaves a column out has no value in it**, not the column's
 *   default.
 * - **Column names.** `id`, `s`, `t`, `source` and `target` are refused, and
 *   so are two names that differ only by case: 1.1.0 would create two
 *   columns, and 1.1.1 refuses the second with `AC6`.
 * - **The new network is current, and on 1.1.0 the table browser and layout
 *   tools still act on the one shown before** until the user picks the new
 *   one in the workspace. 1.1.1 fixes this (host #927). Calls that take a
 *   `networkId` are not affected on either.
 * - The nodes have no layout yet. Run one: `layout/run-layout-and-wait`.
 *
 * ## Don't
 *
 * - Don't pass edge attributes as the third element of the edge list and
 *   expect to find them in the edge table.
 * - Don't create one network per row, or add edges one by one to an empty
 *   network.
 * - Don't guess edge ids (`e0`, `e1`, …): use the ones the host returns.
 * - Don't write edge values with `setValues` after `createNetworkFromEdgeList`:
 *   it reports success and writes nothing.
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
  ValueTypeName,
} from 'cyweb/ApiTypes'

export type Cell = string | number | boolean

export interface EdgeTableColumns {
  /** The column that names each edge's source node. */
  source: string
  /** The column that names each edge's target node. */
  target: string
}

export interface CreatedNetwork {
  networkId: IdType
  /** The edges' ids, in the order of the rows. */
  edgeIds: IdType[]
  /** The edge columns created, with their types. */
  columns: Record<string, ValueTypeName>
}

const RESERVED = ['id', 's', 't', 'source', 'target']

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

const defaultFor = (type: ValueTypeName): Cell =>
  type === 'string' ? '' : type === 'boolean' ? false : 0

export function createNetworkFromTable(
  apis: Pick<CyWebApiType, 'network' | 'table'>,
  name: string,
  rows: Array<Record<string, Cell | undefined>>,
  columns: EdgeTableColumns,
): ApiResult<CreatedNetwork> {
  if (rows.length === 0) return failure('RECIPE_NO_ROWS', 'rows is empty')

  // Check everything before creating anything.
  const edgeList: Array<[string, string]> = []
  const types = new Map<string, ValueTypeName>()
  // A row's own cells only: row.toString is not a "toString" column.
  const cell = (row: Record<string, Cell | undefined>, column: string) =>
    Object.hasOwn(row, column) ? row[column] : undefined
  for (const [index, row] of rows.entries()) {
    const source = cell(row, columns.source)
    const target = cell(row, columns.target)
    if (source === undefined || source === '' || target === undefined ||
        target === '') {
      return failure(
        'RECIPE_MISSING_ENDPOINT',
        `row ${index} has no ${columns.source} or no ${columns.target}`,
      )
    }
    edgeList.push([String(source), String(target)])

    for (const [column, value] of Object.entries(row)) {
      if (column === columns.source || column === columns.target) continue
      if (value === undefined) continue
      const type: ValueTypeName =
        typeof value === 'boolean'
          ? 'boolean'
          : typeof value === 'number'
            ? Number.isInteger(value) ? 'long' : 'double'
            : 'string'
      const known = types.get(column)
      if (known === undefined || (known === 'long' && type === 'double')) {
        types.set(column, type)
      } else if (known !== type && !(known === 'double' && type === 'long')) {
        return failure(
          'RECIPE_MIXED_TYPES',
          `column ${column} holds both ${known} and ${type} values`,
        )
      }
    }
  }
  const lowered = new Set<string>()
  for (const column of types.keys()) {
    const key = column.toLowerCase()
    if (RESERVED.includes(key) || lowered.has(key)) {
      return failure(
        'RECIPE_COLUMN_NAME',
        `${column} is reserved, or differs from another column only by case`,
      )
    }
    lowered.add(key)
  }

  const created = apis.network.createNetworkFromEdgeList({ name, edgeList })
  if (!created.success) return created
  const { networkId } = created.data
  const edgeIds = created.data.cyNetwork.network.edges.map((e) => e.id)

  // From here on, a failure removes the network again.
  const undo = (result: ApiFailure): ApiFailure => {
    apis.network.deleteNetwork(networkId)
    return result
  }
  if (edgeIds.length !== rows.length) {
    return undo(
      failure(
        'RECIPE_EDGE_COUNT',
        `${rows.length} rows made ${edgeIds.length} edges`,
      ),
    )
  }

  for (const [column, type] of types) {
    const made = apis.table.createColumn(
      networkId,
      'edge',
      column,
      type,
      defaultFor(type),
    )
    if (!made.success) return undo(made)
  }
  // One row per edge, holding the row's own values: see Pitfalls.
  const edgeRows: Record<IdType, Record<string, Cell>> = {}
  rows.forEach((row, index) => {
    // fromEntries, not values[column] = …: a column named "__proto__" would
    // set the object's prototype instead of adding a value.
    edgeRows[edgeIds[index]] = Object.fromEntries(
      [...types.keys()]
        .filter((column) => cell(row, column) !== undefined)
        .map((column) => [column, cell(row, column) as Cell]),
    )
  })
  const written = apis.table.editRows(networkId, 'edge', edgeRows)
  if (!written.success) return undo(written)

  return {
    success: true,
    data: { networkId, edgeIds, columns: Object.fromEntries(types) },
  }
}
