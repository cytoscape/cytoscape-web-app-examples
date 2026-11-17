/**
 * Call site 1 of 4: `mount(context)` and `unmount()`.
 *
 * `context.apis` is this app's own API object. It has every domain, including
 * the owner-bound ones (`resource`, `dialog`, `appData`, `contextMenu`,
 * `nodeGraphics`, `panel`), so every recipe can be called from here.
 *
 * `mount()` must return without waiting for the app's own panel or dialog:
 * the host shows them only after `mount()` has returned.
 */
import type { AppContext, CyAppWithLifecycle, IdType } from 'cyweb/ApiTypes'

import { followCurrentNetwork } from '../recipes/events/follow-current-network'

let stopFollowing: (() => void) | null = null

export const lifecycle: Pick<CyAppWithLifecycle, 'mount' | 'unmount'> = {
  mount(context: AppContext): void {
    const read = (networkId: IdType): boolean => {
      const nodes = context.apis.element.getNodeIds(networkId)
      // false: the data has not arrived yet, so the recipe reads again when
      // it does.
      if (!nodes.success) return false
      console.info(`${networkId} has ${nodes.data.nodeIds.length} nodes`)
      return true
    }

    const following = followCurrentNetwork(context.apis, read)
    if (following.success) stopFollowing = following.data.stop
  },

  unmount(): void {
    stopFollowing?.()
    stopFollowing = null
  },
}
