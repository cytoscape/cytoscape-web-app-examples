/**
 * menuActions — Actions behind this app's Apps-menu entries.
 *
 * An 'apps-menu' entry is plain data: the host draws the row from `label`
 * (and optional `tooltip`, `icon`, `isEnabled`) and calls `onClick(apis)` when
 * the user picks it, then closes the dropdown itself. Your code never renders a
 * menu row and never needs a `handleClose` — there is no component here at all.
 *
 * `apis` is the same per-app API object your panels get from
 * `useAppContext()`: network, element, selection, table, visualStyle, layout,
 * viewport, export, workspace, resource, contextMenu, dialog, appData.
 *
 * Need a form or any other UI behind a menu item? Open a dialog from the
 * action: `apis.dialog.open({ title, render: ({ close }) => <YourForm /> })`.
 * The host owns the dialog frame; you own its body.
 *
 * Replace this with your own menu action.
 */
import type { AppContextApis } from 'cyweb/ApiTypes'

/** Create a small example network from an edge list (simplest API usage). */
export const createExampleNetwork = (apis: AppContextApis): void => {
  const result = apis.network.createNetworkFromEdgeList({
    name: 'Template Network',
    description: 'Created by the App Template menu action.',
    edgeList: [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'A'],
    ],
    addToWorkspace: true,
  })
  if (!result.success) {
    console.error(result.error.message)
  }
}
