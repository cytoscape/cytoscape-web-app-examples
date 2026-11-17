/**
 * @recipe Run a layout and wait for it to finish
 * @aliases apply layout, run layout, arrange nodes, layout network, wait for
 *   layout, force-directed layout, grid layout, re-layout, after layout
 * @apis layout.getAvailableLayouts, workspace.getCurrentNetworkId,
 *   layout.applyLayout
 * @related network/create-network-from-table,
 *   network/subnetwork-from-selection, events/follow-current-network
 *
 * ## When to use
 *
 * An app lays out a network and does something once the nodes have moved:
 * after building a network, after adding nodes, or as one step of an
 * analysis.
 *
 * ## Preconditions
 *
 * - The network's data is loaded; see `events/follow-current-network`.
 * - `algorithmName`, if given, is one of `getAvailableLayouts()`'s
 *   `algorithmName`s. An app's own algorithm is named `<appId>::<id>`.
 *
 * ## Side effects
 *
 * - Moves the network's nodes, and records **one** undo entry.
 * - Fires `layout:started`, then `layout:completed` on success only.
 * - Fits the network's view when it is the current one, unless
 *   `fit: false`.
 *
 * ## Pitfalls
 *
 * - **Await the promise, not the event.** `applyLayout` resolves once the
 *   nodes have moved, after `layout:completed`. It never rejects: a failure
 *   resolves to `success: false`, and no `layout:completed` follows it. Code
 *   that waits for the event waits forever on a failure.
 * - **Ignore events for other networks.** If you do listen to `layout:*`,
 *   compare `networkId`: another app, or the user, can lay out another
 *   network at the same time.
 * - **Discard what arrives after a switch.** The user can switch networks
 *   while a layout runs. `stillCurrent` says whether the network is still on
 *   screen; if not, do not move the user's view to it.
 * - **No network at all.** If the user closes the last network meanwhile,
 *   `stillCurrent` is false too.
 * - **The fit is the laid-out network's own.** On 1.1.0 and 1.1.1,
 *   `applyLayout` fits the canvas of `networkId` itself; a network with no
 *   canvas is laid out and not fitted, and the host logs a warning. The
 *   recipe asks for a fit only when the network is current, so that laying
 *   out a network in the background never moves a view.
 * - **Unsubscribe.** This recipe listens to nothing; if you add a listener,
 *   remove it when done.
 *
 * ## Don't
 *
 * - Don't wait with a timer: layouts take from milliseconds to minutes.
 * - Don't write positions yourself to "lay out" a network the host can lay
 *   out.
 * - Don't guess algorithm names: read them from `getAvailableLayouts`.
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

export interface LayoutOptions {
  /** Defaults to the host's preferred layout. */
  algorithmName?: string
  /** Fit the view afterwards. Defaults to true when the network is current. */
  fit?: boolean
}

const failure = (code: string, message: string): ApiFailure => ({
  success: false,
  error: { code, severity: 'error', message },
})

export async function runLayoutAndWait(
  apis: Pick<CyWebApiType, 'layout' | 'workspace'>,
  networkId: IdType,
  options: LayoutOptions = {},
): Promise<ApiResult<{ stillCurrent: boolean }>> {
  const { algorithmName } = options
  if (algorithmName !== undefined) {
    const available = apis.layout.getAvailableLayouts()
    if (!available.success) return available
    const names = available.data.layouts.map((l) => l.algorithmName)
    if (!names.includes(algorithmName)) {
      return failure(
        'RECIPE_UNKNOWN_LAYOUT',
        `no layout named ${algorithmName}; available: ${names.join(', ')}`,
      )
    }
  }

  const isCurrent = (): boolean => {
    const current = apis.workspace.getCurrentNetworkId()
    return current.success && current.data.networkId === networkId
  }

  const laidOut = await apis.layout.applyLayout(networkId, {
    algorithmName,
    fitAfterLayout: options.fit ?? isCurrent(),
  })
  if (!laidOut.success) return laidOut
  return { success: true, data: { stillCurrent: isCurrent() } }
}
