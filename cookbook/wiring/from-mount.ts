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
import { registerGridLayout } from '../recipes/layout/register-app-layout'
import { addLinkOut } from '../recipes/ui/link-out-from-node'

let stopFollowing: (() => void) | null = null

export const lifecycle: Pick<CyAppWithLifecycle, 'mount' | 'unmount'> = {
  mount(context: AppContext): void {
    // Owner-bound registrations: made for this app, so the host removes them
    // when the app is disabled. Registering is synchronous; nothing here
    // waits for anything.
    const layout = registerGridLayout(context.apis, {
      id: 'grid',
      displayName: 'Grid (selected nodes)',
    })
    if (!layout.success) console.error(layout.error.message)
    const linkOut = addLinkOut(context.apis, {
      label: 'Open in NCBI Gene',
      column: 'name',
      url: (term) => `https://www.ncbi.nlm.nih.gov/gene/?term=${term}`,
    })
    if (!linkOut.success) console.error(linkOut.error.message)

    const read = (networkId: IdType): boolean => {
      const nodes = context.apis.element.getNodeIds(networkId)
      // false: the data has not arrived yet, so the recipe reads again when
      // it does.
      if (!nodes.success) return false
      console.info(`${networkId} has ${nodes.data.nodeIds.length} nodes`)
      return true
    }

    const following = followCurrentNetwork(context.apis, read, () => {
      console.info('no network is open')
    })
    if (following.success) stopFollowing = following.data.stop
  },

  // The host removes the layout and the context menu item itself. Only what
  // the host does not know about is undone here.
  unmount(): void {
    stopFollowing?.()
    stopFollowing = null
  },
}
