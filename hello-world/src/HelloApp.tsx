import { ComponentType, CyApp } from '@cytoscape-web/types'

export const HelloApp: CyApp = {
  id: 'hello',
  name: 'Hello Cy World App',
  description: 'Hello-world example app for Cytoscape Web',
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
      id: 'HelloPanel',
      type: ComponentType.Panel,
    },
    {
      id: 'JupyterConnectorPanel',
      type: ComponentType.Panel,
    },
  ],
}
