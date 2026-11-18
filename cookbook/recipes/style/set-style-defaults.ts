/**
 * @recipe Set the style's defaults
 * @aliases make every node red, change node color, change node shape, set
 *   default color, default size, background color, change the look of all
 *   nodes, style all edges
 * @apis visualStyle.setDefaults, visualStyle.getVisualProperties,
 *   visualStyle.getBypasses
 * @related style/highlight-with-bypass, style/color-by-category,
 *   style/size-nodes-by-degree
 *
 * ## When to use
 *
 * The user asks to change how all nodes or edges look, "make every node
 * red", "use round nodes", "thicker edges": that is a default, not a value
 * per element.
 *
 * ## Preconditions
 *
 * - `defaults` names properties of the network's style, with values of their
 *   type: a `#rrggbb` color, a number, or one of the property's names
 *   (`'ellipse'`).
 *
 * ## Side effects
 *
 * - Sets each default on the network's active style, all or none.
 * - Records **no** undo entry.
 * - Returns which of the properties a mapping or bypasses still override,
 *   so the caller can tell the user why some elements did not change.
 *
 * ## Pitfalls
 *
 * - **Precedence: bypass, then mapping, then default.** After "make every
 *   node red", nodes with a bypass stay as they were: `bypassed` counts them.
 * - **A mapping hides the default from every element, not only those it
 *   lists.** Where a mapping has no value for an element (a discrete mapping
 *   without its key, a missing number), the host uses the mapping's own
 *   fallback, copied from the default when the mapping was created. Setting
 *   the default later does not change it, on 1.1.0 or 1.1.1. So with a
 *   mapping on the fill, no node turns red: `shadowedByMapping` lists such
 *   properties. Delete the mapping, or make it again after the default.
 * - **Use the batch call.** `setDefaults` checks every property and value
 *   first and applies all or none. A bad value cannot leave a half-changed
 *   style.
 * - **No undo.** To let the user go back, read the old defaults first
 *   (`getDefault`) and keep them.
 * - Property names are camelCase strings such as `'nodeBackgroundColor'`,
 *   checked by the type of `defaults`.
 *
 * ## Don't
 *
 * - **Don't set a bypass on every node** to change them all. It hides every
 *   later mapping and default on those nodes, it is saved with the network,
 *   and nodes added later do not get it. Set the default.
 * - Don't delete the user's mapping to make a default show without asking.
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
  VisualPropertyName,
} from 'cyweb/ApiTypes'

/** Property names to values, as `setDefaults` takes them. */
export type StyleDefaults = Parameters<
  CyWebApiType['visualStyle']['setDefaults']
>[1]

export interface DefaultsSet {
  /** Properties whose default a mapping overrides. */
  shadowedByMapping: VisualPropertyName[]
  /** Elements whose bypass overrides the default, per property. */
  bypassed: Partial<Record<VisualPropertyName, number>>
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function setStyleDefaults(
  apis: Pick<CyWebApiType, 'visualStyle'>,
  networkId: IdType,
  defaults: StyleDefaults,
): ApiResult<DefaultsSet> {
  const names = Object.keys(defaults) as VisualPropertyName[]
  if (names.length === 0) {
    return failure('RECIPE_NO_DEFAULTS', 'defaults is empty')
  }

  const set = apis.visualStyle.setDefaults(networkId, defaults)
  if (!set.success) return set

  const properties = apis.visualStyle.getVisualProperties(networkId)
  if (!properties.success) return properties
  const mapped = new Set(
    properties.data.properties.filter((p) => p.hasMapping).map((p) => p.name),
  )

  const result: DefaultsSet = { shadowedByMapping: [], bypassed: {} }
  for (const name of names) {
    if (mapped.has(name)) result.shadowedByMapping.push(name)
    const bypasses = apis.visualStyle.getBypasses(networkId, name)
    if (!bypasses.success) return bypasses
    const count = Object.keys(bypasses.data.bypasses).length
    if (count > 0) result.bypassed[name] = count
  }
  return { success: true, data: result }
}
