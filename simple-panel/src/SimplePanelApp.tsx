import { ComponentType, CyApp } from '@cytoscape-web/types'

export const SimplePanelApp: CyApp = {
  id: 'simplePanel',
  name: 'Simple Panel App',
  description: 'Sample app to add a panel on the right side of the window',
  components: [
    {
      id: 'SimplePanel',
      type: ComponentType.Panel,
    },
  ],
}
