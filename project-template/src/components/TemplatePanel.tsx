/**
 * TemplatePanel — Minimal right-panel component.
 *
 * Demonstrates:
 *   - Reading workspace info via useWorkspaceApi()
 *   - ApiResult<T> pattern (check .success before .data)
 *   - MUI components (shared singletons from host)
 *
 * Replace this with your own panel UI.
 */
// Root-barrel import, NOT '@mui/material/Box'. The share key is the exact
// string '@mui/material', and the federation plugin matches share keys
// exactly — a subpath import misses it and bundles MUI into this remote
// instead of taking the host's instance, giving you a second Emotion cache.
import { Box, Typography } from '@mui/material'

import { useWorkspaceApi } from 'cyweb/WorkspaceApi'

const TemplatePanel = (): JSX.Element => {
  const workspaceApi = useWorkspaceApi()
  const result = workspaceApi.getWorkspaceInfo()
  const workspaceName =
    result.success && result.data.name !== ''
      ? result.data.name
      : 'Untitled Workspace'

  return (
    <Box
      // The production smoke test asserts this app rendered inside the real
      // host, and this is what it looks for — see `smokeObservable` in
      // ../../apps.manifest.json. Keep the two in step.
      data-testid="template-panel"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 3,
      }}
    >
      <Typography variant="h5">App Template</Typography>
      <Typography color="text.secondary">
        Start building your panel here.
      </Typography>
      <Box>
        <Typography variant="overline" color="text.secondary">
          Workspace
        </Typography>
        <Typography variant="body1">{workspaceName}</Typography>
      </Box>
    </Box>
  )
}

export default TemplatePanel
