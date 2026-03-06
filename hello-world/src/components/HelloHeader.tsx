import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Webpack injects the public path of this remote container at runtime.
// In MF, __webpack_public_path__ is the base URL from which remoteEntry.js was loaded
// (e.g. http://localhost:2222/ in dev, https://cdn.example.com/hello/ in prod).
declare const __webpack_public_path__: string
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
