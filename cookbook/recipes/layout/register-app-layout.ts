/**
 * @recipe Add a layout of your own to the Layout menu
 * @aliases custom layout, register a layout, layout algorithm, my own layout,
 *   grid layout, lay out the selected nodes, arrange selected nodes, layout
 *   plugin
 * @apis resource.registerLayout
 * @related layout/run-layout-and-wait, selection/select-neighbors,
 *   selection/select-by-attribute
 *
 * ## When to use
 *
 * The user wants an arrangement the host does not offer, picked from the
 * Layout menu like a built-in one or run from code. This one puts the
 * selected nodes in a grid and leaves every other node where it is, which no
 * built-in layout can do: `layout.applyLayout` lays out the whole network.
 *
 * ## Preconditions
 *
 * - `apis` is the app's own object, normally `context.apis` in `mount()`.
 *   Registering is synchronous: register before anything `mount()` awaits.
 * - `id` is unique among this app's layouts.
 *
 * ## Side effects
 *
 * - Adds `displayName` to the Layout menu and to Layout ▸ Settings..., where
 *   the user can change `Spacing` and `Selected only`. Registering the same
 *   `id` again replaces the layout and resets both to their defaults.
 * - The host removes the layout when the app is disabled. The app removes it
 *   itself with `apis.resource.unregisterLayout(id)`.
 * - A run changes no position until `run` returns. Through
 *   `layout.applyLayout`, the host then moves every node in the result at
 *   once and records **one** undo entry, as for a built-in layout.
 *
 * ## Pitfalls
 *
 * - **The algorithm's name is qualified.** To run it from code, pass
 *   `<appId>::<id>` as `algorithmName` to `layout.applyLayout`.
 *   `layout.getAvailableLayouts()` lists it with its `appId`.
 * - **`run` sees snapshots,** taken when the run starts: positions, the
 *   selection and the parameter values. `context.networkId` is the network
 *   being laid out, which need not be the current one: read nothing else.
 * - **Return only the nodes you move.** A node missing from the result keeps
 *   its position. Ids that are not nodes of the network, and positions that
 *   are not two finite numbers, are ignored.
 * - **A throw or a rejection aborts the run**: no node moves, and no undo
 *   entry is recorded. The recipe's `run` does not throw.
 * - **A parameter's key is its `displayName`,** and its value is typed by its
 *   declaration: a `checkBox` gives a boolean, a `text` with
 *   `validationType: 'number'` a number. Read it with a fallback anyway.
 * - **An empty selection** lays out every node: "Selected only" with nothing
 *   selected would otherwise do nothing, and look broken.
 * - Mutation topics: the host applies the result in one step, so a batch is
 *   already what happens; a failed run leaves everything as it was; the undo
 *   unit is the run.
 *
 * ## Don't
 *
 * - Don't move nodes with `viewport.updateNodePositions` from a menu item to
 *   imitate a layout: it is not in the Layout menu, has no settings, and
 *   records no undo entry.
 * - Don't register it in a panel component's effect. Register it in
 *   `mount()`, which runs once each time the app is turned on.
 * - Don't keep state between runs in `run`'s closure: the same layout may run
 *   on several networks.
 *
 * ## Wiring
 *
 * Owner-bound: `apis` must be the app's own object: `context.apis` in
 * `mount()` (`wiring/from-mount.ts`), or the `onClick` parameter of an
 * `'apps-menu'` entry (`wiring/from-apps-menu.ts`). `window.CyWebApi` has no
 * `resource` domain.
 */
import type {
  AppContextApis,
  ApiResult,
  LayoutPositions,
  LayoutRunContext,
} from 'cyweb/ApiTypes'

export interface GridLayoutOptions {
  /** Slot-local id. The algorithm's name is `<appId>::<id>`. */
  id: string
  /** The Layout menu's text. */
  displayName: string
  /** Distance between neighboring nodes, until the user changes it. */
  spacing?: number
}

const SPACING = 'Spacing'
const SELECTED_ONLY = 'Selected only'

/** The selected nodes (all of them when none is) in a grid. */
const gridOfSelection = (
  context: LayoutRunContext,
  defaultSpacing: number,
): LayoutPositions => {
  const spacingValue = context.parameters[SPACING]
  const spacing =
    typeof spacingValue === 'number' && spacingValue > 0
      ? spacingValue
      : defaultSpacing
  const selectedOnly = context.parameters[SELECTED_ONLY] !== false
  const ids =
    selectedOnly && context.selectedNodeIds.length > 0
      ? context.selectedNodeIds
      : context.nodes.map((node) => node.id)

  // The grid starts where the top-left of these nodes is now. A loop, not
  // Math.min(...xs): a network-sized spread throws.
  let left = Infinity
  let top = Infinity
  for (const id of ids) {
    const position = context.positions[id]
    if (position === undefined) continue
    left = Math.min(left, position[0])
    top = Math.min(top, position[1])
  }
  if (!Number.isFinite(left) || !Number.isFinite(top)) {
    left = 0
    top = 0
  }

  const columns = Math.max(1, Math.ceil(Math.sqrt(ids.length)))
  return Object.fromEntries(
    ids.map((id, index) => [
      id,
      [
        left + (index % columns) * spacing,
        top + Math.floor(index / columns) * spacing,
      ],
    ]),
  )
}

export function registerGridLayout(
  apis: Pick<AppContextApis, 'resource'>,
  options: GridLayoutOptions,
): ApiResult<{ resourceId: string }> {
  const spacing = options.spacing ?? 80
  return apis.resource.registerLayout({
    id: options.id,
    displayName: options.displayName,
    description: 'Puts the selected nodes in a grid. Other nodes stay put.',
    type: 'geometric',
    parameters: [
      {
        displayName: SPACING,
        description: 'Distance between neighboring nodes',
        type: 'text',
        validationType: 'number',
        defaultValue: spacing,
      },
      {
        displayName: SELECTED_ONLY,
        description: 'Lay out only the selected nodes, if any are selected',
        type: 'checkBox',
        defaultValue: true,
      },
    ],
    run: (context) => gridOfSelection(context, spacing),
  })
}
