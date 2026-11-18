/**
 * Turning the app off removes what it registered through its own API object
 * (cookbook-design.md §4.4), and nothing registered without an app. The
 * runner runs this case last: the app stays off.
 */
import type { RecipeCase } from '../../harness'
import { harness } from '../src/harness'
import { MAIN_TAB, RIVAL_APP_ID, SHARED_TAB } from '../src/tabs'
import { twoNodesInView } from '../src/twoNodesInView'

const APP_ITEM = 'role=menuitem[name="Cookbook: app item"]'
const ANONYMOUS_ITEM = 'role=menuitem[name="Cookbook: anonymous item"]'
const MENU_ENTRY = 'role=menuitem[name="Select nodes by name…"]'

const behaviorCase: RecipeCase = {
  id: 'behavior/disable',
  run: async (ctx) => {
    const { apis, check, ui } = ctx
    const appId = window.__cookbookApp?.id
    if (appId === undefined) return check(false, 'the app has mounted')
    const ids = await twoNodesInView(ctx, 'a', 'b')

    // Through the app's own object.
    check(
      harness.apis.contextMenu.addContextMenuItem({
        label: 'Cookbook: app item',
        targetTypes: ['node'],
        handler: () => undefined,
      }).success,
      "a context menu item, through the app's object",
    )
    check(
      harness.apis.resource.registerLayout({
        id: 'cookbook-disable',
        displayName: 'Cookbook disable check',
        run: () => ({}),
      }).success,
      'a layout',
    )
    check(
      harness.apis.appData.set(ids.networkId, 'kept', { n: 1 }).success,
      'a result in appData',
    )
    // And without an app, as the control.
    const anonymous = apis.contextMenu.addContextMenuItem({
      label: 'Cookbook: anonymous item',
      targetTypes: ['node'],
      handler: () => undefined,
    })
    if (!anonymous.success) return check(false, 'an anonymous item')
    ctx.onCleanup(() => {
      const removed = apis.contextMenu.removeContextMenuItem(anonymous.data.itemId)
      if (!removed.success) throw new Error(removed.error.message)
    })

    const hasLayout = (): boolean => {
      const listed = apis.layout.getAvailableLayouts()
      return listed.success && listed.data.layouts.some((l) => l.appId === appId)
    }
    check(hasLayout(), 'before: the layout is listed')
    check(apis.panel.open('right', MAIN_TAB).success, "before: the app's tab is shown")
    await ui.rightClickNode(ids.a)
    await ui.waitFor(APP_ITEM, 'visible')
    check(await ui.visible(ANONYMOUS_ITEM), 'before: both items are in the menu')
    await ui.press('Escape')
    await ui.waitFor(APP_ITEM, 'hidden')

    await ui.setAppEnabled(appId, false)

    await ctx.waitFor(() => !hasLayout(), 'after: the layout is gone')
    const tab = apis.panel.open('right', MAIN_TAB)
    check(
      !tab.success && tab.error.code === 'APP7',
      "after: the app's tab is gone",
    )
    const shared = apis.panel.open('right', SHARED_TAB)
    check(
      shared.success && shared.data.appId === RIVAL_APP_ID,
      "after: only the rival's tab of the shared id is left",
    )
    await ui.rightClickNode(ids.a)
    await ui.waitFor(ANONYMOUS_ITEM, 'visible')
    check(!(await ui.visible(APP_ITEM)), "after: the app's item is gone")
    await ui.press('Escape')
    await ui.waitFor(ANONYMOUS_ITEM, 'hidden')

    await ui.click('text="Apps"')
    await ui.waitFor('text="Manage Apps..."', 'visible')
    check(!(await ui.visible(MENU_ENTRY)), "after: the app's menu entry is gone")
    await ui.press('Escape')

    const kept = harness.apis.appData.get(ids.networkId, 'kept')
    check(
      kept.success && (kept.data.value as { n?: unknown }).n === 1,
      'after: appData is kept',
    )
  },
}

export default behaviorCase
