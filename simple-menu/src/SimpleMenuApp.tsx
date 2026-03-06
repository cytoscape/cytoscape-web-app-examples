import { ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'

/**
 * Entry point for this app.
 */
export const SimpleMenuApp: CyAppWithLifecycle = {
  id: 'simpleMenu',
  name: 'Simple Menu App',
  description: 'Example app to add a menu item under the Apps menu',
  apiVersion: '1.0',
  components: [
    {
      id: 'AppMenuItem',
      type: ComponentType.Menu,
    },
  ],
}
