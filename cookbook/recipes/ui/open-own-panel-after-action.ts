/**
 * @recipe Show your app's panel after an action
 * @aliases open my panel, show results panel, switch to my tab, open the
 *   right panel, reveal the app panel, focus my panel
 * @apis panel.open
 * @related ui/menu-action-with-dialog, ui/persist-results-per-network
 *
 * ## When to use
 *
 * An action finished (a menu item ran, a computation ended) and its results
 * are in the app's own right-panel tab. The user should see that tab without
 * looking for it.
 *
 * ## Preconditions
 *
 * - `apis` is the app's own object.
 * - The app registered a `'right-panel'` resource with the id `tabId`, and
 *   the tab is shown: a panel with `requires: { network: true }` has no tab
 *   while no network is open.
 *
 * ## Side effects
 *
 * - Opens the right pane if it is closed, and selects the app's tab, as a
 *   click on the tab does. Nothing else changes; no undo entry is recorded.
 * - On failure, nothing changes: an unknown tab does not open the pane.
 *
 * ## Pitfalls
 *
 * - **Pass your tab's id.** Without one, `panel.open('right')` opens the pane
 *   on whatever tab was selected. On 1.1.0 the first tab is the host's Sub
 *   Network Viewer, which is empty for most networks. On 1.1.1 that tab
 *   exists only for a hierarchy, and the pane shows only while it has a tab.
 * - **Tab ids are not unique across apps.** Two apps may both call their tab
 *   `results`. The app's own `apis.panel` selects the app's own tab, and says
 *   so in `appId`. `window.CyWebApi.panel` cannot know who is asking, and
 *   selects the first tab with that id in the strip: another app's.
 * - **`APP7` (`RESOURCE_NOT_FOUND`)** means the tab is not shown: it was never
 *   registered, it requires a network and none is open, or the app is not
 *   active.
 * - **Results first, then the panel.** Put the results where the panel reads
 *   them (see `ui/persist-results-per-network`) before opening it.
 *
 * ## Don't
 *
 * - Don't call `panel.open` from `mount()`: the user turned the app on, and
 *   did not ask for its panel.
 * - Don't select a tab by its position in the strip: other apps add tabs.
 *
 * ## Wiring
 *
 * Owner-bound: `apis` must be the app's own object: the `onClick` parameter
 * of an `'apps-menu'` entry (`wiring/from-apps-menu.ts`), `context.apis` in
 * `mount()`, or `useAppContext()?.apis` in a component
 * (`wiring/from-panel.tsx`).
 */
import type { ApiResult, AppContextApis, OpenPanelResult } from 'cyweb/ApiTypes'

export function openOwnPanel(
  apis: Pick<AppContextApis, 'panel'>,
  tabId: string,
): ApiResult<OpenPanelResult> {
  return apis.panel.open('right', tabId)
}
