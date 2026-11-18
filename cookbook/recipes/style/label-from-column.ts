/**
 * @recipe Label nodes or edges from a column
 * @aliases show labels, change label, label by column, display attribute,
 *   node label, edge label, show gene names, label mapping, passthrough
 *   mapping
 * @apis table.getColumns, visualStyle.createPassthroughMapping
 * @related style/color-by-category, style/set-style-defaults,
 *   data/join-table-by-key
 *
 * ## When to use
 *
 * The user asks for nodes (or edges) to show another column as their label:
 * a gene symbol instead of an id, a score, a type.
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - `column` is a column of the node (or edge) table that holds one value
 *   per element, not a list.
 *
 * ## Side effects
 *
 * - Replaces the label mapping (`nodeLabel` or `edgeLabel`) with a
 *   passthrough mapping: each element shows its own value. Mappings record
 *   no undo entry.
 * - Changes no table data.
 *
 * ## Pitfalls
 *
 * - **It replaces the existing label.** A network made from an edge list, or
 *   by most imports, already labels nodes from `name`. To go back, run the
 *   recipe with `name`.
 * - **Numbers are shown as they are stored**: `0.123456789`, not `0.12`. To
 *   format them, write the formatted text to a `string` column and label from
 *   that.
 * - **Missing values** show the mapping's fallback: the default label as it
 *   was when the mapping was made (empty unless set). A later default does
 *   not reach them.
 * - **List columns are refused.** A passthrough mapping hands the list to
 *   the renderer as it is.
 * - **The column's type must be passed exactly**: the host refuses a mapping
 *   whose `attributeType` differs from the column's (`MI2`). The recipe reads
 *   it from the table.
 *
 * ## Don't
 *
 * - Don't set a label bypass on every element: it does not follow the data.
 * - Don't copy the column's values into `name` to change the labels.
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
  AppTableType,
  CyWebApiType,
  IdType,
} from 'cyweb/ApiTypes'

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function labelFromColumn(
  apis: Pick<CyWebApiType, 'table' | 'visualStyle'>,
  networkId: IdType,
  column: string,
  tableType: AppTableType = 'node',
): ApiResult<{ column: string; type: string }> {
  const columns = apis.table.getColumns(networkId, tableType)
  if (!columns.success) return columns
  const info = columns.data.columns.find((c) => c.name === column)
  if (info === undefined) {
    return failure('RECIPE_NO_COLUMN', `no ${tableType} column ${column}`)
  }
  if (info.type.startsWith('list_of_')) {
    return failure('RECIPE_COLUMN_TYPE', `${column} is a ${info.type} column`)
  }

  const mapped = apis.visualStyle.createPassthroughMapping(
    networkId,
    tableType === 'node' ? 'nodeLabel' : 'edgeLabel',
    column,
    info.type,
  )
  if (!mapped.success) return mapped
  return { success: true, data: { column, type: info.type } }
}
