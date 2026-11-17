/**
 * @recipe Color nodes by a numeric column
 * @aliases color by score, color by value, heat map, heatmap, gradient,
 *   color scale, continuous color mapping, color nodes from blue to red,
 *   expression coloring
 * @apis table.getTable, visualStyle.createContinuousMapping
 * @related elements/add-nodes-to-network, events/follow-current-network
 *
 * ## When to use
 *
 * The user asks to color nodes along a gradient by a number in the node
 * table: "color the nodes from blue to red by their `score` column".
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - `column` is a node column of type `double`, `long` or `integer`.
 * - At least two nodes have different, finite values in it.
 *
 * ## Side effects
 *
 * - Replaces any mapping on the node fill color (`nodeBackgroundColor`) of
 *   the network's active style with a continuous mapping.
 * - Marks the network as modified.
 * - Changes no table data and no bypass. A node with a color bypass keeps its
 *   bypass color: a bypass wins over a mapping.
 *
 * ## Pitfalls
 *
 * - **Missing values.** A node with no value in the column is not colored by
 *   the mapping. It keeps the style's default color. The recipe reports how
 *   many nodes that is in `unmappedCount`.
 * - **Non-numeric values.** A `string` column cannot drive a continuous
 *   mapping, even when its cells look like numbers. The recipe fails with
 *   `RECIPE_COLUMN_NOT_NUMERIC` before it changes anything. Values that are
 *   not finite (`NaN`, `Infinity`) are left out of the range.
 * - **An empty column.** With no finite value there is no range, and the
 *   recipe fails with `RECIPE_NO_VALUES`.
 * - **All values equal.** A range of zero width has no gradient, and the
 *   recipe fails with `RECIPE_SINGLE_VALUE`. Set one default color instead
 *   (`visualStyle.setDefault`).
 * - **`attributeType` must be the column's own type.** Read it from the
 *   table. Passing `'long'` for a `double` column fails with `MI2`.
 * - **Find the range with a loop.** `Math.min(...values)` passes one argument
 *   per node, and throws a `RangeError` past about 120,000 of them. The host
 *   does not stop a network of that size from loading.
 * - **Pass the two control points yourself.** Without them the host uses its
 *   own three-color scheme, and takes the first and last entries of
 *   `attributeValues` as the range, whatever their order.
 * - Visual property names are camelCase strings such as
 *   `'nodeBackgroundColor'`, checked by the `VisualPropertyName` type.
 *
 * ## Don't
 *
 * - Don't set a bypass on every node to color a network. Bypasses are for
 *   exceptions, and they hide every later mapping.
 * - Don't invent a visual property name such as `'NODE_FILL_COLOR'`.
 * - Don't hard-code the range. Read the values first.
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

export interface NodeColorScale {
  /** Color of the lowest value. Defaults to blue. */
  low?: HexColor
  /** Color of the highest value. Defaults to red. */
  high?: HexColor
}

export interface ColoredNodes {
  min: number
  max: number
  /** Nodes with a finite value: the mapping colors these. */
  mappedCount: number
  /** Nodes without one: these keep the default color. */
  unmappedCount: number
}

const NUMERIC_TYPES = ['double', 'long', 'integer']

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function colorNodesByNumericColumn(
  apis: Pick<CyWebApiType, 'table' | 'visualStyle'>,
  networkId: IdType,
  column: string,
  scale: NodeColorScale = {},
): ApiResult<ColoredNodes> {
  const table = apis.table.getTable(networkId, 'node', { columns: [column] })
  if (!table.success) return table

  const info = table.data.columns.find((c) => c.name === column)
  if (info === undefined) {
    return failure('RECIPE_NO_COLUMN', `no node column named "${column}"`)
  }
  if (!NUMERIC_TYPES.includes(info.type)) {
    return failure(
      'RECIPE_COLUMN_NOT_NUMERIC',
      `"${column}" is of type ${info.type}; a gradient needs a number`,
    )
  }

  // A loop, not Math.min(...values): see Pitfalls.
  let min = Infinity
  let max = -Infinity
  let mappedCount = 0
  for (const row of table.data.rows) {
    const value = row[column]
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    mappedCount += 1
    min = Math.min(min, value)
    max = Math.max(max, value)
  }
  if (mappedCount === 0) {
    return failure('RECIPE_NO_VALUES', `"${column}" has no numeric value`)
  }
  if (min === max) {
    return failure(
      'RECIPE_SINGLE_VALUE',
      `every value of "${column}" is ${min}; there is nothing to grade`,
    )
  }

  const low: HexColor = scale.low ?? '#2166ac'
  const high: HexColor = scale.high ?? '#b2182b'
  const mapped = apis.visualStyle.createContinuousMapping(
    networkId,
    'nodeBackgroundColor',
    {
      vpType: 'color',
      attribute: column,
      attributeType: info.type,
      attributeValues: [min, max],
      controlPoints: [
        { value: min, vpValue: low },
        { value: max, vpValue: high },
      ],
      ltMinVpValue: low,
      gtMaxVpValue: high,
    },
  )
  if (!mapped.success) return mapped

  return {
    success: true,
    data: {
      min,
      max,
      mappedCount,
      unmappedCount: table.data.rows.length - mappedCount,
    },
  }
}
