import { lazy } from 'react'

import { ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'
import packageJson from '../package.json'

const { version } = packageJson

export const TemplateApp: CyAppWithLifecycle = {
  id: 'template',
  name: 'App Template',
  description:
    'Boilerplate app with a minimal panel, a simple menu action, and the ' +
    'recommended Cytoscape Web plugin shape.',
  version,
  apiVersion: '1.0',
  components: [
    {
      id: 'TemplatePanel',
      type: ComponentType.Panel,
      component: lazy(() => import('./components/TemplatePanel')),
    },
    {
      id: 'TemplateMenuItem',
      type: ComponentType.Menu,
      component: lazy(() => import('./components/TemplateMenuItem')),
    },
  ],
}
