/**
 * @recipe Read a column's numbers safely
 * @aliases read column values, get numeric values, read a column, column to
 *   numbers, parse numbers from a column, column statistics, min and max of
 *   a column, missing values
 * @apis table.getTable
 * @related data/add-computed-column, style/color-nodes-by-numeric-column,
 *   style/emphasize-by-threshold
 *
 * ## When to use
 *
 * An app needs the numbers in a node or edge column, for a chart, a
 * statistic, a threshold or a mapping, and must not be fooled by missing,
 * textual or odd values.
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 *
 * ## Side effects
 *
 * - None. The recipe only reads.
 *
 * ## Pitfalls
 *
 * - **Missing values.** A row with no value for the column, or an empty
 *   string, is reported in `missing`, not read as `0`.
 * - **A default is not missing.** A column created with a default value
 *   (`createColumn(…, 0)`) holds that value in every row it was not given
 *   another one. The table cannot tell the two apart.
 * - **Non-numeric values.** In a `double`, `long` or `integer` column every
 *   value is a number; `NaN` and the infinities are reported in `invalid`.
 *   In a `string` column the recipe parses each value strictly (`"1.5"` and
 *   `"2e3"` are numbers, `"1.5 kg"` and `"n/a"` are not) and reports what
 *   does not parse in `invalid`. `fromText` says that parsing happened.
 *   Boolean and list columns are refused.
 * - **An empty column** gives `range: null`. Check it before dividing by the
 *   width of the range.
 * - **All values equal** gives `min === max`. A gradient or a scale needs at
 *   least two different values.
 * - **Find the range with a loop.** `Math.min(...values)` passes one argument
 *   per row and throws a `RangeError` past about 120,000 of them.
 * - Ids come from the table's `id` field, which `getTable` adds by default.
 *
 * ## Don't
 *
 * - Don't use `Number(value)` on its own: `Number('')` is `0` and
 *   `Number(null)` is `0`.
 * - Don't use `parseFloat`: `parseFloat('1.5 kg')` is `1.5`.
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

export interface NumericColumn {
  /** The column's declared type. */
  type: string
  /** Every finite number, by element id. */
  values: Record<IdType, number>
  /** Elements with no value. */
  missing: IdType[]
  /** Elements whose value is not a finite number. */
  invalid: IdType[]
  /** Whether the values were parsed from a text column. */
  fromText: boolean
  /** Null when no element has a number. */
  range: { min: number; max: number } | null
}

const NUMERIC_TYPES = ['double', 'long', 'integer']
const NUMBER_TEXT = /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\s*$/

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function readNumericColumn(
  apis: Pick<CyWebApiType, 'table'>,
  networkId: IdType,
  tableType: AppTableType,
  column: string,
): ApiResult<NumericColumn> {
  const table = apis.table.getTable(networkId, tableType, {
    columns: [column],
  })
  if (!table.success) return table
  const info = table.data.columns.find((c) => c.name === column)
  if (info === undefined) {
    return failure('RECIPE_NO_COLUMN', `no ${tableType} column ${column}`)
  }
  const fromText = info.type === 'string'
  if (!fromText && !NUMERIC_TYPES.includes(info.type)) {
    return failure(
      'RECIPE_COLUMN_TYPE',
      `${column} is a ${info.type} column, which holds no numbers`,
    )
  }

  const result: NumericColumn = {
    type: info.type,
    // No prototype: an element id is data, and "__proto__" would not stick.
    values: Object.create(null) as Record<IdType, number>,
    missing: [],
    invalid: [],
    fromText,
    range: null,
  }
  let min = Infinity
  let max = -Infinity
  for (const row of table.data.rows) {
    const id = String(row.id)
    const raw = row[column]
    if (raw === undefined || raw === null || raw === '') {
      result.missing.push(id)
      continue
    }
    const value =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string' && NUMBER_TEXT.test(raw)
          ? Number(raw)
          : NaN
    if (!Number.isFinite(value)) {
      result.invalid.push(id)
      continue
    }
    result.values[id] = value
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (min !== Infinity) result.range = { min, max }
  return { success: true, data: result }
}
