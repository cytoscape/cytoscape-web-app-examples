/**
 * @recipe Select nodes or edges by a column's value
 * @aliases select by attribute, select where, find nodes with, select
 *   matching nodes, filter selection, select by value, select by type,
 *   query nodes
 * @apis table.getTable, selection.exclusiveSelect, selection.additiveSelect
 * @related selection/select-neighbors, network/subnetwork-from-selection,
 *   style/highlight-with-bypass
 *
 * ## When to use
 *
 * The user asks to select the nodes (or edges) whose value in a column meets
 * a condition: "select all kinases", "select edges with weight over 0.8".
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - `test` is a function of one value that returns `true` to select.
 *
 * ## Side effects
 *
 * - `mode: 'replace'` (the default) makes the matches the whole selection.
 *   `'add'` adds them to it.
 * - Fires `selection:changed`. Records no undo entry.
 *
 * ## Pitfalls
 *
 * - **Values keep their column's type.** In a `long` column, `5` is a
 *   number: `(v) => v === '5'` matches nothing. Compare with the type the
 *   column has.
 * - **Text is compared exactly.** `"Kinase"` is not `"kinase"`; lower-case
 *   both sides in `test` if that is what the user means.
 * - **Missing values never match.** `test` sees only elements that have a
 *   value; `missing` counts the others.
 * - **A list column** passes the whole list to `test`.
 * - **`test` must not throw.** If it does, the recipe stops before selecting
 *   anything and returns `RECIPE_TEST_THREW`.
 * - **On 1.1.0, changing the selection from code shows hidden elements again
 *   on the canvas.** See `style/hide-by-threshold`. 1.1.1 fixes this.
 *
 * ## Don't
 *
 * - Don't read the values one `getValue` call at a time.
 * - Don't select by matching a node's label: labels come from a mapping, and
 *   may show another column than the one meant.
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
  ValueType,
} from 'cyweb/ApiTypes'

export interface SelectOptions {
  /** Defaults to `'node'`. */
  tableType?: AppTableType
  /** Replace the selection, or add to it. Defaults to `'replace'`. */
  mode?: 'replace' | 'add'
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function selectByAttribute(
  apis: Pick<CyWebApiType, 'table' | 'selection'>,
  networkId: IdType,
  column: string,
  test: (value: ValueType) => boolean,
  options: SelectOptions = {},
): ApiResult<{ selectedIds: IdType[]; missing: number }> {
  const tableType = options.tableType ?? 'node'
  const table = apis.table.getTable(networkId, tableType, { columns: [column] })
  if (!table.success) return table
  if (!table.data.columns.some((c) => c.name === column)) {
    return failure('RECIPE_NO_COLUMN', `no ${tableType} column ${column}`)
  }

  const matches: IdType[] = []
  let missing = 0
  for (const row of table.data.rows) {
    const value = row[column]
    if (value === undefined || value === null) {
      missing += 1
      continue
    }
    try {
      if (test(value)) matches.push(String(row.id))
    } catch (cause) {
      return failure(
        'RECIPE_TEST_THREW',
        `test threw on ${String(row.id)}: ${String(cause)}`,
      )
    }
  }

  const nodes = tableType === 'node' ? matches : []
  const edges = tableType === 'edge' ? matches : []
  const selected =
    options.mode === 'add'
      ? apis.selection.additiveSelect(networkId, nodes, edges)
      : apis.selection.exclusiveSelect(networkId, nodes, edges)
  if (!selected.success) return selected
  return { success: true, data: { selectedIds: matches, missing } }
}
