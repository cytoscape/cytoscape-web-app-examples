/**
 * @recipe Open a node's page in an external database from its context menu
 * @aliases link out, linkout, external link, open in NCBI, open in UniProt,
 *   look up a gene, right-click menu, node context menu, open a web page for
 *   a node
 * @apis contextMenu.addContextMenuItem, table.getValue
 * @related ui/menu-action-with-dialog, data/read-column-values-safely
 *
 * ## When to use
 *
 * The user right-clicks a node and wants to look it up elsewhere: "open this
 * gene in NCBI", "show its UniProt entry". Cytoscape's "External Links".
 *
 * ## Preconditions
 *
 * - `apis` is the app's own object; register in `mount()`.
 * - The node table has a column whose value names the node in the database:
 *   a gene symbol, an accession. Its name is an argument.
 *
 * ## Side effects
 *
 * - Adds one item to the context menu of every node, in every network.
 *   Choosing it opens the page in a new browser tab. Nothing in the network
 *   changes, and no undo entry is recorded.
 * - The host removes the item when the app is disabled. The app removes it
 *   itself with `apis.contextMenu.removeContextMenuItem(itemId)`.
 *
 * ## Pitfalls
 *
 * - **Open the tab in the handler, before anything is awaited.** A browser
 *   opens a new tab only while it is handling the user's click. An `await`
 *   before `window.open` (a fetch, a timer) gets the tab blocked as a popup.
 *   `table.getValue` is synchronous, so the recipe reads and opens at once.
 * - **Read from the network the handler names.** The handler gets the
 *   clicked node's `id` and `networkId`; use those, not the current network.
 * - **A node without a value opens nothing**: an empty text, a missing value,
 *   a list. A column the network lacks opens nothing either. Check the column
 *   first if the user should be told; see `data/read-column-values-safely`.
 * - **Encode the value.** A symbol may contain `/`, `#` or a space. `url`
 *   receives the value already passed through `encodeURIComponent`.
 * - **The item is on nodes only.** `targetTypes` defaults to nodes and edges;
 *   the recipe passes `['node']`.
 * - **Through `window.CyWebApi` the item stays.** An item registered without
 *   an app has no owner, so disabling the app leaves it in every node's menu,
 *   where clicking it still runs the app's code.
 *
 * ## Don't
 *
 * - Don't build the address from the node's label: the label comes from a
 *   style mapping, and may show another column, or text the style shortened.
 * - Don't open the tab without `noopener`: the database page would get a
 *   handle on the Cytoscape Web window.
 * - Don't add one item per node: one item reads the clicked node's value.
 *
 * ## Wiring
 *
 * Owner-bound: `apis` must be the app's own object: `context.apis` in
 * `mount()` (`wiring/from-mount.ts`).
 */
import type { ApiResult, AppContextApis } from 'cyweb/ApiTypes'

export interface LinkOut {
  /** The context menu's text: "Open in NCBI Gene". */
  label: string
  /** The node column whose value names the node in the database. */
  column: string
  /** The page for one value, given already URL-encoded. */
  url: (encodedValue: string) => string
}

export function addLinkOut(
  apis: Pick<AppContextApis, 'contextMenu' | 'table'>,
  link: LinkOut,
): ApiResult<{ itemId: string }> {
  // Copied now: the handler runs later, and the caller's object may change.
  const { column, url } = link
  return apis.contextMenu.addContextMenuItem({
    label: link.label,
    targetTypes: ['node'],
    handler: (target) => {
      if (target.id === undefined) return
      const read = apis.table.getValue(
        target.networkId,
        'node',
        target.id,
        column,
      )
      if (!read.success) return
      const value = read.data.value
      if (typeof value !== 'string' && typeof value !== 'number') return
      const text = String(value).trim()
      if (text === '') return
      window.open(url(encodeURIComponent(text)), '_blank', 'noopener,noreferrer')
    },
  })
}
