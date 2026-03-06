import { ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const SimplePanelApp: CyAppWithLifecycle = {
  id: 'simplePanel',
  name: 'Simple Panel App',
  description: 'Sample app to add a panel on the right side of the window',
  apiVersion: '1.0',
  components: [
    {
      id: 'SimplePanel',
      type: ComponentType.Panel,
    },
  ],
}
