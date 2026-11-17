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
]
