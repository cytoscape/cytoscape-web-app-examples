/**
 * The rival app: one right-panel tab whose id the verification app also uses
 * (`SHARED_TAB`). Its `order` puts it first in the strip, so a `panel.open`
 * that does not prefer the caller's own tab selects this one.
 */
import type { CyAppWithLifecycle } from 'cyweb/ApiTypes'
import { description, displayName, id, version } from 'virtual:cyweb-app-meta'

import { SHARED_TAB } from '../../src/tabs'
import { RivalPanel } from './RivalPanel'

const app: CyAppWithLifecycle = {
  id,
  name: displayName,
  description,
  version,
  apiVersion: '1.0',
  resources: [
    {
      slot: 'right-panel',
      id: SHARED_TAB,
      title: 'Rival results',
      order: 0,
      component: RivalPanel,
    },
  ],
}

export default app
