import { ComponentType, CyApp } from '@cytoscape-web/types'

export const HelloApp: CyApp = {
  id: 'hello',
  name: 'Hello Cy World App',
  description: 'Minimal panel example for Cytoscape Web app developers',
  components: [
    {
      id: 'HelloPanel',
      type: ComponentType.Panel,
    },
  ],
}
