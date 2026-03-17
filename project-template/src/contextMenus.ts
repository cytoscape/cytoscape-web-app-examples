/**
 * Context menu items registered during mount().
 *
 * Each function receives the AppContext and registers one context menu item.
 * The host auto-cleans all items when the app is disabled.
 *
 * This file is a good place to add new context menu items for your app.
 * See the hello-world app for more examples.
 */
import type { AppContext } from 'cyweb/ApiTypes'

/**
 * Right-click a node → select all its direct neighbors.
 *
 * Demonstrates:
 *   - Graph Traversal API: element.getConnectedNodes()
 *   - Selection API: selection.additiveSelect()
 *   - Combining two APIs inside a context menu handler
 */
export function registerSelectNeighbors(context: AppContext): void {
  context.apis.contextMenu.addContextMenuItem({
    label: 'Template: Select Neighbors',
    targetTypes: ['node'],
    handler: (ctx) => {
      const neighborsResult = context.apis.element.getConnectedNodes(
        ctx.networkId,
        ctx.id!,
      )
      if (!neighborsResult.success) return

      const { nodeIds } = neighborsResult.data
      if (nodeIds.length === 0) return

      context.apis.selection.additiveSelect(ctx.networkId, nodeIds)
    },
  })
}
