import { ComponentType, CyApp } from '@cytoscape-web/types'

export const CreateNetworkApp: CyApp = {
  id: 'createNetwork',
  name: 'Create Network App',
  url: '',
  components: [
    {
      id: 'SimplePanel',
      type: ComponentType.Panel,
    },
  ],
}
