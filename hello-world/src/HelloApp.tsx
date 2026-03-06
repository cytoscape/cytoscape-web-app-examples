import { ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const HelloApp: CyAppWithLifecycle = {
  id: 'hello',
  name: 'Hello Cy World App',
  description: 'Minimal panel example for Cytoscape Web app developers',
  apiVersion: '1.0',
  components: [
    {
      id: 'HelloPanel',
      type: ComponentType.Panel,
    },
  ],
}
