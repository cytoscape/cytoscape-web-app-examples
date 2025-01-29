import { ComponentType, CyApp } from '@cytoscape-web/types'

/**
 * Entry point for this app.
 */
export const SimpleMenuApp: CyApp = {
  id: 'simpleMenu',
  name: 'Simple Menu App',
  description: 'Example app to add a menu item under the Apps menu',
  components: [
    {
      id: 'AppMenuItem',
      type: ComponentType.Menu,
    },
  ],
}
