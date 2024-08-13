import { ComponentType, CyApp } from '@cytoscape-web/types'

export const HelloApp: CyApp = {
  id: 'hello',
  name: 'Hello Cy World App',
  description: 'Hello-world example app for Cytoscape Web',
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
