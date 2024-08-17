import { ComponentType, CyApp } from '@cytoscape-web/types'

export const SimplePanelApp: CyApp = {
  id: 'simplePanel',
  name: 'Simple Panel App',
  components: [
    {
      id: 'SimplePanel',
      type: ComponentType.Panel,
    },
  ],
}
