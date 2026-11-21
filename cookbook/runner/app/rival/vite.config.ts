import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url, {
  vite: { cacheDir: '../../../../node_modules/.vite/cookbook-rival' },
})
