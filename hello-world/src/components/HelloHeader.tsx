import { Box, Typography } from '@mui/material'

import { version } from 'virtual:cyweb-app-meta'

/**
 * Example 0: MUI components + finding your own code at runtime
 *
 * Demonstrates two basics of plugin development:
 *   1. Using MUI Typography/Box for consistent UI styling — MUI is a shared
 *      singleton provided by the host, so plugins do not bundle their own copy.
 *      Note the ROOT-BARREL import above: `@mui/material/Box` would miss the
 *      share key and bundle MUI into this app instead.
 *   2. Reading `import.meta.url` to discover where this module was served from.
 *
 * On (2), what changed and why it is not a like-for-like swap: this example
 * used to read `__webpack_public_path__`, a global Webpack injected into every
 * remote container that pointed at the container ROOT, so appending
 * 'remoteEntry.js' to it resolved. There is no ESM equivalent.
 * `import.meta.url` is the URL of THIS CHUNK, which in a production build sits
 * under `assets/` — appending to it would produce `…/assets/remoteEntry.js`,
 * a 404. Anything that reconstructs the entry URL by string-appending to a
 * chunk path is guessing, so this shows the chunk URL for what it is and drops
 * the link.
 */

// The URL this module was loaded from. Captured at module evaluation; it does
// not change afterwards.
const moduleUrl = import.meta.url

// `version` comes from virtual:cyweb-app-meta — package.json's version field,
// handed over by the build. This used to be `import packageJson from
// '../../package.json'`, which inlined the ENTIRE file into this chunk to read
// one string: dependency lists, scripts and all.

export const HelloHeader = (): JSX.Element => (
  <Box>
    <Typography variant="h2">Hello Cytoscape!</Typography>
    <Typography variant="caption" color="text.secondary">
      This component was served from <code>{moduleUrl}</code> (v{version})
    </Typography>
  </Box>
)
