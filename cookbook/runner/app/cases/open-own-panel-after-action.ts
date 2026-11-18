import { openOwnPanel } from '../../../recipes/ui/open-own-panel-after-action'
import type { RecipeCase } from '../../harness'
import { harness } from '../src/harness'
import { MAIN_TAB, SHARED_TAB } from '../src/tabs'

const OWN = '[data-testid="cookbook-results-panel"]'
const RIVAL = '[data-testid="cookbook-rival-panel"]'

const recipeCase: RecipeCase = {
  id: 'ui/open-own-panel-after-action',
  run: async (ctx) => {
    const { check, ui } = ctx
    ctx.onCleanup(() => {
      ctx.apis.panel.open('right', MAIN_TAB)
    })

    // The rival app's tab has the same id and comes first in the strip
    // (runner/app/rival). The app's own object still selects the app's tab.
    const opened = openOwnPanel(harness.apis, SHARED_TAB)
    if (!opened.success) {
      return check(false, `the tab opens: ${opened.error.message}`)
    }
    check(
      opened.data.appId === window.__cookbookApp?.id,
      `the app's own tab is selected (appId ${opened.data.appId})`,
    )
    check(
      opened.data.panel === 'right' && opened.data.tabId === SHARED_TAB,
      'the right pane, on the tab asked for',
    )
    await ui.waitFor(OWN, 'visible')
    check(!(await ui.visible(RIVAL)), "the rival's tab is not the one shown")

    // An unknown tab is refused, and changes nothing.
    const unknown = openOwnPanel(harness.apis, 'no-such-tab')
    check(
      !unknown.success && unknown.error.code === 'APP7',
      'an unknown tab is APP7',
    )
    check(await ui.visible(OWN), 'the selected tab did not change')
  },
}

export default recipeCase
