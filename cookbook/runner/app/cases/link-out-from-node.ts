import { addLinkOut } from '../../../recipes/ui/link-out-from-node'
import type { RecipeCase } from '../../harness'
import { harness } from '../src/harness'
import { twoNodesInView } from '../src/twoNodesInView'

const ITEM = 'role=menuitem[name="Cookbook: look up"]'

const recipeCase: RecipeCase = {
  id: 'ui/link-out-from-node',
  run: async (ctx) => {
    const { apis, check, ui } = ctx
    const ids = await twoNodesInView(ctx, 'TP53', 'MDM2')
    const { networkId } = ids
    // A column of database names. MDM2 gets the column's default, ''.
    check(
      apis.table.createColumn(networkId, 'node', 'symbol', 'string', '').success &&
        apis.table.setValue(networkId, 'node', ids.TP53, 'symbol', 'TP53 / p53')
          .success,
      'a symbol column is written',
    )

    const added = addLinkOut(harness.apis, {
      label: 'Cookbook: look up',
      column: 'symbol',
      url: (value) => `https://cookbook.invalid/gene/${value}`,
    })
    if (!added.success) return check(false, `the item is added: ${added.error.message}`)
    ctx.onCleanup(() => {
      const removed = harness.apis.contextMenu.removeContextMenuItem(
        added.data.itemId,
      )
      if (!removed.success) throw new Error(removed.error.message)
    })

    await ui.rightClickNode(ids.TP53)
    const opened = await ui.clickForPopup(ITEM)
    check(
      opened === 'https://cookbook.invalid/gene/TP53%20%2F%20p53',
      `the node's page opens, its value encoded (${opened})`,
    )
    await ui.waitFor(ITEM, 'hidden')

    await ui.rightClickNode(ids.MDM2)
    const nothing = await ui.clickForPopup(ITEM)
    check(nothing === null, `a node without a value opens nothing (${nothing})`)
    await ui.waitFor(ITEM, 'hidden')
  },
}

export default recipeCase
