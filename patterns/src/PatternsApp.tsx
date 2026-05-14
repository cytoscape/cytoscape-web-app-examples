import { ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const PatternsApp: CyAppWithLifecycle = {
  id: 'app-patterns',
  name: 'App Implementation Patterns',
  apiVersion: '1.0',
  components: [
    {
      id: 'Panel',
      type: ComponentType.Panel,
    },
  ],
}
