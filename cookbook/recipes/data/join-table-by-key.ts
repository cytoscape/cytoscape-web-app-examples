/**
 * @recipe Join a table of values to the network by a key column
 * @aliases import table, import data, join table, merge data, add
 *   attributes from a file, import TSV, load node attributes, map data onto
 *   nodes, attribute table
 * @apis table.getColumns, table.importTableFromTsv
 * @related data/add-computed-column, data/read-column-values-safely,
 *   network/create-network-from-table
 *
 * ## When to use
 *
 * The user has a tab-separated table, such as expression values per gene,
 * and asks to attach it to the network's nodes (or edges) by a shared key:
 * Cytoscape's "Import Table From File".
 *
 * ## Preconditions
 *
 * - The first line names the columns. The key column holds the same values as
 *   a column of the network's table, such as `name`, or the element ids
 *   (key `id`).
 * - Values contain no tabs and no line breaks: the host does not read
 *   quotes.
 *
 * ## Side effects
 *
 * - Creates every column of the file that the table lacks, and writes the
 *   values of every row whose key matches.
 * - Records **no** undo entry: Edit ▸ Undo does not remove imported data.
 * - A row whose key matches nothing is skipped and reported in
 *   `unmatchedKeys`. A key that matches several elements, two nodes with the
 *   same `name`, writes to all of them.
 *
 * ## Pitfalls
 *
 * - **Give each column a type in the header**, as Cytoscape Desktop does:
 *   `score:double`. Without one the host infers the type from the first few
 *   rows, and a later value that does not fit is skipped and reported in
 *   `skippedCells`.
 * - **Line endings.** A file saved on Windows ends its lines with `\r\n`,
 *   and the host splits on `\n` alone: every last value would end in `\r`.
 *   The recipe converts the line endings first.
 * - **Column names and case.** 1.1.0 matches a file column to a table column
 *   by its exact name, and would create `Score` next to an existing `score`;
 *   1.1.1 matches ignoring case and writes `Score` into `score`. The recipe
 *   refuses such a file on both, before changing anything.
 * - **An empty cell** leaves a number or boolean as it was, and writes an
 *   empty string into a text column.
 * - **Duplicate keys in the file** would leave the last row's values. The
 *   recipe refuses them.
 * - **A typed header must match an existing column's type.** 1.1.0 would
 *   write `score:long` values into a `double` column as they are; 1.1.1
 *   refuses them with `A1`. The recipe refuses such a file on both.
 *
 * ## Don't
 *
 * - Don't loop over the rows with `setValue`: the import resolves the keys,
 *   creates the columns and writes everything in one call.
 * - Don't parse the file yourself to map names to node ids: pass `keyColumn`.
 * - Don't write CSV: the host reads tabs only.
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

export interface Joined {
  /** Elements that received values. */
  matchedElements: number
  /** Key values in the file that match no element. */
  unmatchedKeys: string[]
  /** Columns the import created. */
  newColumns: string[]
  /** Values that could not be read as their column's type. */
  skippedCells: Array<{ key: string; column: string; value: string }>
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

const TYPES = [
  'string', 'long', 'integer', 'double', 'boolean', 'list_of_string',
  'list_of_long', 'list_of_integer', 'list_of_double', 'list_of_boolean',
]

/**
 * A header field is `name` or `name:type`. As in the host, only a known type
 * after the last colon is one: `time:sec` is a column named `time:sec`.
 */
const columnName = (field: string): string => {
  const colon = field.lastIndexOf(':')
  return colon > 0 && TYPES.includes(field.slice(colon + 1))
    ? field.slice(0, colon)
    : field
}

export function joinTableByKey(
  apis: Pick<CyWebApiType, 'table'>,
  networkId: IdType,
  tsvText: string,
  key: string,
  tableType: AppTableType = 'node',
): ApiResult<Joined> {
  const text = tsvText.replace(/\r\n?/g, '\n')
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  if (lines.length < 2) {
    return failure('RECIPE_NO_ROWS', 'the file has no row under its header')
  }
  const header = lines[0].split('\t').map(columnName)
  const keyIndex = header.indexOf(key)
  if (keyIndex === -1) {
    return failure('RECIPE_NO_KEY_IN_FILE', `the file has no ${key} column`)
  }

  const columns = apis.table.getColumns(networkId, tableType)
  if (!columns.success) return columns
  if (key !== 'id' && !columns.data.columns.some((c) => c.name === key)) {
    return failure(
      'RECIPE_NO_KEY_COLUMN',
      `the ${tableType} table has no ${key} column to match`,
    )
  }

  // Same letters, other case: 1.1.0 and 1.1.1 would do different things.
  const seen = new Map<string, string>()
  for (const name of [...columns.data.columns.map((c) => c.name), ...header]) {
    const other = seen.get(name.toLowerCase())
    if (other !== undefined && other !== name) {
      return failure(
        'RECIPE_NAME_CLASH',
        `${name} and ${other} differ only by case`,
      )
    }
    seen.set(name.toLowerCase(), name)
  }
  if (new Set(header).size !== header.length) {
    return failure('RECIPE_NAME_CLASH', 'the file names a column twice')
  }

  // A typed header field for an existing column must keep its type: 1.1.0
  // would write the values as the file's type, and 1.1.1 refuses them (A1).
  for (const field of lines[0].split('\t')) {
    const name = columnName(field)
    const declared = field.slice(name.length + 1)
    const existing = columns.data.columns.find((c) => c.name === name)
    if (declared !== '' && existing !== undefined && existing.type !== declared) {
      return failure(
        'RECIPE_COLUMN_TYPE',
        `the file declares ${name} as ${declared}, and the table holds it ` +
          `as ${existing.type}`,
      )
    }
  }

  const keys = new Set<string>()
  for (const line of lines.slice(1)) {
    const value = line.split('\t')[keyIndex] ?? ''
    if (keys.has(value)) {
      return failure('RECIPE_DUPLICATE_KEY', `the key ${value} appears twice`)
    }
    keys.add(value)
  }

  const imported = apis.table.importTableFromTsv(
    networkId,
    tableType,
    lines.join('\n'),
    { keyColumn: key },
  )
  if (!imported.success) return imported
  return {
    success: true,
    data: {
      matchedElements: imported.data.rowCount,
      unmatchedKeys: imported.data.skippedRows,
      newColumns: imported.data.newColumns,
      skippedCells: imported.data.skippedCells,
    },
  }
}
