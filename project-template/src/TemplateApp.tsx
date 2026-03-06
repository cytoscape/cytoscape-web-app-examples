import { ComponentType, CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const TemplateApp: CyAppWithLifecycle = {
  id: 'template',
  name: 'App Template',
  apiVersion: '1.0',
  components: [
    {
      id: 'TemplatePanel',
      type: ComponentType.Panel,
    },
  ],
}
