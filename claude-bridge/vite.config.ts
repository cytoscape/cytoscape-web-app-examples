import { defineCyWebApp } from '@cytoscape-web/app-runtime/vite'

export default defineCyWebApp(import.meta.url)

// Identity (id, display name, port) lives in the `cyweb` block in package.json.
// See project-template/vite.config.ts for what defineCyWebApp sets up and why.
//
// claude-bridge/mcp-server/ is a separate Node package with its own tsconfig and
// plain tsc build. It is not federated and not covered by this config.
