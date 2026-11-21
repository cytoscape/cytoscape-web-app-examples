/**
 * @recipe Emphasize nodes past a threshold
 * @aliases highlight nodes above a value, mark significant nodes, threshold
 *   border, emphasize high scores, nodes over cutoff, outline nodes above a
 *   threshold, step mapping
 * @apis table.getTable, visualStyle.getDefault,
 *   visualStyle.createContinuousMapping, visualStyle.deleteMapping
 * @related style/hide-by-threshold, style/highlight-with-bypass,
 *   style/color-nodes-by-numeric-column
 *
 * ## When to use
 *
 * The user asks for nodes at or above a value to stand out, "outline the
 * genes with fold change of at least 2", while the rest stay as they are.
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - `column` is a node column of type `double`, `long` or `integer`.
 *
 * ## Side effects
 *
 * - Replaces any mapping on the node border color and border width with a
 *   step: below the threshold, the current default; at or above it, the
 *   emphasis. Mappings record no undo entry.
 * - If the second mapping fails, the recipe deletes the first again.
 * - Changes no table data and no bypass.
 *
 * ## Pitfalls
 *
 * - **A mapping, not a bypass.** The emphasis follows the data: when a value
 *   changes, so does its node. A bypass would mark the nodes that passed
 *   once, and stay.
 * - **One control point makes a step.** The host's continuous mapping uses
 *   `ltMinVpValue` below the point, the point's own value at it, and
 *   `gtMaxVpValue` above it. A value exactly at the threshold is emphasized.
 * - **Missing values** get the mapping's fallback, the default border when
 *   the mapping was made: a node with no value is not emphasized.
 * - **Non-numeric values.** A text column is refused, even when it holds
 *   digits. Convert it first (`data/read-column-values-safely`).
 * - **An empty column** emphasizes nothing; **all values equal** emphasizes
 *   all or none. Both are reported by `emphasized`.
 * - **The low side is the default at the time of the call.** If the defaults
 *   change later, nodes below the threshold keep the old border. Run the
 *   recipe again.
 *
 * ## Don't
 *
 * - Don't loop over the nodes and set a bypass on those that pass.
 * - Don't change the fill color to emphasize: it hides a color mapping.
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

export interface EmphasisOptions {
  /** Border color at or above the threshold. Defaults to vermillion. */
  color?: HexColor
  /** Border width at or above the threshold. Defaults to 8. */
  width?: number
}

const NUMERIC_TYPES = ['double', 'long', 'integer']

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function emphasizeByThreshold(
  apis: Pick<CyWebApiType, 'table' | 'visualStyle'>,
  networkId: IdType,
  column: string,
  threshold: number,
  options: EmphasisOptions = {},
): ApiResult<{ emphasized: number }> {
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

  const baseColor = apis.visualStyle.getDefault(networkId, 'nodeBorderColor')
  if (!baseColor.success) return baseColor
  const baseWidth = apis.visualStyle.getDefault(networkId, 'nodeBorderWidth')
  if (!baseWidth.success) return baseWidth

  const step = (
    vpName: 'nodeBorderColor' | 'nodeBorderWidth',
    below: string | number,
    atOrAbove: string | number,
  ): ApiResult =>
    apis.visualStyle.createContinuousMapping(networkId, vpName, {
      vpType: vpName === 'nodeBorderColor' ? 'color' : 'number',
      attribute: column,
      attributeType: info.type,
      attributeValues: [threshold],
      controlPoints: [{ value: threshold, vpValue: atOrAbove }],
      ltMinVpValue: below,
      gtMaxVpValue: atOrAbove,
    })
  const colored = step(
    'nodeBorderColor',
    baseColor.data.value as string,
    options.color ?? '#d55e00',
  )
  if (!colored.success) return colored
  const widened = step(
    'nodeBorderWidth',
    baseWidth.data.value as number,
    options.width ?? 8,
  )
  if (!widened.success) {
    apis.visualStyle.deleteMapping(networkId, 'nodeBorderColor')
    return widened
  }

  let emphasized = 0
  for (const row of table.data.rows) {
    const value = row[column]
    if (typeof value === 'number' && value >= threshold) emphasized += 1
  }
  return { success: true, data: { emphasized } }
}
