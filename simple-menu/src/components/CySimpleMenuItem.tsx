import { CyMenuItem, RootMenu } from '@cytoscape-web/types'
import AppMenuItem from './AppMenuItem'

export const CySimpleMenuItem: CyMenuItem = {
  id: 'simple-app-menu',
  parent: RootMenu.Apps,
  menuItem: <AppMenuItem />,
}
