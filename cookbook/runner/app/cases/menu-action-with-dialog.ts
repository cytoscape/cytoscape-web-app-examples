import type { RecipeCase } from '../../harness'
import { harness } from '../src/harness'

const MENU_ITEM = 'role=menuitem[name="Select nodes by name…"]'

/**
 * The recipe runs from the app's Apps menu entry (src/index.ts), as a user
 * reaches it. The case does what the user does, and reads the selection back.
 */
const recipeCase: RecipeCase = {
  id: 'ui/menu-action-with-dialog',
  run: async (ctx) => {
    const { apis, check, ui } = ctx
    const appId = window.__cookbookApp?.id
    const dialog = `[data-testid="app-dialog-${appId}-select-by-name"]`
    const field = `${dialog} >> role=textbox`
    ctx.onCleanup(() => {
      // Idempotent when it is not open.
      harness.apis.dialog.close('select-by-name')
    })

    const networkId = ctx.createFixture([
      ['alpha', 'beta'],
      ['Alphabet', 'gamma'],
    ])
    const ids = ctx.nodeIdsByName(networkId)
    const selected = (): string => {
      const read = apis.selection.getSelection(networkId)
      return read.success ? [...read.data.selectedNodes].sort().join() : '?'
    }
    check(
      apis.selection.exclusiveSelect(networkId, [ids.gamma], []).success,
      'gamma is selected',
    )

    const openDialog = async (): Promise<void> => {
      await ui.click('text="Apps"')
      await ui.click(MENU_ITEM)
      await ui.waitFor(dialog, 'visible')
    }

    // Cancel changes nothing.
    await openDialog()
    await ui.fill(field, 'alph')
    await ui.click(`${dialog} >> role=button[name="Cancel"]`)
    await ui.waitFor(dialog, 'hidden')
    check(selected() === ids.gamma, `Cancel leaves the selection (${selected()})`)

    // No match: the dialog stays, says so, and changes nothing.
    await openDialog()
    await ui.fill(field, 'zeta')
    await ui.click(`${dialog} >> role=button[name="Select"]`)
    await ui.waitFor(`${dialog} >> role=alert`, 'visible')
    check(await ui.visible(dialog), 'the dialog stays open')
    check(selected() === ids.gamma, 'no match changes nothing')

    // A match, in any case, submitted with Enter: selected, and closed.
    await ui.fill(field, 'ALPH')
    await ui.press('Enter')
    await ui.waitFor(dialog, 'hidden')
    check(
      selected() === [ids.alpha, ids.Alphabet].sort().join(),
      `alpha and Alphabet are selected (${selected()})`,
    )

    // Escape closes it too.
    await openDialog()
    await ui.press('Escape')
    await ui.waitFor(dialog, 'hidden')
  },
}

export default recipeCase
