/**
 * The cookbook's verification app (cookbook-design.md §4.6).
 *
 * It registers its resources and hands its own API object to its cases, and
 * does nothing else: `mount()` runs no case and waits for no UI. The runner
 * installs it with `?installApp=`, waits until its panel shows, and then runs
 * the cases this app publishes on `window.__cookbookApp`.
 */
import type { CyAppWithLifecycle } from 'cyweb/ApiTypes'
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

import { openSelectByNameDialog } from '../../../recipes/ui/menu-action-with-dialog'
import type { RecipeCase } from '../../harness'
import { harness } from './harness'
import { ResultsPanel, VerificationPanel } from './Panels'
import { MAIN_TAB, SHARED_TAB } from './tabs'

const cases = Object.values(
  import.meta.glob<RecipeCase>(['../cases/*.ts', '../behaviors/*.ts'], {
    eager: true,
    import: 'default',
  }),
)

const app: CyAppWithLifecycle = {
  id,
  name: displayName,
  description,
  version,
  apiVersion: '1.0',
  resources: [
    {
      slot: 'right-panel',
      id: MAIN_TAB,
      title: 'Cookbook',
      component: VerificationPanel,
    },
    {
      // The rival app's tab has the same id, and comes first (order 0).
      slot: 'right-panel',
      id: SHARED_TAB,
      title: 'Results',
      order: 10,
      component: ResultsPanel,
    },
    {
      slot: 'apps-menu',
      id: 'select-by-name',
      label: 'Select nodes by name…',
      requires: { network: true },
      onClick: (apis) => {
        openSelectByNameDialog(apis)
      },
    },
  ],

  mount(context) {
    harness.apis = context.apis
    window.__cookbookApp = { id, cases }
  },
}

export default app
