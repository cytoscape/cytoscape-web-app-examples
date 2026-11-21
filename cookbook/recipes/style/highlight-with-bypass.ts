/**
 * @recipe Highlight some nodes, and remove the highlight later
 * @aliases highlight nodes, mark nodes, emphasize these nodes, flag nodes,
 *   outline nodes, temporary highlight, bypass, override style for some
 *   nodes
 * @apis visualStyle.getBypasses, visualStyle.setBypasses,
 *   visualStyle.setBypass, visualStyle.deleteBypass
 * @related style/emphasize-by-threshold, style/set-style-defaults,
 *   selection/select-by-attribute
 *
 * ## When to use
 *
 * An app marks particular nodes for the user to see, such as the hits of a
 * search or the result of an analysis, and takes the mark away again.
 *
 * ## Preconditions
 *
 * - `nodeIds` name nodes of `networkId`.
 *
 * ## Side effects
 *
 * - Sets a border color and width bypass on those nodes. Their fill, label
 *   and any mapping stay as they are.
 * - Returns `clear()`, which puts back exactly the bypasses those nodes had
 *   before: none, or the earlier values. A second call does nothing.
 * - Records **no** undo entry. Edit ▸ Undo does not remove a highlight; only
 *   `clear()` does.
 * - Bypasses are part of the network's style: they are saved with the
 *   workspace and exported with the network until cleared.
 *
 * ## Pitfalls
 *
 * - **A bypass wins over a mapping and over the default**, for the elements
 *   it names. That is why it suits a highlight, and why it must be removed.
 * - **Use the batch call.** `setBypasses` checks every property and every id
 *   first, and sets all or none. Nothing is left half-highlighted.
 * - **Remember what was there.** `deleteBypass` removes a bypass the user set
 *   too. `clear()` restores earlier values instead of deleting them.
 * - **Highlight the border, not the fill.** A fill bypass hides the colors
 *   of a category or numeric mapping on exactly the nodes the user is asked
 *   to look at.
 *
 * ## Don't
 *
 * - Don't use a bypass to color every node: set a default
 *   (`style/set-style-defaults`) or a mapping.
 * - Don't select nodes to highlight them: the selection belongs to the user,
 *   and changes with the next click.
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

export interface HighlightOptions {
  /** Border color. Defaults to orange. */
  color?: HexColor
  /** Border width. Defaults to 6. */
  width?: number
}

export interface Highlight {
  /** Put back the bypasses these nodes had before. */
  clear: () => ApiResult
}

const PROPERTIES = ['nodeBorderColor', 'nodeBorderWidth'] as const

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export function highlightWithBypass(
  apis: Pick<CyWebApiType, 'visualStyle'>,
  networkId: IdType,
  nodeIds: IdType[],
  options: HighlightOptions = {},
): ApiResult<Highlight> {
  if (nodeIds.length === 0) {
    return failure('RECIPE_NO_NODES', 'nodeIds is empty')
  }
  // A private copy: the caller may reuse its array.
  const ids = [...nodeIds]

  // What these nodes have now, to restore it.
  const before = new Map<string, Record<IdType, unknown>>()
  for (const vpName of PROPERTIES) {
    const read = apis.visualStyle.getBypasses(networkId, vpName)
    if (!read.success) return read
    before.set(vpName, read.data.bypasses)
  }

  const set = apis.visualStyle.setBypasses(networkId, ids, {
    nodeBorderColor: options.color ?? '#e69f00',
    nodeBorderWidth: options.width ?? 6,
  })
  if (!set.success) return set

  // What each property still has to put back. Emptied once restored, so a
  // second clear() never touches a bypass set after the first.
  const pending = new Map<string, IdType[]>(PROPERTIES.map((vp) => [vp, ids]))
  const clear = (): ApiResult => {
    for (const vpName of PROPERTIES) {
      const targets = pending.get(vpName) ?? []
      const earlier = before.get(vpName) ?? {}
      const unset = targets.filter((id) => !(id in earlier))
      if (unset.length > 0) {
        const removed = apis.visualStyle.deleteBypass(networkId, vpName, unset)
        if (!removed.success) return removed
      }
      for (const id of targets.filter((id) => id in earlier)) {
        const restored = apis.visualStyle.setBypass(
          networkId,
          vpName,
          [id],
          earlier[id] as string | number,
        )
        if (!restored.success) return restored
      }
      pending.set(vpName, [])
    }
    return { success: true, data: undefined }
  }
  return { success: true, data: { clear } }
}
