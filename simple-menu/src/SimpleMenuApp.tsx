import { ComponentType, CyApp } from '@cytoscape-web/types'

/**
 * Entry point for this app.
 */
export const SimpleMenuApp: CyApp = {
  id: 'simpleMenu',
  name: 'Simple menu app',
  description: 'Example app to add a menu item under the App menu',
  components: [
    {
      id: 'AppMenuItem',
      type: ComponentType.Menu,
    },
  ],
}
