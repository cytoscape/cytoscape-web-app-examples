import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

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

export const HelloHeader = (): JSX.Element => (
  <Box>
    <Typography variant="h5">Hello Cytoscape!</Typography>
    <Typography variant="caption" color="text.secondary">
      This app is served from:{' '}
      <a
        href={`${moduleServerUrl}remoteEntry.js`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {moduleServerUrl}
      </a>
    </Typography>
  </Box>
)
