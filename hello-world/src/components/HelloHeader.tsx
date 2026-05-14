import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import packageJson from '../../package.json'

/**
 * Example 0: MUI components + Module Federation public path
 *
 * Demonstrates two basics of plugin development:
 *   1. Using MUI Typography/Box for consistent UI styling — MUI is a shared
 *      singleton provided by the host, so plugins do not bundle their own copy.
 *   2. Reading __webpack_public_path__ to discover the plugin's own serving URL
 *      at runtime. Webpack injects this global for every Module Federation
 *      remote container; it reflects the base URL of remoteEntry.js
 *      (e.g. http://localhost:2222/ in dev, https://cdn.example.com/ in prod).
 */

// __webpack_public_path__ is a Webpack-injected global — declare it for TypeScript.
declare const __webpack_public_path__: string

// Capture at module load time; the value does not change after initialization.
const moduleServerUrl = __webpack_public_path__

// Version number of this app extracted from package.json at
// build time — also injected by Webpack's DefinePlugin.
// This is just an example of how to share the version number with the UI.
const { version } = packageJson

export const HelloHeader = (): JSX.Element => (
  <Box>
    <Typography variant="h2">Hello Cytoscape!</Typography>
    <Typography variant="caption" color="text.secondary">
      This app is served from:{' '}
      <a
        href={`${moduleServerUrl}remoteEntry.js`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {moduleServerUrl}
      </a>{' '}
      (v{version})
    </Typography>
  </Box>
)
