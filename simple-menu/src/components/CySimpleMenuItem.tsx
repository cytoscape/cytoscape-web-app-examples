import { CyMenuItem, RootMenu } from '@cytoscape-web/types'
import SimpleMenu from './AppMenuItem'

export const CySimpleMenuItem: CyMenuItem = {
  id: 'simple-menu1',
  parent: RootMenu.Edit,
  menuItem: <SimpleMenu />,
}
