/**
 * Call site 2 of 4: the `onClick` of an `'apps-menu'` entry.
 *
 * The host passes this app's own API object to `onClick`. Like
 * `context.apis`, it has every domain, including the owner-bound ones.
 *
 * A menu entry is plain data: it has no component. An action that needs a
 * form or a progress display opens it with `apis.dialog.open(...)`.
 */
import type { ResourceDeclaration } from 'cyweb/ApiTypes'

import { addNodesToNetwork } from '../recipes/elements/add-nodes-to-network'
import { colorNodesByNumericColumn } from '../recipes/style/color-nodes-by-numeric-column'
import { openSelectByNameDialog } from '../recipes/ui/menu-action-with-dialog'
import { openOwnPanel } from '../recipes/ui/open-own-panel-after-action'
import { computeOncePerNetwork } from '../recipes/ui/persist-results-per-network'

export const menuEntries: ResourceDeclaration[] = [
  {
    slot: 'apps-menu',
    id: 'AddChain',
    label: 'Add a chain of three nodes',
    requires: { network: true },
    onClick: (apis) => {
      const current = apis.workspace.getCurrentNetworkId()
      if (!current.success) return

      const added = addNodesToNetwork(
        apis,
        current.data.networkId,
        [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        [
          [0, 1],
          [1, 2],
        ],
      )
      if (!added.success) console.error(added.error.message)
    },
  },
  {
    slot: 'apps-menu',
    id: 'ColorByScore',
    label: 'Color nodes by score',
    requires: { network: true },
    onClick: (apis) => {
      const current = apis.workspace.getCurrentNetworkId()
      if (!current.success) return

      const colored = colorNodesByNumericColumn(
        apis,
        current.data.networkId,
        'score',
      )
      if (!colored.success) console.error(colored.error.message)
    },
  },
  {
    // An action that needs input opens a dialog, and returns.
    slot: 'apps-menu',
    id: 'SelectByName',
    label: 'Select nodes by name…',
    requires: { network: true },
    onClick: (apis) => {
      const opened = openSelectByNameDialog(apis)
      if (!opened.success) console.error(opened.error.message)
    },
  },
  {
    // A result kept per network, then shown in this app's own tab: a
    // 'right-panel' resource with the id 'Summary', which reads the stored
    // result for the current network.
    slot: 'apps-menu',
    id: 'Summarize',
    label: 'Summarize the network',
    requires: { network: true },
    onClick: (apis) => {
      const current = apis.workspace.getCurrentNetworkId()
      if (!current.success) return
      const { networkId } = current.data

      const summary = computeOncePerNetwork(apis, networkId, 'summary', () => {
        const nodes = apis.element.getNodeIds(networkId)
        const edges = apis.element.getEdgeIds(networkId)
        if (!nodes.success) return nodes
        if (!edges.success) return edges
        return {
          success: true,
          data: {
            nodes: nodes.data.nodeIds.length,
            edges: edges.data.edgeIds.length,
          },
        }
      })
      if (!summary.success) {
        console.error(summary.error.message)
        return
      }
      const shown = openOwnPanel(apis, 'Summary')
      if (!shown.success) console.error(shown.error.message)
    },
  },
]
