import { ComponentType, CyApp } from '@cytoscape-web/types'
import HelloPanel from './components/HelloPanel'

export const HelloApp: CyApp = {
  id: 'hello',
  name: 'Hello Cy World App',
  url: '',
  componentNames: ['HelloPanel', 'SubPanel'],
  components: [
    {
      id: 'MenuExample',
      type: ComponentType.Menu,
    },
  ],
}
