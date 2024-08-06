import { ComponentType, CyApp } from '@cytoscape-web/types'

export const HelloApp: CyApp = {
  id: 'hello',
  name: 'Hello Cy World App',
  url: '',
  components: [
    {
      id: 'MenuExample',
      type: ComponentType.Menu,
    },
    {
      id: 'HelloPanel',
      type: ComponentType.Panel,
    },
  ],
}
