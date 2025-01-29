import { ComponentType, CyApp } from '@cytoscape-web/types'

export const PatternsApp: CyApp = {
  id: 'app-patterns',
  name: 'App Implementation Patterns',
  components: [
    {
      id: 'Panel',
      type: ComponentType.Panel,
    },
  ],
}
