/**
 * @recipe Follow the current network, and read it only when it is ready
 * @aliases current network changed, network switched, on network change,
 *   react to network switch, wait for network to load, network not loaded,
 *   APP1 after switching, refresh when the user opens another network
 * @apis workspace.getCurrentNetworkId
 * @related elements/add-nodes-to-network, style/color-nodes-by-numeric-column
 *
 * ## When to use
 *
 * The app shows or computes something about the network on screen and must
 * keep up when the user switches to another one.
 *
 * ## Preconditions
 *
 * - The API is ready. Inside an app it always is. On a plain page, wait for
 *   `await window.CyWebApi.whenReady()` first.
 * - `read` returns `false` when it could not read the network yet, and `true`
 *   when it could. A failed read is how the recipe learns that the data has
 *   not arrived.
 * - `onNone`, if given, clears whatever the app shows about a network.
 *
 * ## Side effects
 *
 * - Adds two listeners on `window`: `network:switched` and `network:loaded`.
 *   `stop()` removes both.
 * - Calls `read` once at the start if a network is current, once for every
 *   switch, and once more when the data of a network it could not read
 *   arrives.
 * - Calls `onNone` at the start if no network is current, and whenever the
 *   last network is closed.
 * - Changes nothing in the host.
 *
 * ## Pitfalls
 *
 * - **Switching is not loading.** After a page reload the workspace holds
 *   only summaries. A network's tables load the first time it becomes
 *   current, and `network:switched` fires before they arrive: a read made
 *   then fails with `APP1`. Read again on `network:loaded`.
 * - **Ignore events for other networks.** `network:loaded` also fires for
 *   networks that are not on screen. The recipe reads again only for the
 *   network it is waiting for.
 * - **Discard what arrives after a switch.** Each switch replaces the network
 *   being waited for, so a late `network:loaded` for the previous one is
 *   ignored. If `read` starts asynchronous work, check on completion that the
 *   network is still current before using the result.
 * - **Unsubscribe.** Call `stop()` in `unmount()`, or in the cleanup of a
 *   React effect. A listener that outlives its app keeps running after the
 *   app is disabled.
 * - **No network is a state too.** When the last network is closed, the
 *   host fires `network:switched` with an empty `networkId`. There is nothing
 *   to read, and what the app shows describes a network that is gone: the
 *   recipe calls `onNone` so that the app can clear it. At the start,
 *   `getCurrentNetworkId` fails when no network is open; that is the same
 *   state, not an error.
 * - Do not use a timer to wait for a load. There is no safe duration.
 *
 * ## Don't
 *
 * - Don't read a network on `network:switched` and assume the read worked.
 * - Don't poll `getCurrentNetworkId`.
 * - Don't wait for the app's own panel or dialog inside `mount()`: the host
 *   shows them only after `mount()` returns.
 *
 * ## Wiring
 *
 * Host-wide: `apis` may come from any call site. In an app, start it in
 * `mount()` and stop it in `unmount()`: see `wiring/from-mount.ts`. In a
 * component, the `useCyWebEvent` hook from `cyweb/EventBus` subscribes and
 * unsubscribes for you: see `wiring/from-panel.tsx`.
 */
import type { ApiResult, CyWebApiType, IdType } from 'cyweb/ApiTypes'

export interface FollowedNetwork {
  /** Removes both listeners. Safe to call more than once. */
  stop: () => void
}

export function followCurrentNetwork(
  apis: Pick<CyWebApiType, 'workspace'>,
  read: (networkId: IdType) => boolean,
  onNone: () => void = () => {},
): ApiResult<FollowedNetwork> {
  // The network whose data had not arrived when `read` was last called.
  let waitingFor: IdType | null = null

  const deliver = (networkId: IdType): void => {
    waitingFor = read(networkId) ? null : networkId
  }

  const onSwitched = (event: WindowEventMap['network:switched']): void => {
    const { networkId } = event.detail
    if (networkId === '') {
      // The last network was closed: nothing is current.
      waitingFor = null
      onNone()
      return
    }
    deliver(networkId)
  }

  const onLoaded = (event: WindowEventMap['network:loaded']): void => {
    if (event.detail.networkId === waitingFor) deliver(event.detail.networkId)
  }

  window.addEventListener('network:switched', onSwitched)
  window.addEventListener('network:loaded', onLoaded)

  // 1. The network that is already on screen, if any.
  const current = apis.workspace.getCurrentNetworkId()
  if (current.success) deliver(current.data.networkId)
  else onNone()

  return {
    success: true,
    data: {
      stop: () => {
        window.removeEventListener('network:switched', onSwitched)
        window.removeEventListener('network:loaded', onLoaded)
      },
    },
  }
}
