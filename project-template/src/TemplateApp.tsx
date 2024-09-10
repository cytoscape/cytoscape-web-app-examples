import { ComponentType, CyApp } from '@cytoscape-web/types'

export const TemplateApp: CyApp = {
  id: 'template',
  name: 'App Template',
  components: [
    {
      id: 'TemplatePanel',
      type: ComponentType.Panel,
    },
  ],
}
