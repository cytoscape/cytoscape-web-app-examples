import { lazy } from 'react'
import { CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const NetworkWorkflowsApp: CyAppWithLifecycle = {
  id: 'networkWorkflows',
  name: 'Network Workflow Examples',
  description:
    'Network creation, CX2 import, and external integration examples',
  apiVersion: '1.0',
  resources: [
    {
      slot: 'apps-menu',
      id: 'CreateNetworkMenu',
      title: 'Create Example Network',
      component: lazy(() => import('./components/CreateNetworkMenu')),
      closeOnAction: true,
    },
    {
      slot: 'apps-menu',
      id: 'CreateNetworkFromCx2Menu',
      title: 'Create Network from CX2',
      component: lazy(() => import('./components/CreateNetworkFromCx2Menu')),
      closeOnAction: true,
    },
    {
      slot: 'right-panel',
      id: 'JupyterConnectorPanel',
      title: 'Jupyter Link',
      component: lazy(() => import('./components/JupyterConnectorPanel')),
    },
  ],
}
