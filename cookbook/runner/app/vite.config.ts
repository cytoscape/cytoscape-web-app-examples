import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

// Vite's cache goes to the repository's node_modules, not into the cookbook.
export default defineCyWebApp(import.meta.url, {
  vite: { cacheDir: '../../../node_modules/.vite/cookbook-verification' },
})
