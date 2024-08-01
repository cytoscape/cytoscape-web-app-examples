import { CyApp } from '@cytoscape-web/types'
import HelloPanel from './components/HelloPanel'

export const HelloApp: CyApp = {
  id: 'hello-cy-web',
  name: 'Hello Cy World App',
  url: '',
  componentNames: ['HelloPanel', 'SubPanel']
}
