import { ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const NetworkWorkflowsApp: CyAppWithLifecycle = {
  id: 'networkWorkflows',
  name: 'Network Workflow Examples',
  description:
    'Network creation, CX2 import, and external integration examples',
  apiVersion: '1.0',
  components: [
    {
      id: 'CreateNetworkMenu',
      type: ComponentType.Menu,
    },
    {
      id: 'CreateNetworkFromCx2Menu',
      type: ComponentType.Menu,
    },
    {
      id: 'JupyterConnectorPanel',
      type: ComponentType.Panel,
    },
  ],
}
