import { ComponentType, CyApp } from '@cytoscape-web/types'

export const SimplePanelApp: CyApp = {
  id: 'simplePanel',
  name: 'Simple Panel App',
  description: 'Sample app to add a panel to Cytoscape Web',
  components: [
    {
      id: 'SimplePanel',
      type: ComponentType.Panel,
    },
  ],
}
