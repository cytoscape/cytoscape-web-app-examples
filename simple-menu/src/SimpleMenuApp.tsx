import { CyApp } from '@cytoscape-web/types'

/**
 * Entry point for this app.
 */
export const SimpleMenuApp: CyApp = {
  id: 'simpleMenu',
  name: 'Simple menu app',
  description: 'Example app to add a menu item under the App menu',
  url: '', // Will be injected by the build script
  componentNames: ['AppMenuItem'],
}
