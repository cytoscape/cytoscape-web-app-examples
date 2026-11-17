/**
 * @recipe Color nodes by category
 * @aliases color by type, color by group, color by class, categorical
 *   colors, discrete color mapping, one color per value, color by label,
 *   legend colors
 * @apis table.getTable, visualStyle.createDiscreteMapping
 * @related style/color-nodes-by-numeric-column, style/label-from-column,
 *   style/set-style-defaults
 *
 * ## When to use
 *
 * The user asks for each kind of node to have its own color: by a column of
 * names, types or group numbers, not by a quantity.
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - `column` is a node column of type `string`, `integer` or `long`.
 *
 * ## Side effects
 *
 * - Replaces any mapping on the node fill color (`nodeBackgroundColor`) with
 *   a discrete mapping: one palette color per distinct value, in sorted
 *   order. Mappings record no undo entry.
 * - Changes no table data and no bypass.
 *
 * ## Pitfalls
 *
 * - **More categories than colors.** The palette has eight colors, chosen to
 *   stay distinct for color-blind readers (Okabe and Ito). Values past the
 *   eighth keep the default color and are listed in `uncolored`. Pass a
 *   longer palette, or color only what matters.
 * - **Boolean columns never match.** The host keys a discrete mapping by the
 *   text of each key, and converts it back to a number for `integer`, `long`
 *   and `double` columns only. `true` stays the string `"true"` and matches
 *   no boolean value. The recipe refuses boolean columns.
 * - **Values are compared exactly.** `"Kinase"` and `"kinase"` are two
 *   categories. Normalize the column first if they are the same thing.
 * - **List columns** are matched by their first item only. The recipe
 *   refuses them.
 * - **Missing values**, and values past the palette, show the mapping's
 *   fallback: the default color as it was when the mapping was made. A later
 *   default does not reach them (`style/set-style-defaults`).
 * - **Order is sorted, not by frequency,** so the same values get the same
 *   colors every time the recipe runs.
 *
 * ## Don't
 *
 * - Don't use a continuous mapping for categories: group 3 is not "between"
 *   groups 2 and 4.
 * - Don't set a fill bypass on every node: it does not follow the data.
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

/** A color as the host stores it: `#rrggbb`. */
export type HexColor = `#${string}`

export interface CategoryColors {
  /** The color of each value, by the value's text. */
  colors: Record<string, HexColor>
  /** Values that got no color: they keep the default. */
  uncolored: string[]
}

/** Okabe and Ito's palette, distinct for the common forms of color blindness. */
export const CATEGORY_PALETTE: HexColor[] = [
  '#e69f00', '#56b4e9', '#009e73', '#f0e442',
  '#0072b2', '#d55e00', '#cc79a7', '#000000',
]

const ALLOWED_TYPES = ['string', 'integer', 'long']

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function colorByCategory(
  apis: Pick<CyWebApiType, 'table' | 'visualStyle'>,
  networkId: IdType,
  column: string,
  palette: HexColor[] = CATEGORY_PALETTE,
): ApiResult<CategoryColors> {
  const table = apis.table.getTable(networkId, 'node', { columns: [column] })
  if (!table.success) return table
  const info = table.data.columns.find((c) => c.name === column)
  if (info === undefined) {
    return failure('RECIPE_NO_COLUMN', `no node column named ${column}`)
  }
  if (!ALLOWED_TYPES.includes(info.type)) {
    return failure(
      'RECIPE_COLUMN_TYPE',
      `${column} is a ${info.type} column; use string, integer or long`,
    )
  }

  const distinct = new Set<string | number>()
  for (const row of table.data.rows) {
    const value = row[column]
    if (typeof value === 'string' ? value !== '' : typeof value === 'number') {
      distinct.add(value as string | number)
    }
  }
  if (distinct.size === 0) {
    return failure('RECIPE_NO_VALUES', `${column} has no value`)
  }
  const values = [...distinct].sort((a, b) =>
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b)),
  )

  const colors: Record<string, HexColor> = {}
  const uncolored: string[] = []
  values.forEach((value, index) => {
    if (index < palette.length) colors[String(value)] = palette[index]
    else uncolored.push(String(value))
  })

  const mapped = apis.visualStyle.createDiscreteMapping(
    networkId,
    'nodeBackgroundColor',
    column,
    info.type,
    colors,
  )
  if (!mapped.success) return mapped
  return { success: true, data: { colors, uncolored } }
}
