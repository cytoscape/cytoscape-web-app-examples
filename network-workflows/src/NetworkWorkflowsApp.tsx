import { ComponentType, CyApp } from '@cytoscape-web/types'

export const NetworkWorkflowsApp: CyApp = {
  id: 'networkWorkflows',
  name: 'Network Workflow Examples',
  description:
    'Network creation, CX2 import, and external integration examples',
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
