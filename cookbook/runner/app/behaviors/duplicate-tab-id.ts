/**
 * Two apps, one tab id (cookbook-design.md §4.4). The rival app's tab comes
 * first in the strip. The anonymous `window.CyWebApi.panel` selects it; the
 * app's own object selects the app's tab. This is why `panel` is owner-bound.
 */
import type { RecipeCase } from '../../harness'
import { harness } from '../src/harness'
import { MAIN_TAB, RIVAL_APP_ID, SHARED_TAB } from '../src/tabs'

const OWN = '[data-testid="cookbook-results-panel"]'
const RIVAL = '[data-testid="cookbook-rival-panel"]'

const behaviorCase: RecipeCase = {
  id: 'behavior/duplicate-tab-id',
  run: async (ctx) => {
    const { check, ui } = ctx
    ctx.onCleanup(() => {
      ctx.apis.panel.open('right', MAIN_TAB)
    })

    const anonymous = ctx.apis.panel.open('right', SHARED_TAB)
    check(
      anonymous.success && anonymous.data.appId === RIVAL_APP_ID,
      `window.CyWebApi selects the first tab with the id: the rival's ` +
        `(${anonymous.success ? anonymous.data.appId : anonymous.error.code})`,
    )
    await ui.waitFor(RIVAL, 'visible')

    const own = harness.apis.panel.open('right', SHARED_TAB)
    check(
      own.success && own.data.appId === window.__cookbookApp?.id,
      `the app's own object selects the app's tab ` +
        `(${own.success ? own.data.appId : own.error.code})`,
    )
    await ui.waitFor(OWN, 'visible')
    check(!(await ui.visible(RIVAL)), "the rival's tab is no longer shown")
  },
}

export default behaviorCase
