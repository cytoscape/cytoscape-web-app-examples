import { lazy } from 'react'

import { CyAppWithLifecycle } from 'cyweb/ApiTypes'
import packageJson from '../package.json'

const { version } = packageJson

// Temporary: extend CyAppWithLifecycle with `resources` and make `components`
// optional until api-types package is bumped to include Phase 2 types.
interface CyAppWithResources extends Omit<CyAppWithLifecycle, 'components'> {
  components?: CyAppWithLifecycle['components']
  resources?: Array<{
    slot: 'right-panel' | 'apps-menu'
    id: string
    title?: string
    order?: number
    component: React.ComponentType<any>
    closeOnAction?: boolean
  }>
}

export const TemplateApp: CyAppWithResources = {
  id: 'template',
  name: 'App Template',
  description:
    'Boilerplate app with a minimal panel, a simple menu action, and the ' +
    'recommended Cytoscape Web plugin shape.',
  version,
  apiVersion: '1.0',

  // ── Declarative resource registration (Phase 2) ─────────────────────────
  // Replaces the deprecated `components` array.
  resources: [
    {
      slot: 'right-panel',
      id: 'TemplatePanel',
      title: 'Template',
      component: lazy(() => import('./components/TemplatePanel')),
    },
    {
      slot: 'apps-menu',
      id: 'TemplateMenuItem',
      title: 'Template Action',
      component: lazy(() => import('./components/TemplateMenuItem')),
      closeOnAction: true,
    },
  ],
}
