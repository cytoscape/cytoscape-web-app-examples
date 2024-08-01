import {
  CyMenuItem,
  RootMenu,
  AppComponent,
  ComponentType,
} from '@cytoscape-web/types'
import AppMenuItem from './AppMenuItem'

const menuTitle: string = 'Example app menu 1'

export const CySimpleMenuItem: CyMenuItem & AppComponent = {
  id: 'simple-app-menu',
  title: menuTitle,
  type: ComponentType.Menu,
  parent: RootMenu.Apps,
  component: <AppMenuItem title={menuTitle} />,
}
